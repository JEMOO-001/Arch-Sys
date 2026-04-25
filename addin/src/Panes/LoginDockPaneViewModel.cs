using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Input;
using ArcGIS.Desktop.Framework;
using ArcGIS.Desktop.Framework.Contracts;
using ArcLayoutSentinel.Services;

namespace ArcLayoutSentinel.Panes
{
    internal class LoginDockPaneViewModel : DockPane
    {
        private const string _dockPaneID = "ArcLayoutSentinel_LoginDockPane";

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
            await base.InitializeAsync();
            ConfigManager.Load();

            if (!string.IsNullOrEmpty(ConfigManager.LastUsername))
                Username = ConfigManager.LastUsername;

            await DoTestConnectionAsync();
        }

        private async Task DoTestConnectionAsync()
        {
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
                }
                else
                {
                    StatusColor = "Red";
                    StatusText = $"Unreachable: {error}";
                }
            }
            catch (Exception ex)
            {
                StatusColor = "Red";
                StatusText = $"Error: {ex.Message}";
            }
            finally
            {
                IsTestEnabled = true;
            }
        }

        private async Task DoLoginAsync()
        {
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
                using (var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) })
                {
                    var formData = new System.Collections.Generic.Dictionary<string, string>
                    {
                        { "username", Username },
                        { "password", Password }
                    };
                    var content = new FormUrlEncodedContent(formData);
                    var response = await client.PostAsync($"{ConfigManager.BaseUrl}/auth/login", content);

                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync();
                        using (var doc = JsonDocument.Parse(json))
                        {
                            if (doc.RootElement.TryGetProperty("access_token", out var tokenElement))
                            {
                                ConfigManager.ApiToken = tokenElement.GetString();
                                ConfigManager.LastUsername = Username;
                                ConfigManager.Save();

                                Module1.Current.SetLoggedInState(true);

                                StatusColor = "Green";
                                StatusText = $"Connected as {Username}";
                                Password = "";
                                return;
                            }
                        }
                        StatusColor = "Red";
                        StatusText = "Invalid server response (no token).";
                    }
                    else
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        StatusColor = "Red";
                        StatusText = $"Login failed: {response.StatusCode}";
                    }
                }
            }
            catch (TaskCanceledException)
            {
                StatusColor = "Red";
                StatusText = "Timeout - is the server running?";
            }
            catch (HttpRequestException ex)
            {
                StatusColor = "Red";
                StatusText = $"Network error: {ex.Message}";
            }
            catch (Exception ex)
            {
                StatusColor = "Red";
                StatusText = $"Error: {ex.Message}";
            }
            finally
            {
                IsLoginEnabled = true;
            }
        }

        internal static void Show()
        {
            var pane = FrameworkApplication.DockPaneManager.Find(_dockPaneID);
            pane?.Activate();
        }
    }
}
