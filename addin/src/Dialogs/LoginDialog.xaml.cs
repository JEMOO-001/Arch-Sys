using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using ArcLayoutSentinel.Services;

namespace ArcLayoutSentinel.Dialogs
{
    /// <summary>
    /// Zero-SDK Login Dialog - Standard WPF Window, no ArcGIS Pro SDK dependencies.
    /// Constitution: "Zero-SDK UI" - WPF dialogs must not call ArcGIS Pro SDK on the UI thread.
    /// </summary>
    public partial class LoginDialog : Window
    {
        public string Username => UsernameTextBox.Text.Trim();
        public string AccessToken { get; private set; }

        public LoginDialog()
        {
            InitializeComponent();
            ConfigManager.Load();

            // Pre-fill username if saved
            if (!string.IsNullOrEmpty(ConfigManager.LastUsername))
            {
                UsernameTextBox.Text = ConfigManager.LastUsername;
            }

            // Check server status on load (non-blocking)
            _ = CheckServerStatusAsync();
        }

        /// <summary>
        /// Updates the status indicator in the UI.
        /// Constitution: Zero-SDK - Pure WPF, no ArcGIS SDK calls.
        /// </summary>
        private async Task CheckServerStatusAsync()
        {
            try
            {
                var (reachable, error) = await PreFlightService.CheckApiReachableAsync();
                if (reachable)
                {
                    StatusIndicator.Fill = new SolidColorBrush(Colors.Green);
                    StatusText.Foreground = new SolidColorBrush(Colors.Green);
                    StatusText.Text = "Server is Online";
                }
                else
                {
                    StatusIndicator.Fill = new SolidColorBrush(Colors.Red);
                    StatusText.Foreground = new SolidColorBrush(Colors.Red);
                    StatusText.Text = "Server is Offline";
                }
            }
            catch (Exception)
            {
                StatusIndicator.Fill = new SolidColorBrush(Colors.Red);
                StatusText.Foreground = new SolidColorBrush(Colors.Red);
                StatusText.Text = "Server is Offline";
            }
        }

        /// <summary>
        /// Test Connection button click - Verification before login attempt.
        /// Constitution: "Pre-Flight First" - Always verify API before operations.
        /// </summary>
        private async void TestConnectionButton_Click(object sender, RoutedEventArgs e)
        {
            TestConnectionButton.IsEnabled = false;
            StatusText.Foreground = new SolidColorBrush(Colors.Orange);
            StatusText.Text = "Testing connection...";
            StatusIndicator.Fill = new SolidColorBrush(Colors.Orange);

            try
            {
                var (reachable, error) = await PreFlightService.CheckApiReachableAsync();
                if (reachable)
                {
                    StatusIndicator.Fill = new SolidColorBrush(Colors.Green);
                    StatusText.Foreground = new SolidColorBrush(Colors.Green);
                    StatusText.Text = "Server is Online";
                }
                else
                {
                    StatusIndicator.Fill = new SolidColorBrush(Colors.Red);
                    StatusText.Foreground = new SolidColorBrush(Colors.Red);
                    StatusText.Text = "Server is Offline";
                    MessageBox.Show($"Failed to connect to server:\n{error}\n\nPlease verify:\n" +
                        $"• API server is running at {ConfigManager.BaseUrl}\n" +
                        $"• Network connectivity is available", "Connection Test Failed", MessageBoxButton.OK, MessageBoxImage.Warning);
                }
            }
            catch (Exception ex)
            {
                StatusIndicator.Fill = new SolidColorBrush(Colors.Red);
                StatusText.Foreground = new SolidColorBrush(Colors.Red);
                StatusText.Text = "Server is Offline";
                MessageBox.Show($"Connection test error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                TestConnectionButton.IsEnabled = true;
            }
        }

        private async void LoginButton_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(Username) || string.IsNullOrWhiteSpace(PasswordBox.Password))
            {
                MessageBox.Show("Please enter both username and password.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            // Disable button to prevent double-click
            LoginButton.IsEnabled = false;
            StatusText.Foreground = new SolidColorBrush(Colors.Orange);
            StatusText.Text = "Logging in...";
            StatusIndicator.Fill = new SolidColorBrush(Colors.Orange);

            try
            {
                var (success, token, error) = await ApiService.LoginAsync(Username, PasswordBox.Password);

                if (success)
                {
                    ConfigManager.ApiToken = token;
                    ConfigManager.LastUsername = Username;
                    ConfigManager.SessionId = Guid.NewGuid().ToString();
                    ConfigManager.SessionCreatedAt = DateTime.UtcNow;
                    ConfigManager.SessionExpiresAt = DateTime.UtcNow.AddHours(24);
                    ConfigManager.MachineId = ConfigManager.GetMachineId();
                    ConfigManager.Save();

                    Module1.Current.SetLoggedInState(true);

                    StatusIndicator.Fill = new SolidColorBrush(Colors.Green);
                    StatusText.Foreground = new SolidColorBrush(Colors.Green);
                    StatusText.Text = "Login successful";

                    this.DialogResult = true;
                    this.Close();
                }
                else
                {
                    MessageBox.Show(error, "Login Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    StatusIndicator.Fill = new SolidColorBrush(Colors.Red);
                    StatusText.Foreground = new SolidColorBrush(Colors.Red);
                    StatusText.Text = "Login failed";
                    LoginButton.IsEnabled = true;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Login error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                StatusIndicator.Fill = new SolidColorBrush(Colors.Red);
                StatusText.Foreground = new SolidColorBrush(Colors.Red);
                StatusText.Text = "Login error";
                LoginButton.IsEnabled = true;
            }
        }
    }
}
