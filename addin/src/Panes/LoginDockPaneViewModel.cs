using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Input;
using ArcGIS.Desktop.Framework;
using ArcGIS.Desktop.Framework.Contracts;
using ArcLayoutSentinel.Services;
using System.Diagnostics;

namespace ArcLayoutSentinel.Panes
{
    public class LoginDockPaneViewModel : DockPane
    {
        private const string _dockPaneID = "ArcLayoutSentinel_LoginDockPane";

        public LoginDockPaneViewModel()
        {
            Logger.Debug("=== LoginDockPaneViewModel Constructor ===");
            // Ensure config is loaded even if InitializeAsync doesn't fire
            ConfigManager.Load();
        }

        private string _username = "";
        private string _statusText = "Checking server...";
        private string _statusColor = "Gray";
        private bool _isLoginEnabled = true;
        private bool _isTestEnabled = true;
        private string _password = "";

        public string Username
        {
            get => _username;
            set => SetProperty(ref _username, value);
        }

        public string Password
        {
            get => _password;
            set => SetProperty(ref _password, value);
        }

        public string StatusText
        {
            get => _statusText;
            set => SetProperty(ref _statusText, value);
        }

        public string StatusColor
        {
            get => _statusColor;
            set => SetProperty(ref _statusColor, value);
        }

        public bool IsLoginEnabled
        {
            get => _isLoginEnabled;
            set => SetProperty(ref _isLoginEnabled, value);
        }

        public bool IsTestEnabled
        {
            get => _isTestEnabled;
            set => SetProperty(ref _isTestEnabled, value);
        }

        public ICommand LoginCommand => new RelayCommand(async () => await DoLoginAsync(), () => IsLoginEnabled);
        public ICommand TestConnectionCommand => new RelayCommand(async () => await DoTestConnectionAsync(), () => IsTestEnabled);

        protected override async Task InitializeAsync()
        {
            Logger.Debug("=== LoginDockPaneViewModel InitializeAsync ===");
            await base.InitializeAsync();
            ConfigManager.Load();

            if (!string.IsNullOrEmpty(ConfigManager.LastUsername))
                Username = ConfigManager.LastUsername;

            await DoTestConnectionAsync();
        }

        private async Task DoTestConnectionAsync()
        {
            Logger.Debug("=== DoTestConnectionAsync ===");
            IsTestEnabled = false;
            StatusText = "Testing connection...";
            StatusColor = "Orange";

            try
            {
                var (reachable, error) = await PreFlightService.CheckApiReachableAsync();
                if (reachable)
                {
                    StatusColor = "Green";
                    StatusText = "Server online";
                    Logger.Info("Server is reachable");
                }
                else
                {
                    StatusColor = "Red";
                    StatusText = $"Unreachable: {error}";
                    Logger.Warn("Server unreachable: {Error}", error);
                }
            }
            catch (Exception ex)
            {
                StatusColor = "Red";
                StatusText = $"Error: {ex.Message}";
                Logger.Error(ex, "DoTestConnectionAsync ERROR");
            }
            finally
            {
                IsTestEnabled = true;
            }
        }

        private async Task DoLoginAsync()
        {
            Logger.Info("=== DoLoginAsync for user {Username} ===", Username);
            if (string.IsNullOrWhiteSpace(Username) || string.IsNullOrWhiteSpace(Password))
            {
                StatusColor = "Red";
                StatusText = "Enter username and password.";
                return;
            }

            IsLoginEnabled = false;
            StatusText = "Logging in...";
            StatusColor = "Orange";

            try
            {
                var (success, token, error) = await ApiService.LoginAsync(Username, Password);

                if (success)
                {
                    ConfigManager.ApiToken = token;
                    ConfigManager.LastUsername = Username;
                    ConfigManager.Save();

                    Module1.Current.SetLoggedInState(true);

                    StatusColor = "Green";
                    StatusText = $"Connected as {Username}";
                    Password = "";
                    Logger.Info("Login successful via ApiService for {Username}", Username);
                }
                else
                {
                    StatusColor = "Red";
                    StatusText = error;
                    Logger.Warn("Login failed for {Username}: {Error}", Username, error);
                }
            }
            catch (Exception ex)
            {
                StatusColor = "Red";
                StatusText = $"Error: {ex.Message}";
                Logger.Error(ex, "DoLoginAsync ERROR");
            }
            finally
            {
                IsLoginEnabled = true;
            }
        }

        public static void Show()
        {
            Logger.Debug("=== LoginDockPaneViewModel.Show() - Looking for pane ID: {PaneID} ===", _dockPaneID);

            try
            {
                var pane = FrameworkApplication.DockPaneManager.Find(_dockPaneID);

                if (pane != null)
                {
                    Logger.Debug("Pane found! Activating...");
                    pane.Activate();
                }
                else
                {
                    Logger.Error("ERROR: DockPane '{PaneID}' not found!", _dockPaneID);
                    ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                        $"DockPane '{_dockPaneID}' could not be found.\n\n" +
                        "Verify Config.daml registration and that the pane ID matches.\n\n" +
                        "Expected ID: " + _dockPaneID,
                        "Sentinel Error");
                }
            }
            catch (Exception ex)
            {
                Logger.Error(ex, "ERROR in Show()");
                ArcGIS.Desktop.Framework.Dialogs.MessageBox.Show(
                    $"Error showing DockPane:\n{ex.Message}\n\n{ex.StackTrace}",
                    "Sentinel Critical Error");
            }
        }
    }
}
