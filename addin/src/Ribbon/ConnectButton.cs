using System;
using ArcGIS.Desktop.Framework;
using ArcGIS.Desktop.Framework.Contracts;

namespace ArcLayoutSentinel.Ribbon
{
    public class ConnectButton : Button
    {
        protected override void OnClick()
        {
            ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                "Connect button clicked! The add-in is working.\nNext step: show login panel.",
                "Sentinel Debug");

            try
            {
                var pane = FrameworkApplication.DockPaneManager.Find("ArcLayoutSentinel_LoginDockPane");
                if (pane != null)
                {
                    pane.Activate();
                }
                else
                {
                    ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                        "DockPane not found. Check Config.daml registration.",
                        "Sentinel Debug");
                }
            }
            catch (Exception ex)
            {
                ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                    $"DockPane error:\n{ex.Message}\n\n{ex.StackTrace}",
                    "Sentinel Debug");
            }
        }
    }
}
