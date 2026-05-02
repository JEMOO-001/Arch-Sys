using System;
using ArcGIS.Desktop.Framework;
using ArcGIS.Desktop.Framework.Contracts;
using ArcLayoutSentinel.Services;
using ArcLayoutSentinel.Dialogs;

namespace ArcLayoutSentinel
{
    public class ConnectButton : Button
    {
        protected override void OnUpdate()
        {
            bool isLoggedIn = FrameworkApplication.State.Contains("sentinel_logged_in_state");

            if (isLoggedIn)
            {
                this.Caption = "Connected";
                this.Tooltip = $"Connected as {ConfigManager.LastUsername}";
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
                bool isLoggedIn = FrameworkApplication.State.Contains("sentinel_logged_in_state");

                if (isLoggedIn)
                {
                    ConfigManager.ClearSession();
                    Module1.Current.SetLoggedInState(false);
                }
                else
                {
                    var loginDialog = new LoginDialog();
                    try { loginDialog.Owner = FrameworkApplication.Current.MainWindow; } catch { }
                    loginDialog.ShowDialog();

                    if (loginDialog.DialogResult == true)
                    {
                        Module1.Current.SetLoggedInState(true);
                    }
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