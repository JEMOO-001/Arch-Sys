using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using ArcLayoutSentinel.Services;

namespace ArcLayoutSentinel.Dialogs
{
    /// <summary>
    /// Zero-SDK Archive Metadata Dialog - Standard WPF Window, no ArcGIS Pro SDK dependencies.
    /// Constitution: "Zero-SDK UI" - WPF dialogs must not call ArcGIS Pro SDK on the UI thread.
    /// Constitution: "Pre-Flight First" - Verify connectivity before archival operations.
    /// </summary>
    public partial class ArchiveMetadataDialog : Window
    {
        public string SelectedLayout => LayoutComboBox.SelectedItem?.ToString() ?? string.Empty;
        public string ProjectCode => ProjectCodeTextBox.Text.Trim();
        public string ClientName => ClientTextBox.Text.Trim();
        public string Category => CategoryTextBox.Text.Trim();
        public string CategoryPrefix => CategoryPrefixTextBox.Text.Trim().ToUpperInvariant();
        public string ExportFormat => (ExportFormatComboBox.SelectedItem as System.Windows.Controls.ComboBoxItem)?.Content?.ToString() ?? "PDF";

        private PreFlightService.PreFlightResult _lastPreFlightResult;

        public ArchiveMetadataDialog(List<string> layoutNames, string activeLayoutName)
        {
            InitializeComponent();
            ConfigManager.Load();

            // Populate ComboBox safely without touching ArcGIS Pro API
            LayoutComboBox.Items.Clear();
            if (layoutNames != null)
            {
                foreach (var name in layoutNames)
                {
                    if (!string.IsNullOrEmpty(name))
                    {
                        LayoutComboBox.Items.Add(name);
                    }
                }
            }

            // Ensure active layout is in the list
            if (!string.IsNullOrEmpty(activeLayoutName) && !LayoutComboBox.Items.Contains(activeLayoutName))
            {
                LayoutComboBox.Items.Insert(0, activeLayoutName);
            }

            // Select active or first
            if (LayoutComboBox.Items.Count > 0)
            {
                if (!string.IsNullOrEmpty(activeLayoutName) && LayoutComboBox.Items.Contains(activeLayoutName))
                {
                    LayoutComboBox.SelectedItem = activeLayoutName;
                }
                else
                {
                    LayoutComboBox.SelectedIndex = 0;
                }
            }
            else
            {
                LayoutComboBox.Items.Add("Current Layout");
                LayoutComboBox.SelectedIndex = 0;
            }

            // Run pre-flight check on load
            _ = RunPreFlightCheckAsync();
        }

        /// <summary>
        /// Runs the pre-flight check and updates the UI.
        /// Constitution: "Pre-Flight First" - Always verify before writes.
        /// </summary>
        private async Task RunPreFlightCheckAsync()
        {
            PreFlightButton.IsEnabled = false;
            ArchiveButton.IsEnabled = false;
            PreFlightText.Text = "Running pre-flight checks...";
            PreFlightIndicator.Fill = new SolidColorBrush(Colors.Orange);

            try
            {
                _lastPreFlightResult = await PreFlightService.RunPreFlightCheckAsync();

                if (_lastPreFlightResult.AllPassed)
                {
                    PreFlightIndicator.Fill = new SolidColorBrush(Colors.Green);
                    PreFlightText.Text = "Pre-flight passed - ready to archive";
                    ArchiveButton.IsEnabled = true;
                }
                else
                {
                    PreFlightIndicator.Fill = new SolidColorBrush(Colors.Red);
                    PreFlightText.Text = "Pre-flight failed - click 'Run Pre-Flight' for details";
                }
            }
            catch (Exception ex)
            {
                PreFlightIndicator.Fill = new SolidColorBrush(Colors.Red);
                PreFlightText.Text = $"Pre-flight error: {ex.Message}";
            }
            finally
            {
                PreFlightButton.IsEnabled = true;
            }
        }

        /// <summary>
        /// Pre-Flight button click - Manual re-check.
        /// </summary>
        private async void PreFlightButton_Click(object sender, RoutedEventArgs e)
        {
            await RunPreFlightCheckAsync();

            if (_lastPreFlightResult != null && !_lastPreFlightResult.AllPassed)
            {
                MessageBox.Show(_lastPreFlightResult.GetSummary(), "Pre-Flight Check Failed",
                    MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        /// <summary>
        /// Archive button click with Pre-Flight validation.
        /// Constitution: "Pre-Flight First" - Block if checks fail.
        /// Constitution: "Zero-SDK UI" - Pure WPF, no ArcGIS SDK.
        /// </summary>
        private void ArchiveButton_Click(object sender, RoutedEventArgs e)
        {
            if (_lastPreFlightResult == null || !_lastPreFlightResult.AllPassed)
            {
                MessageBox.Show("Pre-flight checks must pass before archiving.\n\n" +
                    (_lastPreFlightResult?.GetSummary() ?? "No pre-flight result available."),
                    "Pre-Flight Required", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (string.IsNullOrWhiteSpace(ProjectCode) ||
                string.IsNullOrWhiteSpace(ClientName) ||
                string.IsNullOrWhiteSpace(Category) ||
                string.IsNullOrWhiteSpace(CategoryPrefix))
            {
                MessageBox.Show("All fields are required.", "Validation Error",
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (!Regex.IsMatch(CategoryPrefix, @"^[A-Z]{2}$"))
            {
                MessageBox.Show("Category Prefix must be exactly 2 uppercase letters (A-Z).",
                    "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (!Regex.IsMatch(ProjectCode, @"^[A-Za-z0-9_\-]+$"))
            {
                MessageBox.Show("Project Code may only contain letters, digits, hyphens, and underscores.",
                    "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (!Regex.IsMatch(ClientName, @"^[A-Za-z0-9 _\-]+$"))
            {
                MessageBox.Show("Client Name may only contain letters, digits, spaces, hyphens, and underscores.",
                    "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (string.IsNullOrWhiteSpace(SelectedLayout))
            {
                MessageBox.Show("Please select a layout to archive.", "Validation Error",
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            this.DialogResult = true;
            this.Close();
        }

        /// <summary>
        /// Gets the pre-flight result for the caller to verify before proceeding.
        /// </summary>
        public PreFlightService.PreFlightResult GetPreFlightResult() => _lastPreFlightResult;
    }
}
