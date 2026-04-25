using System;
using System.Diagnostics;
using ArcGIS.Desktop.Framework;
using ArcGIS.Desktop.Framework.Contracts;
using ArcLayoutSentinel.Panes;

namespace ArcLayoutSentinel.Ribbon
{
    public class ConnectButton : Button
    {
        protected override void OnClick()
        {
            try
            {
                Debug.WriteLine("=== SENTINEL DEBUG ===");
                Debug.WriteLine($"Connect button clicked at: {DateTime.Now}");

                // Use the ViewModel's Show() method which handles creation + activation
                LoginDockPaneViewModel.Show();

                Debug.WriteLine("LoginDockPaneViewModel.Show() completed successfully");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"EXCEPTION in ConnectButton: {ex}");

                // If that fails, try manual creation as fallback
                try
                {
                    Debug.WriteLine("Attempting fallback: manual DockPane creation");
                    var pane = FrameworkApplication.DockPaneManager.Find("ArcLayoutSentinel_LoginDockPane");
                    if (pane == null)
                    {
                        Debug.WriteLine("Pane not found, cannot force creation - check Config.daml");
                        ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                            "Login panel not registered in Config.daml",
                            "Sentinel Error");
                    }
                    else
                    {
                        Debug.WriteLine("Pane found, activating");
                        pane.Activate();
                    }
                }
                catch (Exception ex2)
                {
                    Debug.WriteLine($"Fallback also failed: {ex2}");
                    ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                        $"Critical error opening login panel:\n\nPrimary error:\n{ex.Message}\n\nFallback error:\n{ex2.Message}",
                        "Sentinel Critical Error",
                        System.Windows.MessageBoxButton.OK,
                        System.Windows.MessageBoxImage.Error);
                }
            }
            finally
            {
                Debug.WriteLine("=== END DEBUG ===");
            }
        }
    }
}
