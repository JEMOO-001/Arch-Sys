using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using ArcLayoutSentinel.Services;

namespace ArcLayoutSentinel.Dialogs
{
    public partial class ArchiveMetadataDialog : Window
    {
        public string SelectedLayout 
        {
            get
            {
                if (LayoutComboBox.SelectedItem is ComboBoxItem item)
                    return item.Content?.ToString() ?? "";
                return LayoutComboBox.SelectedItem?.ToString() ?? "";
            }
        }
        public string ProjectCode => ProjectCodeTextBox.Text.Trim();
        public string ClientName => ClientTextBox.Text.Trim();
        public string Category => CategoryTextBox.Text.Trim();
        public string CategoryPrefix => CategoryPrefixTextBox.Text.Trim().ToUpperInvariant();
        public string ExportFormat => (ExportFormatComboBox.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "PDF";

        private PreFlightService.PreFlightResult _lastPreFlightResult;
        private List<string> _layoutNames;
        private string _activeLayoutName;

        public ArchiveMetadataDialog(List<string> layoutNames, string activeLayoutName)
        {
            InitializeComponent();
            ConfigManager.Load();

            _layoutNames = layoutNames;
            _activeLayoutName = activeLayoutName;

            if (layoutNames != null)
            {
                foreach (var name in layoutNames)
                    if (!string.IsNullOrEmpty(name)) LayoutComboBox.Items.Add(name);
            }
            if (!string.IsNullOrEmpty(activeLayoutName) && !LayoutComboBox.Items.Contains(activeLayoutName))
                LayoutComboBox.Items.Insert(0, activeLayoutName);
            if (LayoutComboBox.Items.Count > 0) LayoutComboBox.SelectedIndex = 0;

            _ = RunPreFlightCheckAsync();
        }

        private async System.Threading.Tasks.Task RunPreFlightCheckAsync()
        {
            PreFlightButton.IsEnabled = false;
            ArchiveButton.IsEnabled = false;
            PreFlightText.Text = "Running pre-flight checks...";
            PreFlightIndicator.Fill = new SolidColorBrush(Colors.Orange);

            try
            {
                _lastPreFlightResult = await PreFlightService.RunPreFlightCheckAsync();
                
                System.Diagnostics.Debug.WriteLine($"PreFlight Result: AllPassed={_lastPreFlightResult?.AllPassed}");
                
                if (_lastPreFlightResult != null && _lastPreFlightResult.AllPassed)
                {
                    PreFlightIndicator.Fill = new SolidColorBrush(Colors.Green);
                    PreFlightText.Text = "Pre-flight passed - ready to archive";
                    ArchiveButton.IsEnabled = true;
                }
                else
                {
                    PreFlightIndicator.Fill = new SolidColorBrush(Colors.Red);
                    PreFlightText.Text = "Pre-flight failed - see details";
                }
            }
            catch (Exception ex)
            {
                PreFlightIndicator.Fill = new SolidColorBrush(Colors.Red);
                PreFlightText.Text = $"Error: {ex.Message}";
                System.Diagnostics.Debug.WriteLine($"PreFlight Error: {ex}");
            }
            finally
            {
                PreFlightButton.IsEnabled = true;
            }
        }

        private async void PreFlightButton_Click(object sender, RoutedEventArgs e)
        {
            await RunPreFlightCheckAsync();
            if (_lastPreFlightResult != null && !_lastPreFlightResult.AllPassed)
                MessageBox.Show(_lastPreFlightResult.GetSummary(), "Pre-Flight Check Failed", MessageBoxButton.OK, MessageBoxImage.Warning);
        }

        private void ArchiveButton_Click(object sender, RoutedEventArgs e)
        {
            System.Diagnostics.Debug.WriteLine("ArchiveButton_Click triggered");
            
            if (_lastPreFlightResult == null || !_lastPreFlightResult.AllPassed)
            {
                MessageBox.Show("Pre-flight checks must pass before archiving.", "Pre-Flight Required", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (string.IsNullOrWhiteSpace(ProjectCodeTextBox.Text) || string.IsNullOrWhiteSpace(ClientTextBox.Text) ||
                string.IsNullOrWhiteSpace(CategoryTextBox.Text) || string.IsNullOrWhiteSpace(CategoryPrefixTextBox.Text))
            {
                MessageBox.Show("All fields are required.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (!Regex.IsMatch(CategoryPrefixTextBox.Text, @"^[A-Z]{2}$"))
            {
                MessageBox.Show("Category Prefix must be exactly 2 uppercase letters (A-Z).", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            DialogResult = true;
            Close();
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            System.Diagnostics.Debug.WriteLine("CancelButton_Click triggered");
            DialogResult = false;
            Close();
        }

        public PreFlightService.PreFlightResult GetPreFlightResult() => _lastPreFlightResult;
    }
}