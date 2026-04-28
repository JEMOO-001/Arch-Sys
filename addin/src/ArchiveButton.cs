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

namespace ArcLayoutSentinel
{
    public class ArchiveButton : Button
    {
        private ArchiveMetadataDialog _currentDialog = null;

        protected override void OnUpdate()
        {
            bool isLoggedIn = ArcGIS.Desktop.Framework.FrameworkApplication.State.Contains("sentinel_logged_in_state");
            if (!isLoggedIn)
            {
                this.Enabled = false;
                this.Caption = "Archive";
                this.Tooltip = "Login required to archive layouts";
            }
            else
            {
                this.Enabled = true;
                this.Caption = "Archive";
                this.Tooltip = "Archive current layout to Sentinel";
            }
        }

        protected override async void OnClick()
        {
            try
            {
                Logger.Info("ArchiveButton.OnClick started");

                var layoutInfo = await QueuedTask.Run(() =>
                {
                    try
                    {
                        var project = Project.Current;
                        var activeLayout = LayoutView.Active?.Layout;
                        var layoutNames = new List<string>();
                        if (project != null)
                        {
                            var layoutItems = project.GetItems<LayoutProjectItem>();
                            if (layoutItems != null)
                            {
                                layoutNames = layoutItems.Select(l => l.Name).ToList();
                            }
                        }
                        return new
                        {
                            HasActiveLayout = activeLayout != null,
                            LayoutNames = layoutNames,
                            ActiveLayoutName = activeLayout?.Name ?? "",
                            ProjectUri = project?.URI ?? ""
                        };
                    }
                    catch (Exception ex)
                    {
                        Logger.Error(ex, "Error getting layout info");
                        return new { HasActiveLayout = false, LayoutNames = new List<string>(), ActiveLayoutName = "", ProjectUri = "" };
                    }
                });

                if (!layoutInfo.HasActiveLayout)
                {
                    Logger.Warn("Archive attempt failed: No active layout view found.");
                    ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                        "No active layout view found. Please open a layout before archiving.",
                        "Sentinel Error");
                    return;
                }

                Logger.Info("Creating ArchiveMetadataDialog");
                _currentDialog = new ArchiveMetadataDialog(layoutInfo.LayoutNames ?? new List<string>(), layoutInfo.ActiveLayoutName ?? "");
                
                Logger.Info("Showing dialog");
                
                try 
                { 
                    _currentDialog.Owner = FrameworkApplication.Current.MainWindow; 
                } 
                catch (Exception ex) 
                { 
                    Logger.Warn("Could not set owner: {Error}", ex.Message); 
                }

                _currentDialog.ShowDialog();
                
                var result = _currentDialog?.DialogResult;
                Logger.Info($"Dialog Result: {result}");
                
                if (result == null || result != true)
                {
                    Logger.Info("User cancelled");
                    _currentDialog = null;
                    return;
                }

                Logger.Info("Proceeding with archive...");

                var preFlightResult = _currentDialog?.GetPreFlightResult();
                if (preFlightResult == null || !preFlightResult.AllPassed)
                {
                    ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                        "Pre-flight checks did not pass. Cannot proceed with archiving.\n\n" +
                        (preFlightResult?.GetSummary() ?? "No pre-flight result available."),
                        "Pre-Flight Failed", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                string layoutName = _currentDialog?.SelectedLayout ?? "";
                string categoryPrefix = _currentDialog?.CategoryPrefix ?? "";
                string category = _currentDialog?.Category ?? "";
                string exportFormat = _currentDialog?.ExportFormat ?? "PDF";
                string projectUri = layoutInfo?.ProjectUri ?? "";
                // Extract project name from .aprx file path (e.g., "C:\...\Test\Test.aprx" -> "Test")
                string projectName = string.IsNullOrEmpty(projectUri) ? "" : 
                    System.IO.Path.GetFileNameWithoutExtension(projectUri);

                Logger.Info("Archiving Layout: {LayoutName}, Prefix: {Prefix}, Project: {Project}", layoutName, categoryPrefix, projectName);

                await ExecuteArchiveAsync(layoutName, categoryPrefix, projectName, category, exportFormat, projectUri);

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

        private async Task ExecuteArchiveAsync(string layoutName, string categoryPrefix, string projectName, 
            string category, string exportFormat, string projectUri)
        {
            string exportedFilePath = null;
            string uniqueId = null;

            try
            {
                var (generatedId, idError) = await ApiService.GetGenerateIdAsync(categoryPrefix);
                if (string.IsNullOrEmpty(generatedId))
                {
                    Logger.Error("Failed to generate unique ID: {Error}", idError);
                    ShowError($"Failed to generate unique ID from the server.\n\n{idError}");
                    return;
                }
                uniqueId = generatedId;
                Logger.Info("Generated Unique ID: {UniqueID}", uniqueId);

                string archiveRoot = ConfigManager.ArchiveRoot;
                string destinationFolder = ArchivalService.GenerateDestinationFolder(archiveRoot, category);
                string ext = exportFormat.ToLowerInvariant() == "jpeg" ? "jpeg" : "pdf";

                string fileName = ArchivalService.GenerateFileName(uniqueId, projectName, ext);
                exportedFilePath = System.IO.Path.Combine(destinationFolder, fileName);

                System.IO.Directory.CreateDirectory(destinationFolder);

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
                if (!string.IsNullOrEmpty(exportedFilePath) && System.IO.File.Exists(exportedFilePath))
                {
                    try { System.IO.File.Delete(exportedFilePath); }
                    catch { }
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