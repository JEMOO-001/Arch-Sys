using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using ArcLayoutSentinel.Services;
using ArcLayoutSentinel.Models;

namespace ArcLayoutSentinel.Views
{
    public partial class MapSelectionDialog : Window
    {
        private List<MapInfo> _allMaps = new List<MapInfo>();
        private MapInfo _selectedMap;

        public MapInfo SelectedMap => _selectedMap;

        public MapSelectionDialog()
        {
            InitializeComponent();
            ThemeHelper.ApplyTheme(this);
            MapListView.SelectionChanged += MapListView_SelectionChanged;
            _ = LoadMapsAsync();
        }

        private async System.Threading.Tasks.Task LoadMapsAsync()
        {
            try
            {
                ConfigManager.Load();
                if (string.IsNullOrEmpty(ConfigManager.ApiToken))
                {
                    ResultCount.Text = "Login required";
                    return;
                }

                ResultCount.Text = "Loading...";
                _allMaps = await ApiService.GetUserMapsAsync();
                FilterAndDisplayMaps();
            }
            catch (Exception ex)
            {
                ResultCount.Text = "Error loading maps";
                MessageBox.Show($"Failed to load your maps: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void FilterAndDisplayMaps()
        {
            var searchTerm = SearchTextBox.Text?.Trim().ToLower() ?? "";
            var filtered = _allMaps;

            if (!string.IsNullOrEmpty(searchTerm))
            {
                filtered = _allMaps.Where(m =>
                    m.UniqueId.ToLower().Contains(searchTerm) ||
                    m.LayoutName.ToLower().Contains(searchTerm) ||
                    m.Category.ToLower().Contains(searchTerm) ||
                    m.Status.ToLower().Contains(searchTerm)
                ).ToList();
            }

            MapListView.ItemsSource = filtered;
            ResultCount.Text = $"{filtered.Count} map(s)";
        }

        private void SearchTextBox_TextChanged(object sender, TextChangedEventArgs e) => FilterAndDisplayMaps();
        private void MapListView_SelectionChanged(object sender, SelectionChangedEventArgs e) => SelectButton.IsEnabled = MapListView.SelectedItem != null;

        private void MapListView_MouseDoubleClick(object sender, MouseButtonEventArgs e)
        {
            if (MapListView.SelectedItem != null) SelectMapAndClose();
        }

        private void SelectButton_Click(object sender, RoutedEventArgs e) => SelectMapAndClose();

        private void SelectMapAndClose()
        {
            if (MapListView.SelectedItem is MapInfo selected)
            {
                _selectedMap = selected;
                DialogResult = true;
                Close();
            }
        }

        public bool IsBackClicked { get; private set; } = false;

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            IsBackClicked = true;
            DialogResult = false;
            Close();
        }
    }
}
