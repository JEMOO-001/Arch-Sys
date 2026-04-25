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
                    StatusText.Text = "Server online";
                }
                else
                {
                    StatusIndicator.Fill = new SolidColorBrush(Colors.Red);
                    StatusText.Text = $"Server unreachable: {error}";
                }
            }
            catch (Exception ex)
            {
                StatusIndicator.Fill = new SolidColorBrush(Colors.Red);
                StatusText.Text = $"Error: {ex.Message}";
            }
        }

        /// <summary>
        /// Test Connection button click - Verification before login attempt.
        /// Constitution: "Pre-Flight First" - Always verify API before operations.
        /// </summary>
        private async void TestConnectionButton_Click(object sender, RoutedEventArgs e)
        {
            TestConnectionButton.IsEnabled = false;
            StatusText.Text = "Testing connection...";
            StatusIndicator.Fill = new SolidColorBrush(Colors.Orange);

            try
            {
                var (reachable, error) = await PreFlightService.CheckApiReachableAsync();
                if (reachable)
                {
                    StatusIndicator.Fill = new SolidColorBrush(Colors.Green);
                    StatusText.Text = "Connection successful - server is online";
                }
                else
                {
                    StatusIndicator.Fill = new SolidColorBrush(Colors.Red);
                    StatusText.Text = $"Connection failed: {error}";
                    MessageBox.Show($"Failed to connect to server:\n{error}\n\nPlease verify:\n" +
                        $"• API server is running at {ConfigManager.BaseUrl}\n" +
                        $"• Network connectivity is available", "Connection Test Failed", MessageBoxButton.OK, MessageBoxImage.Warning);
                }
            }
            catch (Exception ex)
            {
                StatusIndicator.Fill = new SolidColorBrush(Colors.Red);
                StatusText.Text = $"Error: {ex.Message}";
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
            StatusText.Text = "Logging in...";
            StatusIndicator.Fill = new SolidColorBrush(Colors.Orange);

            try
            {
                bool success = await TryLoginCoreAsync(Username, PasswordBox.Password);

                if (success)
                {
                    // Save username for next time
                    ConfigManager.LastUsername = Username;
                    ConfigManager.Save();

                    StatusIndicator.Fill = new SolidColorBrush(Colors.Green);
                    StatusText.Text = "Login successful";

                    this.DialogResult = true;
                    this.Close();
                }
                else
                {
                    // Error messages are already shown by TryLoginCoreAsync
                    StatusIndicator.Fill = new SolidColorBrush(Colors.Red);
                    StatusText.Text = "Login failed";
                    LoginButton.IsEnabled = true;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Login error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                StatusIndicator.Fill = new SolidColorBrush(Colors.Red);
                StatusText.Text = "Login error";
                LoginButton.IsEnabled = true;
            }
        }

        private async Task<bool> TryLoginCoreAsync(string username, string password)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    // Set a timeout to prevent hanging indefinitely
                    client.Timeout = TimeSpan.FromSeconds(10);

                    // Prepare form data - simple username/password authentication
                    var formData = new System.Collections.Generic.Dictionary<string, string>
                    {
                        { "username", username },
                        { "password", password }
                    };
                    var content = new FormUrlEncodedContent(formData);

                    System.Diagnostics.Debug.WriteLine($"DEBUG: TryLoginAsync - Sending POST to {ConfigManager.BaseUrl}/auth/login");
                    System.Diagnostics.Debug.WriteLine($"DEBUG: TryLoginAsync - Username: {username}");

                    // Send POST to /auth/login
                    var response = await client.PostAsync($"{ConfigManager.BaseUrl}/auth/login", content);

                    System.Diagnostics.Debug.WriteLine($"DEBUG: TryLoginAsync - Response received: {response.StatusCode}");

                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync();
                        System.Diagnostics.Debug.WriteLine($"DEBUG: TryLoginAsync - Response JSON: {json}");

                        using (var doc = JsonDocument.Parse(json))
                        {
                            if (doc.RootElement.TryGetProperty("access_token", out var tokenElement))
                            {
                                AccessToken = tokenElement.GetString();

                                // Save token to ConfigManager
                                ConfigManager.ApiToken = AccessToken;
                                ConfigManager.Save();

                                System.Diagnostics.Debug.WriteLine("DEBUG: TryLoginAsync - Login successful");
                                return true;
                            }
                            else
                            {
                                System.Diagnostics.Debug.WriteLine("DEBUG: TryLoginAsync - No 'access_token' property in response");
                                var keysList = new System.Collections.Generic.List<string>();
                                foreach (var prop in doc.RootElement.EnumerateObject())
                                {
                                    keysList.Add(prop.Name);
                                }
                                System.Diagnostics.Debug.WriteLine($"DEBUG: TryLoginAsync - Response keys: {string.Join(", ", keysList)}");
                                MessageBox.Show("API response doesn't contain access_token. Check API format.", "Response Format Error", MessageBoxButton.OK, MessageBoxImage.Error);
                                return false;
                            }
                        }
                    }
                    else
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        System.Diagnostics.Debug.WriteLine($"DEBUG: TryLoginAsync - Login failed with status {response.StatusCode}");
                        System.Diagnostics.Debug.WriteLine($"DEBUG: TryLoginAsync - Error response: {errorContent}");
                        MessageBox.Show($"Login failed: {response.StatusCode}\n{errorContent}", "Login Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                }
            }
            catch (TaskCanceledException)
            {
                System.Diagnostics.Debug.WriteLine("DEBUG: TryLoginAsync - Request timeout");
                MessageBox.Show("Login request timed out. Is the API server running at " + ConfigManager.BaseUrl + "?", "Timeout", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
            catch (HttpRequestException ex)
            {
                System.Diagnostics.Debug.WriteLine($"DEBUG: TryLoginAsync - Network error: {ex.Message}");
                MessageBox.Show($"Network error: {ex.Message}\n\nCheck that API is running at: {ConfigManager.BaseUrl}", "Network Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            catch (JsonException ex)
            {
                System.Diagnostics.Debug.WriteLine($"DEBUG: TryLoginAsync - JSON parsing error: {ex.Message}");
                MessageBox.Show($"Invalid JSON response from server: {ex.Message}", "JSON Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"DEBUG: TryLoginAsync - Unexpected error: {ex.GetType().Name} - {ex.Message}");
                MessageBox.Show($"Unexpected error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }

            return false;
        }
    }
}
