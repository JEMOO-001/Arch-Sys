using System;
using System.Collections.Generic;
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
        public string ToWhom => ToWhomComboBox.Text ?? "";
        public string Status => StatusComboBox.Text ?? "Not Started";
        public string Comment => CommentTextBox.Text ?? "";
        public string IncomeNum => "";
        public string OutcomeNum => "";

        private PreFlightService.PreFlightResult _lastPreFlightResult;
        private List<string> _layoutNames;
        private string _activeLayoutName;
        private List<CategoryInfo> _categories;
        private int? _editingMapId;
        private bool _isEditMode;

        public ArchiveMetadataDialog(List<string> layoutNames, string activeLayoutName)
        {
            InitializeComponent();
            ConfigManager.Load();
            _isEditMode = false;

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

            PreFlightIndicator.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#888888"));

            _ = LoadCategoriesAsync();
            _ = RunPreFlightCheckAsync();
        }

        public ArchiveMetadataDialog(List<string> layoutNames, string activeLayoutName, MapInfo existingMap)
        {
            InitializeComponent();
            ConfigManager.Load();
            _isEditMode = true;
            _editingMapId = existingMap.MapId;

            _layoutNames = layoutNames;
            _activeLayoutName = activeLayoutName;
            _categories = new List<CategoryInfo>();

            HeaderTitle.Text = "Edit archived map";
            HeaderSubtitle.Text = $"Editing: {existingMap.UniqueId}";
            ArchiveButton.Content = "Update & re-export";
            UniqueIdTextBox.Text = existingMap.UniqueId;

            if (layoutNames != null)
            {
                foreach (var name in layoutNames)
                    if (!string.IsNullOrEmpty(name)) LayoutComboBox.Items.Add(name);
            }
            if (!string.IsNullOrEmpty(activeLayoutName) && !LayoutComboBox.Items.Contains(activeLayoutName))
                LayoutComboBox.Items.Insert(0, activeLayoutName);

            var existingLayout = existingMap.LayoutName;
            for (int i = 0; i < LayoutComboBox.Items.Count; i++)
            {
                var item = LayoutComboBox.Items[i];
                var itemText = item is ComboBoxItem ci ? ci.Content?.ToString() : item?.ToString();
                if (itemText == existingLayout)
                {
                    LayoutComboBox.SelectedIndex = i;
                    break;
                }
            }
            if (LayoutComboBox.SelectedIndex < 0 && LayoutComboBox.Items.Count > 0)
                LayoutComboBox.SelectedIndex = 0;

            ToWhomComboBox.Text = existingMap.ToWhom ?? "";
            StatusComboBox.Text = existingMap.Status ?? "Not Started";
            CommentTextBox.Text = existingMap.Comment ?? "";

            PreFlightIndicator.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#3B6D11"));
            PreFlightText.Text = "Pre-flight passed — ready to update";
            ArchiveButton.IsEnabled = true;

            _ = LoadCategoriesAsync();
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
            PreFlightText.Text = "Running checks…";
            PreFlightIndicator.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#D87E17"));

            try
            {
                _lastPreFlightResult = await PreFlightService.RunPreFlightCheckAsync();

                if (_lastPreFlightResult != null && _lastPreFlightResult.AllPassed)
                {
                    PreFlightIndicator.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#3B6D11"));
                    PreFlightText.Text = "Pre-flight passed — ready to archive";
                    ArchiveButton.IsEnabled = true;
                }
                else
                {
                    PreFlightIndicator.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#cc0000"));
                    PreFlightText.Text = "Pre-flight failed — see details";
                }
            }
            catch (Exception ex)
            {
                PreFlightIndicator.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#cc0000"));
                PreFlightText.Text = $"Error: {ex.Message}";
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
            DialogResult = false;
            Close();
        }

        public PreFlightService.PreFlightResult GetPreFlightResult() => _lastPreFlightResult;
        public int? GetEditingMapId() => _editingMapId;
        public bool IsEditMode() => _isEditMode;
    }
}