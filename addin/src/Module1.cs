using System;
using System.Diagnostics;
using System.Threading.Tasks;
using ArcGIS.Desktop.Framework;
using ArcGIS.Desktop.Framework.Contracts;
using ArcGIS.Desktop.Core.Events;

namespace ArcLayoutSentinel
{
    public class Module1 : Module
    {
        private static Module1 _module = null;

        public static Module1 Current
        {
            get { return _module ?? (_module = FrameworkApplication.FindModule("Sentinel_Module") as Module1); }
        }

        public static ArcGIS.Desktop.Core.Project Project => ArcGIS.Desktop.Core.Project.Current;

        private static string _lastBootTimeFile;
        private static DateTime _lastKnownBootTime;

        protected override bool Initialize()
        {
            try
            {
                Services.Logger.Initialize();
                Services.Logger.Info("Sentinel Add-in Initializing...");

                Services.ConfigManager.Load();

                CheckPcRestart();

                // Subscribe to project events for persistence
                ProjectOpenedEvent.Subscribe(args =>
                {
                    try
                    {
                        Services.Logger.Info("Project opened. Loading Sentinel settings...");
                        Services.ConfigManager.LoadFromProject();

                        if (Services.ConfigManager.IsSessionValid())
                        {
                            Services.Logger.Info("Session restored from project for {User}", Services.ConfigManager.LastUsername);
                            SetLoggedInState(true);
                        }
                    }
                    catch (Exception ex)
                    {
                        Services.Logger.Error(ex, "ProjectOpenedEvent Handler ERROR");
                    }
                });

                ProjectClosingEvent.Subscribe(args =>
                {
                    try
                    {
                        Services.Logger.Info("Project closing. Saving Sentinel settings...");
                        Services.ConfigManager.SaveToProject();
                    }
                    catch (Exception ex)
                    {
                        Services.Logger.Error(ex, "ProjectClosingEvent Handler ERROR");
                    }
                    return Task.CompletedTask;
                });

                if (Services.ConfigManager.IsSessionValid())
                {
                    Services.Logger.Info("Restoring valid session for {User}", Services.ConfigManager.LastUsername);
                    SetLoggedInState(true);
                }
                else if (!string.IsNullOrEmpty(Services.ConfigManager.ApiToken))
                {
                    Services.Logger.Info("Session expired or invalid, clearing...");
                    Services.ConfigManager.ClearSession();
                }
                else
                {
                    Services.Logger.Info("No session, showing login pane");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Module1.Initialize FAILED: {ex}");
            }

            return base.Initialize();
        }

        private void CheckPcRestart()
        {
            try
            {
                _lastBootTimeFile = System.IO.Path.Combine(
                    System.Environment.GetFolderPath(System.Environment.SpecialFolder.LocalApplicationData),
                    "ArcLayoutSentinel", "lastboot.txt");

                var currentBootTime = GetLastBootTime();

                if (System.IO.File.Exists(_lastBootTimeFile))
                {
                    var savedBootTimeStr = System.IO.File.ReadAllText(_lastBootTimeFile);
                    if (DateTime.TryParse(savedBootTimeStr, out _lastKnownBootTime))
                    {
                        if (_lastKnownBootTime < currentBootTime)
                        {
                            Services.Logger.Info("PC restart detected, clearing session");
                            Services.ConfigManager.ClearSession();
                        }
                    }
                }

                System.IO.File.WriteAllText(_lastBootTimeFile, currentBootTime.ToString("o"));
            }
            catch (Exception ex)
            {
                Services.Logger.Error(ex, "CheckPcRestart ERROR");
            }
        }

        private DateTime GetLastBootTime()
        {
            try
            {
                // Native .NET API: instant boot time calculation without thread-blocking
                return DateTime.Now - TimeSpan.FromMilliseconds(Environment.TickCount64);
            }
            catch (Exception ex)
            {
                Services.Logger.Error(ex, "Failed to get system boot time");
                return DateTime.Now;
            }
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