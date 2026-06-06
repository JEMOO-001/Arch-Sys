using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ArcGIS.Desktop.Framework;
using ArcGIS.Desktop.Framework.Contracts;
using ArcGIS.Desktop.Framework.Threading.Tasks;
using ArcGIS.Desktop.Layouts;
using ArcGIS.Desktop.Core;
using ArcLayoutSentinel.Services;
using ArcLayoutSentinel.Views;
using ArcLayoutSentinel.Models;
using System.Windows;

namespace ArcLayoutSentinel
{
    public class ArchiveButton : Button
    {
        protected override async void OnClick()
        {
            try
            {
                Logger.Info("ArchiveButton.OnClick started");

                // Check session validity first
                if (!ConfigManager.IsSessionValid())
                {
                    Logger.Info("Session invalid or expired, showing LoginDialog");
                    var loginDialog = new LoginDialog();
                    try { loginDialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }
                    loginDialog.ShowDialog();

                    if (loginDialog.DialogResult != true)
                    {
                        Logger.Info("Login cancelled, stopping archive process");
                        return;
                    }
                }

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

                string projectName = string.IsNullOrEmpty(layoutInfo.ProjectUri)
                    ? ""
                    : System.IO.Path.GetFileNameWithoutExtension(layoutInfo.ProjectUri);

                // Start wizard navigation flow
                RunNavigationFlow(layoutInfo.LayoutNames, layoutInfo.ActiveLayoutName,
                    layoutInfo.ProjectUri, projectName);

                Logger.Info("ArchiveButton.OnClick completed");
            }
            catch (Exception ex)
            {
                Logger.Error(ex, "ArchiveButton.OnClick FATAL ERROR");
                ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                    $"Archive Error:\n{ex.Message}", "Sentinel Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void RunNavigationFlow(List<string> layoutNames, string activeLayoutName,
            string projectUri, string projectName)
        {
            int currentState = 0;
            MapInfo selectedMap = null;

            while (true)
            {
                if (currentState == 0) // ArchiveSelectionDialog
                {
                    var selectionDialog = new ArchiveSelectionDialog();
                    try { selectionDialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }
                    selectionDialog.ShowDialog();

                    if (selectionDialog.Result == ArchiveSelectionDialog.SelectionResult.CreateNew)
                    {
                        currentState = 2; // Go to Metadata (Create Mode)
                    }
                    else if (selectionDialog.Result == ArchiveSelectionDialog.SelectionResult.EditExisting)
                    {
                        currentState = 1; // Go to Map Selection
                    }
                    else
                    {
                        break; // Cancelled
                    }
                }
                else if (currentState == 1) // MapSelectionDialog
                {
                    var mapSelectionDialog = new MapSelectionDialog();
                    try { mapSelectionDialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }
                    mapSelectionDialog.ShowDialog();

                    if (mapSelectionDialog.IsBackClicked)
                    {
                        currentState = 0; // Go back to ArchiveSelectionDialog
                    }
                    else if (mapSelectionDialog.SelectedMap != null)
                    {
                        selectedMap = mapSelectionDialog.SelectedMap;
                        currentState = 3; // Go to Metadata (Edit Mode)
                    }
                    else
                    {
                        break; // Cancelled
                    }
                }
                else if (currentState == 2) // ArchiveMetadataDialog (Create Mode)
                {
                    var dialog = new ArchiveMetadataDialog(layoutNames, activeLayoutName);
                    dialog.ProjectUri = projectUri;
                    dialog.ProjectName = projectName;
                    dialog.ShowBackButton(true);
                    try { dialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }
                    dialog.ShowDialog();

                    if (dialog.IsBackClicked)
                    {
                        currentState = 0; // Go back to ArchiveSelectionDialog
                    }
                    else
                    {
                        break; // Success or Cancelled
                    }
                }
                else if (currentState == 3) // ArchiveMetadataDialog (Edit Mode)
                {
                    var dialog = new ArchiveMetadataDialog(layoutNames, activeLayoutName, selectedMap);
                    dialog.ProjectUri = projectUri;
                    dialog.ProjectName = projectName;
                    dialog.ShowBackButton(true);
                    try { dialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }
                    dialog.ShowDialog();

                    if (dialog.IsBackClicked)
                    {
                        currentState = 1; // Go back to MapSelectionDialog
                    }
                    else
                    {
                        break; // Success or Cancelled
                    }
                }
            }
        }
    }
}
