using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ArcGIS.Desktop.Framework;
using ArcGIS.Desktop.Framework.Contracts;
using ArcGIS.Desktop.Framework.Threading.Tasks;
using ArcGIS.Desktop.Mapping;
using ArcGIS.Desktop.Layouts;
using ArcGIS.Desktop.Core;
using ArcLayoutSentinel.Services;
using ArcLayoutSentinel.Dialogs;
using System.Windows;

namespace ArcLayoutSentinel.Ribbon
{
    /// <summary>
    /// Archive Button - Triggers map archival with Pre-Flight checks.
    /// Constitution: "Pre-Flight First" - Always verify API and UNC connectivity before writes.
    /// Constitution: "Zero-SDK UI" - Dialog data collected on UI thread, SDK calls on QueuedTask.
    /// </summary>
    public class ArchiveButton : Button
    {
        private ArchiveMetadataDialog _currentDialog = null;

        protected override async void OnClick()
        {
            // Global try-catch for UX stability
            try
            {
                Logger.Info("ArchiveButton.OnClick started");

                // Removed EnsureAuthenticated() check as button is now condition-controlled in DAML.

                // Check for active layout - MUST be on QueuedTask
                var layoutInfo = await QueuedTask.Run(() =>
                {
                    var project = Project.Current;
                    var activeLayout = LayoutView.Active?.Layout;
                    return new
                    {
                        HasActiveLayout = activeLayout != null,
                        LayoutNames = project?.GetItems<LayoutProjectItem>()?.Select(l => l.Name).ToList() ?? new List<string>(),
                        ActiveLayoutName = activeLayout?.Name,
                        ProjectUri = project?.URI ?? string.Empty
                    };
                });

                if (!layoutInfo.HasActiveLayout)
                {
                    Logger.Warn("Archive attempt failed: No active layout view found.");
                    ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                        "No active layout view found. Please open a layout before archiving.",
                        "Sentinel Error");
                    return;
                }

                Logger.Debug("Creating Zero-SDK ArchiveMetadataDialog");

                // Create and show Zero-SDK dialog on UI thread
                _currentDialog = new ArchiveMetadataDialog(layoutInfo.LayoutNames, layoutInfo.ActiveLayoutName);
                try { _currentDialog.Owner = FrameworkApplication.Current.MainWindow; } catch { /* fallback */ }
                _currentDialog.Closed += Dialog_Closed;

                // Show dialog MODAL on UI thread
                bool? result = _currentDialog.ShowDialog();
                Logger.Debug("ArchiveMetadataDialog returned: {Result}", result);

                if (result != true)
                {
                    return; // User cancelled
                }

                // Get Pre-Flight result from dialog
                var preFlightResult = _currentDialog.GetPreFlightResult();
                if (preFlightResult == null || !preFlightResult.AllPassed)
                {
                    Logger.Warn("Pre-flight checks did not pass. Cannot proceed with archiving.");
                    ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                        "Pre-flight checks did not pass. Cannot proceed with archiving.\n\n" +
                        (preFlightResult?.GetSummary() ?? "No pre-flight result available."),
                        "Pre-Flight Failed", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                // Capture dialog values BEFORE background execution
                string layoutName = _currentDialog.SelectedLayout;
                string categoryPrefix = _currentDialog.CategoryPrefix;
                string category = _currentDialog.Category;
                string exportFormat = _currentDialog.ExportFormat;
                string projectUri = layoutInfo.ProjectUri;
                // Extract project name from .aprx file path
                string projectName = string.IsNullOrEmpty(projectUri) ? "" : 
                    System.IO.Path.GetFileNameWithoutExtension(projectUri);

                Logger.Info("Archiving Layout: {LayoutName}, Prefix: {Prefix}, Project: {Project}", layoutName, categoryPrefix, projectName);

                // Execute archival workflow on background thread
                await ExecuteArchiveAsync(layoutName, categoryPrefix, projectName, 
                    category, exportFormat, projectUri);

                Logger.Info("ArchiveButton.OnClick completed successfully");
            }
            catch (Exception ex)
            {
                Logger.Error(ex, "ArchiveButton.OnClick FATAL ERROR");
                ReportError("Archive Error", ex);
            }
            finally
            {
                _currentDialog = null;
            }
        }

        /// <summary>
        /// Reports errors with full details for debugging.
        /// Constitution: Robust error reporting prevents silent failures.
        /// </summary>
        private void ReportError(string title, Exception ex)
        {
            ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                $"{title}:\n{ex.Message}\n\n{ex.StackTrace}",
                "Sentinel Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }

        private void Dialog_Closed(object sender, EventArgs e)
        {
            _currentDialog = null;
        }

        /// <summary>
        /// Executes the archival workflow with Atomic Rollback support.
        /// Constitution: "Atomic Archival" - DB record + File move must succeed or fail together.
        /// </summary>
        private async Task ExecuteArchiveAsync(string layoutName, string categoryPrefix, string projectName, 
            string category, string exportFormat, string projectUri)
        {
            string exportedFilePath = null;
            string uniqueId = null;

            try
            {
                // Step 1: Generate Unique ID from API
                var (generatedId, idError) = await ApiService.GetGenerateIdAsync(categoryPrefix);
                if (string.IsNullOrEmpty(generatedId))
                {
                    Logger.Error("Failed to generate unique ID: {Error}", idError);
                    ShowError($"Failed to generate unique ID from the server.\n\n{idError}");
                    return;
                }
                uniqueId = generatedId;
                Logger.Info("Generated Unique ID: {UniqueID}", uniqueId);

                // Step 2: Build Paths
                string archiveRoot = ConfigManager.ArchiveRoot;
                string destinationFolder = ArchivalService.GenerateDestinationFolder(archiveRoot, category);
                string ext = exportFormat.ToLowerInvariant() == "jpeg" ? "jpeg" : "pdf";

                string fileName = ArchivalService.GenerateFileName(
                    uniqueId, projectName, ext);
                exportedFilePath = System.IO.Path.Combine(destinationFolder, fileName);

                // Ensure directory exists
                System.IO.Directory.CreateDirectory(destinationFolder);

                // Step 3: Export File on QueuedTask (ArcGIS SDK calls)
                Logger.Debug("Starting layout export to {FilePath}", exportedFilePath);
                var (exported, exportError) = await QueuedTask.Run(async () =>
                {
                    return await ExportService.ExportLayoutAsync(layoutName, exportedFilePath, exportFormat);
                });

                if (!exported)
                {
                    Logger.Error("Failed to export layout: {Error}", exportError);
                    ShowError($"Failed to export layout.\n\n{exportError}");
                    return;
                }

                Logger.Info("Layout successfully exported to {FilePath}", exportedFilePath);

                // Step 4: Register Metadata in DB (Atomic: file exists, now register)
                var mapMetadata = new
                {
                    unique_id = uniqueId,
                    layout_name = layoutName,
                    project_path = projectUri,
                    project_name = projectName,
                    category = category,
                    status = "In Progress",
                    file_path = exportedFilePath,
                    category_prefix = categoryPrefix
                };

                Logger.Debug("Registering metadata in backend for {UniqueID}", uniqueId);
                var (success, error) = await ApiService.ArchiveMapAsync(mapMetadata);

                if (!success)
                {
                    // ATOMIC ROLLBACK: Delete exported file if registration failed
                    try
                    {
                        if (System.IO.File.Exists(exportedFilePath))
                        {
                            System.IO.File.Delete(exportedFilePath);
                            Logger.Warn("ATOMIC ROLLBACK: Deleted {FilePath} because API registration failed.", exportedFilePath);
                        }
                    }
                    catch (Exception rollbackEx)
                    {
                        Logger.Error(rollbackEx, "Rollback warning: Could not delete file during rollback");
                    }

                    Logger.Error("API archive registration failed: {Error}", error);
                    ShowError($"API archive registration failed. The file was deleted to maintain system integrity.\n\nError: {error}");
                    return;
                }

                // Success!
                Logger.Info("Archival workflow completed successfully for {UniqueID}", uniqueId);
                Application.Current.Dispatcher.Invoke(() =>
                {
                    ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                        $"Archive completed successfully!\n\nID: {uniqueId}\nFile: {exportedFilePath}",
                        "Sentinel Success", MessageBoxButton.OK, MessageBoxImage.Information);
                });
            }
            catch (Exception ex)
            {
                // ATOMIC ROLLBACK on any exception
                if (!string.IsNullOrEmpty(exportedFilePath) && System.IO.File.Exists(exportedFilePath))
                {
                    try
                    {
                        System.IO.File.Delete(exportedFilePath);
                        Logger.Warn("Exception rollback - deleted {FilePath}", exportedFilePath);
                    }
                    catch { /* best effort */ }
                }

                Logger.Error(ex, "ExecuteArchiveAsync FATAL ERROR");
                ShowError($"Archival failed: {ex.Message}");
            }
        }

        private void ShowError(string message)
        {
            Application.Current.Dispatcher.Invoke(() =>
            {
                ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(message, "Sentinel Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            });
        }
    }
}
