using System;
using ArcGIS.Desktop.Framework;
using ArcGIS.Desktop.Framework.Contracts;
using ArcLayoutSentinel.Dialogs;
using ArcLayoutSentinel.Services;

namespace ArcLayoutSentinel
{
    public class ConnectButton : Button
    {
        protected override void OnUpdate()
        {
            bool isLoggedIn = FrameworkApplication.State.Contains("sentinel_logged_in_state");

            if (isLoggedIn)
            {
                this.Caption = "Disconnect";
                this.Tooltip = $"Disconnect from Sentinel - Logged in as {ConfigManager.LastUsername}";
            }
            else
            {
                this.Caption = "Connect";
                this.Tooltip = "Connect to Sentinel server";
            }
        }

        protected override void OnClick()
        {
            try
            {
                bool isLoggedIn = FrameworkApplication.State.Contains("sentinel_logged_in_state");

                if (isLoggedIn)
                {
                    ConfigManager.ClearSession();
                    Module1.Current.SetLoggedInState(false);
                }
                else
                {
                    var loginDialog = new LoginDialog();
                    loginDialog.Owner = ArcGIS.Desktop.Framework.FrameworkApplication.Current.MainWindow;
                    loginDialog.ShowDialog();
                }
            }
            catch (Exception ex)
            {
                ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                    $"Error:\n{ex.Message}",
                    "Sentinel Error");
            }
        }
    }
}