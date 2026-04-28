using System;
using ArcGIS.Desktop.Framework.Contracts;
using ArcLayoutSentinel.Panes;

namespace ArcLayoutSentinel.Ribbon
{
    /// <summary>
    /// Connect Button - Toggles the Sentinel Connection DockPane.
    /// Stability: Uses non-modal DockPane to prevent UI freezes.
    /// </summary>
    public class ConnectButton : Button
    {
        protected override void OnUpdate()
        {
            bool isLoggedIn = ArcGIS.Desktop.Framework.FrameworkApplication.State.Contains("sentinel_logged_in_state");

            if (isLoggedIn)
            {
                this.Caption = "Connected";
                this.Tooltip = $"Connected to Sentinel as {Services.ConfigManager.LastUsername}";
            }
            else
            {
                this.Caption = "Connect";
                this.Tooltip = "Login to Sentinel server";
            }
        }

        protected override void OnClick()
        {
            try
            {
                // Force use of DockPane for stability (Zero-SDK UI pattern)
                LoginDockPaneViewModel.Show();
            }
            catch (Exception ex)
            {
                ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                    $"Could not open Connection pane:\n{ex.Message}",
                    "Sentinel Error");
            }
        }
    }
}
