using System;
using ArcGIS.Desktop.Framework;
using ArcGIS.Desktop.Framework.Contracts;
using ArcLayoutSentinel.Services;

namespace ArcLayoutSentinel
{
    public class DisconnectButton : Button
    {
        protected override void OnUpdate()
        {
            bool isLoggedIn = FrameworkApplication.State.Contains("sentinel_logged_in_state");
            this.Enabled = isLoggedIn;
        }

        protected override void OnClick()
        {
            try
            {
                Logger.Info("DisconnectButton.OnClick - Logging out user");

                ConfigManager.ClearSession();

                Module1.Current.SetLoggedInState(false);

                Logger.Info("User logged out successfully");
            }
            catch (Exception ex)
            {
                Logger.Error(ex, "DisconnectButton.OnClick ERROR");
                ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                    $"Could not disconnect:\n{ex.Message}",
                    "Sentinel Error");
            }
        }
    }
}