using System;
using ArcGIS.Desktop.Framework.Contracts;

namespace ArcLayoutSentinel
{
    /// <summary>
    /// Simple test button to verify add-in loads.
    /// </summary>
    public class TestButton : Button
    {
        protected override void OnClick()
        {
            try
            {
                System.Diagnostics.Debug.WriteLine("=== Test Button Clicked ===");
                
                ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                    "Sentinel Test Button Works!\n\nThe add-in is loaded correctly.",
                    "Test",
                    System.Windows.MessageBoxButton.OK,
                    System.Windows.MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Button Error: {ex.Message}");
                ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                    $"Error: {ex.Message}",
                    "Error",
                    System.Windows.MessageBoxButton.OK,
                    System.Windows.MessageBoxImage.Error);
            }
        }

        protected override void OnUpdate()
        {
            this.Caption = "Test Button";
            this.Tooltip = "Click to test if add-in is working";
        }
    }
}