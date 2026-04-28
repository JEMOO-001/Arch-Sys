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

                var selectionDialog = new ArchiveSelectionDialog();
                try { selectionDialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }
                selectionDialog.ShowDialog();

                if (selectionDialog.Result == ArchiveSelectionDialog.SelectionResult.CreateNew)
                {
                    await HandleCreateNewAsync(layoutInfo);
                }
                else if (selectionDialog.Result == ArchiveSelectionDialog.SelectionResult.EditExisting)
                {
                    await HandleEditExistingAsync(layoutInfo);
                }

                Logger.Info("ArchiveButton.OnClick completed");
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

        private async Task HandleCreateNewAsync(dynamic layoutInfo)
        {
            _currentDialog = new ArchiveMetadataDialog(layoutInfo.LayoutNames ?? new List<string>(), layoutInfo.ActiveLayoutName ?? "");
            try { _currentDialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }

            _currentDialog.ShowDialog();

            if (_currentDialog?.DialogResult != true) return;

            var preFlightResult = _currentDialog?.GetPreFlightResult();
            if (preFlightResult == null || !preFlightResult.AllPassed)
            {
                ShowPreFlightError(preFlightResult);
                return;
            }

            string layoutName = _currentDialog?.SelectedLayout ?? "";
            string categoryPrefix = _currentDialog?.CategoryPrefix ?? "";
            string category = _currentDialog?.Category ?? "";
            string exportFormat = _currentDialog?.ExportFormat ?? "PDF";
            string projectUri = layoutInfo?.ProjectUri ?? "";
            string projectName = string.IsNullOrEmpty(projectUri) ? "" : System.IO.Path.GetFileNameWithoutExtension(projectUri);

            await ExecuteCreateNewAsync(layoutName, categoryPrefix, projectName, category, exportFormat, projectUri);
        }

        private async Task HandleEditExistingAsync(dynamic layoutInfo)
        {
            var mapSelectionDialog = new MapSelectionDialog();
            try { mapSelectionDialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }
            mapSelectionDialog.ShowDialog();

            if (mapSelectionDialog.SelectedMap == null) return;

            var existingMap = mapSelectionDialog.SelectedMap;
            Logger.Info("Selected map for edit: {UniqueID}", existingMap.UniqueId);

            _currentDialog = new ArchiveMetadataDialog(layoutInfo.LayoutNames ?? new List<string>(), layoutInfo.ActiveLayoutName ?? "", existingMap);
            try { _currentDialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }

            _currentDialog.ShowDialog();

            if (_currentDialog?.DialogResult != true) return;

            var preFlightResult = _currentDialog?.GetPreFlightResult();
            if (preFlightResult == null || !preFlightResult.AllPassed)
            {
                ShowPreFlightError(preFlightResult);
                return;
            }

            int mapId = existingMap.MapId;
            string layoutName = _currentDialog?.SelectedLayout ?? "";
            string categoryPrefix = _currentDialog?.CategoryPrefix ?? "";
            string category = _currentDialog?.Category ?? "";
            string exportFormat = _currentDialog?.ExportFormat ?? "PDF";
            string projectUri = layoutInfo?.ProjectUri ?? "";
            string projectName = string.IsNullOrEmpty(projectUri) ? "" : System.IO.Path.GetFileNameWithoutExtension(projectUri);
            string toWhom = _currentDialog?.ToWhom ?? "";
            string status = _currentDialog?.Status ?? "Not Started";
            string comment = _currentDialog?.Comment ?? "";

            await ExecuteEditExistingAsync(mapId, layoutName, categoryPrefix, projectName, category,
                exportFormat, projectUri, toWhom, status, comment, existingMap.FilePath, existingMap.UniqueId);
        }

        private async Task ExecuteCreateNewAsync(string layoutName, string categoryPrefix, string projectName,
            string category, string exportFormat, string projectUri)
        {
            string exportedFilePath = null;
            string uniqueId = null;

            try
            {
                var (generatedId, idError) = await ApiService.GetGenerateIdAsync(categoryPrefix);
                if (string.IsNullOrEmpty(generatedId))
                {
                    ShowError($"Failed to generate unique ID from the server.\n\n{idError}");
                    return;
                }
                uniqueId = generatedId;

                string archiveRoot = ConfigManager.ArchiveRoot;
                string destinationFolder = ArchivalService.GenerateDestinationFolder(archiveRoot, category);
                string ext = exportFormat.ToLowerInvariant() == "jpeg" ? "jpeg" : "pdf";

                string fileName = ArchivalService.GenerateFileName(uniqueId, projectName, ext);
                exportedFilePath = System.IO.Path.Combine(destinationFolder, fileName);
                System.IO.Directory.CreateDirectory(destinationFolder);

                var (exported, exportError) = await QueuedTask.Run(async () =>
                {
                    return await ExportService.ExportLayoutAsync(layoutName, exportedFilePath, exportFormat);
                });

                if (!exported)
                {
                    ShowError($"Failed to export layout.\n\n{exportError}");
                    return;
                }

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

                var (success, error) = await ApiService.ArchiveMapAsync(mapMetadata);
                if (!success)
                {
                    TryDeleteFile(exportedFilePath);
                    ShowError($"API archive registration failed.\n\nError: {error}");
                    return;
                }

                ShowSuccess($"Archive completed successfully!\n\nID: {uniqueId}\nFile: {exportedFilePath}");
            }
            catch (Exception ex)
            {
                TryDeleteFile(exportedFilePath);
                Logger.Error(ex, "ExecuteCreateNewAsync FATAL ERROR");
                ShowError($"Archival failed: {ex.Message}");
            }
        }

        private async Task ExecuteEditExistingAsync(int mapId, string layoutName, string categoryPrefix, string projectName,
            string category, string exportFormat, string projectUri, string toWhom, string status, string comment,
            string existingFilePath, string uniqueId)
        {
            string newExportedFilePath = null;

            try
            {
                string archiveRoot = ConfigManager.ArchiveRoot;
                string destinationFolder = ArchivalService.GenerateDestinationFolder(archiveRoot, category);
                string ext = exportFormat.ToLowerInvariant() == "jpeg" ? "jpeg" : "pdf";

                string fileName = ArchivalService.GenerateFileName(uniqueId, projectName, ext);
                newExportedFilePath = System.IO.Path.Combine(destinationFolder, fileName);
                System.IO.Directory.CreateDirectory(destinationFolder);

                var (exported, exportError) = await QueuedTask.Run(async () =>
                {
                    return await ExportService.ExportLayoutAsync(layoutName, newExportedFilePath, exportFormat);
                });

                if (!exported)
                {
                    ShowError($"Failed to re-export layout.\n\n{exportError}");
                    return;
                }

                var mapMetadata = new
                {
                    layout_name = layoutName,
                    project_path = projectUri,
                    project_name = projectName,
                    category = category,
                    file_path = newExportedFilePath,
                    category_prefix = categoryPrefix,
                    to_whom = toWhom,
                    status = status,
                    comment = comment
                };

                var (success, error) = await ApiService.UpdateMapAsync(mapId, mapMetadata);
                if (!success)
                {
                    TryDeleteFile(newExportedFilePath);
                    ShowError($"Failed to update map record.\n\nError: {error}");
                    return;
                }

                if (System.IO.File.Exists(existingFilePath) && existingFilePath != newExportedFilePath)
                {
                    try { System.IO.File.Delete(existingFilePath); } catch { }
                }

                ShowSuccess($"Map updated successfully!\n\nID: {uniqueId}\nFile: {newExportedFilePath}");
            }
            catch (Exception ex)
            {
                TryDeleteFile(newExportedFilePath);
                Logger.Error(ex, "ExecuteEditExistingAsync FATAL ERROR");
                ShowError($"Update failed: {ex.Message}");
            }
        }

        private void ReportError(string title, Exception ex)
        {
            ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                $"{title}:\n{ex.Message}", "Sentinel Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }

        private void ShowPreFlightError(PreFlightService.PreFlightResult result)
        {
            ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                "Pre-flight checks did not pass.\n\n" + (result?.GetSummary() ?? "No pre-flight result available."),
                "Pre-Flight Failed", MessageBoxButton.OK, MessageBoxImage.Warning);
        }

        private void ShowError(string message)
        {
            Application.Current.Dispatcher.Invoke(() =>
            {
                ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(message, "Sentinel Error", MessageBoxButton.OK, MessageBoxImage.Error);
            });
        }

        private void ShowSuccess(string message)
        {
            Application.Current.Dispatcher.Invoke(() =>
            {
                ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(message, "Sentinel Success", MessageBoxButton.OK, MessageBoxImage.Information);
            });
        }

        private void TryDeleteFile(string filePath)
        {
            if (!string.IsNullOrEmpty(filePath) && System.IO.File.Exists(filePath))
            {
                try { System.IO.File.Delete(filePath); } catch { }
            }
        }
    }
}