using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Input;
using ArcGIS.Desktop.Framework;
using ArcGIS.Desktop.Framework.Contracts;
using System.Threading.Tasks;

namespace ArcLayoutSentinel
{
    public class Module1 : Module
    {
        private static Module1 _this = null;

        public static Module1 Current
        {
            get
            {
                return _this ?? (_this = (Module1)FrameworkApplication.FindModule("ArcLayoutSentinel_Module"));
            }
        }

        protected override bool Initialize()
        {
            try
            {
                Services.ConfigManager.Load();

                if (!string.IsNullOrEmpty(Services.ConfigManager.ApiToken))
                {
                    SetLoggedInState(true);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Module1.Initialize FAILED: {ex}");
            }

            return base.Initialize();
        }

        public void SetLoggedInState(bool isLoggedIn)
        {
            try
            {
                if (isLoggedIn)
                {
                    FrameworkApplication.State.Activate("sentinel_logged_in_state");
                }
                else
                {
                    FrameworkApplication.State.Deactivate("sentinel_logged_in_state");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"SetLoggedInState FAILED: {ex}");
            }
        }

        protected override bool CanUnload()
        {
            return true;
        }
    }
}
