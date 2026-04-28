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
        public string Category 
        {
            get
            {
                var selected = CategoryComboBox.SelectedItem?.ToString();
                if (string.IsNullOrEmpty(selected))
                    return "";
                return selected;
            }
        }
        public string CategoryPrefix { get; private set; }
        public string ExportFormat => (ExportFormatComboBox.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "PDF";

        private PreFlightService.PreFlightResult _lastPreFlightResult;
        private List<string> _layoutNames;
        private string _activeLayoutName;
        private List<CategoryInfo> _categories;

        public ArchiveMetadataDialog(List<string> layoutNames, string activeLayoutName)
        {
            InitializeComponent();
            ConfigManager.Load();

            _layoutNames = layoutNames;
            _activeLayoutName = activeLayoutName;
            _categories = new List<CategoryInfo>();

            if (layoutNames != null)
            {
                foreach (var name in layoutNames)
                    if (!string.IsNullOrEmpty(name)) LayoutComboBox.Items.Add(name);
            }
            if (!string.IsNullOrEmpty(activeLayoutName) && !LayoutComboBox.Items.Contains(activeLayoutName))
                LayoutComboBox.Items.Insert(0, activeLayoutName);
            if (LayoutComboBox.Items.Count > 0) LayoutComboBox.SelectedIndex = 0;

            _ = LoadCategoriesAsync();
            _ = RunPreFlightCheckAsync();
        }

        private async System.Threading.Tasks.Task LoadCategoriesAsync()
        {
            try
            {
                _categories = await ApiService.GetCategoriesAsync();
                foreach (var cat in _categories)
                {
                    CategoryComboBox.Items.Add(cat.name);
                }
                if (CategoryPlaceholder != null)
                    CategoryPlaceholder.Visibility = Visibility.Visible;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to load categories: {ex.Message}");
            }
        }

        private void CategoryComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (CategoryPlaceholder != null)
            {
                CategoryPlaceholder.Visibility = CategoryComboBox.SelectedItem != null ? Visibility.Collapsed : Visibility.Visible;
            }
            
            var selectedItem = CategoryComboBox.SelectedItem;
            if (selectedItem is string selectedName)
            {
                var cat = _categories.Find(c => c.name == selectedName);
                if (cat != null)
                {
                    CategoryPrefix = cat.prefix;
                }
            }
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

            if (string.IsNullOrWhiteSpace(Category))
            {
                MessageBox.Show("Please select a category.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
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

        private void LayoutComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
        }
    }
}