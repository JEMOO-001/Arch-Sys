using System;
using ArcGIS.Desktop.Framework;
using ArcGIS.Desktop.Framework.Contracts;

namespace ArcLayoutSentinel
{
    /// <summary>
    /// Main module for Sentinel Add-in.
    /// This is the entry point that ArcGIS Pro loads on startup.
    /// Simple version with clear logging.
    /// </summary>
    public class Module1 : Module
    {
        private static Module1 _module = null;

        public static Module1 Current
        {
            get { return _module ?? (_module = FrameworkApplication.FindModule("SentinelTest_Module") as Module1); }
        }

        protected override bool Initialize()
        {
            System.Diagnostics.Debug.WriteLine("=== Sentinel Test Module Loaded ===");
            
            try
            {
                // Show a message that the module loaded
                ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                    "Sentinel Test Add-in loaded successfully!",
                    "Sentinel",
                    System.Windows.MessageBoxButton.OK,
                    System.Windows.MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Module Initialize Error: {ex.Message}");
            }

            return base.Initialize();
        }

        protected override bool CanUnload()
        {
            return true;
        }
    }
}