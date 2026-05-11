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

                var selectionDialog = new ArchiveSelectionDialog();
                try { selectionDialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }
                selectionDialog.ShowDialog();

                if (selectionDialog.Result == ArchiveSelectionDialog.SelectionResult.CreateNew)
                {
                    await HandleCreateNewAsync(layoutInfo.LayoutNames, layoutInfo.ActiveLayoutName,
                        layoutInfo.ProjectUri, projectName);
                }
                else if (selectionDialog.Result == ArchiveSelectionDialog.SelectionResult.EditExisting)
                {
                    await HandleEditExistingAsync(layoutInfo.LayoutNames, layoutInfo.ActiveLayoutName,
                        layoutInfo.ProjectUri, projectName);
                }

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

        private async Task HandleCreateNewAsync(List<string> layoutNames, string activeLayoutName,
            string projectUri, string projectName)
        {
            var dialog = new ArchiveMetadataDialog(layoutNames, activeLayoutName);
            dialog.ProjectUri = projectUri;
            dialog.ProjectName = projectName;
            try { dialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }
            dialog.ShowDialog();
        }

        private async Task HandleEditExistingAsync(List<string> layoutNames, string activeLayoutName,
            string projectUri, string projectName)
        {
            var mapSelectionDialog = new MapSelectionDialog();
            try { mapSelectionDialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }
            mapSelectionDialog.ShowDialog();

            if (mapSelectionDialog.SelectedMap == null) return;

            var existingMap = mapSelectionDialog.SelectedMap;
            Logger.Info("Selected map for edit: {UniqueID}", existingMap.UniqueId);

            var dialog = new ArchiveMetadataDialog(layoutNames, activeLayoutName, existingMap);
            dialog.ProjectUri = projectUri;
            dialog.ProjectName = projectName;
            try { dialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }
            dialog.ShowDialog();
        }
    }
}
