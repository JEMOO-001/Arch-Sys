using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using ArcLayoutSentinel.Services;
using ArcLayoutSentinel.Models;

namespace ArcLayoutSentinel.Views
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
                if (string.IsNullOrEmpty(selected)) return "";
                return selected;
            }
        }
        public string CategoryPrefix { get; private set; }
        public string ExportFormat => (ExportFormatComboBox.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "PDF";
        public int DPI
        {
            get
            {
                var item = DpiComboBox.SelectedItem as ComboBoxItem;
                if (item != null && int.TryParse(item.Content?.ToString(), out int dpi))
                    return dpi;
                return 300;
            }
        }
        public string ToWhom => ToWhomComboBox.SelectedItem is ComboBoxItem ci ? (ci.Content?.ToString() ?? "") : (ToWhomComboBox.Text ?? "");
        public string Status => "In Progress";
        public string Comment => CommentTextBox.Text ?? "";
        public string IncomeNum => IncomeNumTextBox.Text ?? "";
        public string OutcomeNum => OutcomeNumTextBox.Text ?? "";

        private PreFlightResult _lastPreFlightResult;
        private List<string> _layoutNames;
        private string _activeLayoutName;
        private List<CategoryInfo> _categories;
        private int? _editingMapId;
        private bool _isEditMode;
        private bool _isProcessing;
        private CancellationTokenSource _cts;

        public bool ArchiveSucceeded { get; private set; }
        public string ArchiveId { get; private set; }
        public string ArchiveFilePath { get; private set; }

        // Project info from caller
        public string ProjectUri { get; set; }
        public string ProjectName { get; set; }

        public ArchiveMetadataDialog(List<string> layoutNames, string activeLayoutName)
        {
            InitializeComponent();
            ConfigManager.Load();
            this.Closing += OnClosing;
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
            ThemeHelper.ApplyTheme(this);

            if (!string.IsNullOrEmpty(ConfigManager.ApiToken))
            {
                _ = LoadCategoriesAsync();
                _ = RunPreFlightCheckAsync();
            }
            else
            {
                PreFlightText.Text = "Login required";
                PreFlightIndicator.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#cc0000"));
            }
        }

        public ArchiveMetadataDialog(List<string> layoutNames, string activeLayoutName, MapInfo existingMap)
        {
            InitializeComponent();
            ConfigManager.Load();
            this.Closing += OnClosing;
            _isEditMode = true;
            _editingMapId = existingMap.MapId;
            ArchiveId = existingMap.UniqueId;

            _layoutNames = layoutNames;
            _activeLayoutName = activeLayoutName;
            _categories = new List<CategoryInfo>();

            HeaderTitle.Text = "Edit archived map";
            HeaderSubtitle.Text = $"Editing: {existingMap.UniqueId}";
            ArchiveBtn.Content = "Update & re-export";

            UniqueIdTextBox.Text = existingMap.UniqueId;
            UniqueIdPanel.Visibility = Visibility.Visible;

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

            IncomeNumTextBox.Text = existingMap.IncomeNum ?? "";
            OutcomeNumTextBox.Text = existingMap.OutcomeNum ?? "";

            var toWhomValue = existingMap.ToWhom ?? "";
            for (int i = 0; i < ToWhomComboBox.Items.Count; i++)
            {
                if ((ToWhomComboBox.Items[i] as ComboBoxItem)?.Content?.ToString() == toWhomValue)
                {
                    ToWhomComboBox.SelectedIndex = i;
                    break;
                }
            }

            CommentTextBox.Text = existingMap.Comment ?? "";

            PreFlightIndicator.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#888888"));
            PreFlightText.Text = "Checking pre-flight...";
            ThemeHelper.ApplyTheme(this);

            if (!string.IsNullOrEmpty(ConfigManager.ApiToken))
            {
                _ = LoadCategoriesAsync();
                _ = RunPreFlightCheckAsync();
            }
            else
            {
                PreFlightText.Text = "Login required";
                PreFlightIndicator.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#cc0000"));
            }
        }

        private async System.Threading.Tasks.Task LoadCategoriesAsync()
        {
            try
            {
                _categories = await ApiService.GetCategoriesAsync();
                foreach (var cat in _categories)
                    CategoryComboBox.Items.Add(cat.name);
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
                CategoryPlaceholder.Visibility = CategoryComboBox.SelectedItem != null ? Visibility.Collapsed : Visibility.Visible;

            var selectedItem = CategoryComboBox.SelectedItem;
            if (selectedItem is string selectedName)
            {
                var cat = _categories.Find(c => c.name == selectedName);
                if (cat != null) CategoryPrefix = cat.prefix;
            }
        }

        private async System.Threading.Tasks.Task RunPreFlightCheckAsync()
        {
            PreFlightButton.IsEnabled = false;
            ArchiveBtn.IsEnabled = false;
            PreFlightText.Text = "Running checks…";
            PreFlightIndicator.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#D87E17"));

            try
            {
                _lastPreFlightResult = await PreFlightService.RunPreFlightCheckAsync();

                if (_lastPreFlightResult != null && _lastPreFlightResult.AllPassed)
                {
                    PreFlightIndicator.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#3B6D11"));
                    PreFlightText.Text = "Pre-flight passed — ready to archive";
                    ArchiveBtn.IsEnabled = true;
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

        private async void ArchiveButton_Click(object sender, RoutedEventArgs e)
        {
            if (_isProcessing) return;

            if (ArchiveSucceeded)
            {
                DialogResult = true;
                Close();
                return;
            }

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
            if (string.IsNullOrWhiteSpace(IncomeNum))
            {
                MessageBox.Show("Please enter an Income Number.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }
            if (string.IsNullOrWhiteSpace(ToWhom))
            {
                MessageBox.Show("Please select a recipient (To Whom).", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            try
            {
                EnterProcessingState();

                var token = _cts.Token;
                if (_isEditMode)
                    await ExecuteEditExistingAsync(token);
                else
                    await ExecuteCreateNewAsync(token);

                ExitProcessingState(success: true);
            }
            catch (OperationCanceledException)
            {
                ExitProcessingState(success: false, "Cancelled by user");
            }
            catch (Exception ex)
            {
                Logger.Error(ex, _isEditMode ? "ExecuteEditExistingAsync FATAL ERROR" : "ExecuteCreateNewAsync FATAL ERROR");
                ExitProcessingState(success: false, ex.Message);
            }
        }

        private void EnterProcessingState()
        {
            _isProcessing = true;
            _cts = new CancellationTokenSource();
            ArchiveBtn.IsEnabled = false;
            CancelBtn.IsEnabled = true;
            CancelBtn.Content = "Cancel";
            PreFlightButton.IsEnabled = false;
            LayoutComboBox.IsEnabled = false;
            CategoryComboBox.IsEnabled = false;
            ExportFormatComboBox.IsEnabled = false;
            DpiComboBox.IsEnabled = false;
            IncomeNumTextBox.IsEnabled = false;
            OutcomeNumTextBox.IsEnabled = false;
            ToWhomComboBox.IsEnabled = false;
            CommentTextBox.IsEnabled = false;
            ProgressBorder.Visibility = Visibility.Visible;
            ProgressText.Text = _isEditMode ? "Re-exporting and updating…" : "Generating ID, exporting, uploading…";
            ProgressBar.IsIndeterminate = true;
        }

        private void ExitProcessingState(bool success, string error = null)
        {
            _isProcessing = false;
            _cts?.Dispose();
            _cts = null;
            ProgressBorder.Visibility = Visibility.Collapsed;
            CancelBtn.IsEnabled = true;
            CancelBtn.Content = "Cancel";

            if (success)
            {
                ArchiveBtn.Content = "Close";
                ArchiveBtn.IsEnabled = true;
                ArchiveBtn.Background = ThemeHelper.FindBrush(this, "Sentinel.SuccessBrush");
                CancelBtn.Visibility = Visibility.Collapsed;
                ResultText.Text = $"Archived successfully as In Progress.\nID: {ArchiveId}";
                ResultText.Foreground = ThemeHelper.FindBrush(this, "Sentinel.SuccessBrush");
                ResultText.Visibility = Visibility.Visible;
                ArchiveSucceeded = true;
            }
            else
            {
                ArchiveBtn.Content = "Retry";
                ArchiveBtn.IsEnabled = true;
                ArchiveBtn.Background = ThemeHelper.FindBrush(this, "Sentinel.AccentBrush");
                ResultText.Text = $"Error: {error ?? "Unknown error"}";
                ResultText.Foreground = ThemeHelper.FindBrush(this, "Sentinel.ErrorBrush");
                ResultText.Visibility = Visibility.Visible;
                ArchiveSucceeded = false;

                // Re-enable inputs on error so user can fix
                LayoutComboBox.IsEnabled = true;
                CategoryComboBox.IsEnabled = true;
                ExportFormatComboBox.IsEnabled = true;
                DpiComboBox.IsEnabled = true;
                IncomeNumTextBox.IsEnabled = true;
                OutcomeNumTextBox.IsEnabled = true;
                ToWhomComboBox.IsEnabled = true;
                CommentTextBox.IsEnabled = true;
            }
        }

        private async System.Threading.Tasks.Task ExecuteCreateNewAsync(CancellationToken token)
        {
            string layoutName = SelectedLayout;
            string categoryPrefix = CategoryPrefix;
            string category = Category;
            string exportFormat = ExportFormat;
            int dpi = DPI;
            string incomeNum = IncomeNum;
            string outcomeNum = OutcomeNum;
            string toWhom = ToWhom;
            string status = Status;
            string comment = Comment;
            string projectName = ProjectName;
            string projectUri = ProjectUri;

            Logger.Info($"Archive new: layout={layoutName}, category={category}, prefix={categoryPrefix}, income={incomeNum}, outcome={outcomeNum}, toWhom={toWhom}, status={status}");

            var (generatedId, idError) = await ApiService.GetGenerateIdAsync(categoryPrefix);
            token.ThrowIfCancellationRequested();
            if (string.IsNullOrEmpty(generatedId))
                throw new Exception($"Failed to generate unique ID.\n\n{idError}");

            string uniqueId = generatedId;
            ArchiveId = uniqueId;

            string archiveRoot = ConfigManager.ArchiveRoot;
            string destinationFolder = ArchivalService.GenerateDestinationFolder(archiveRoot, category);
            string ext = exportFormat.ToLowerInvariant() == "jpeg" ? "jpeg" : "pdf";
            string fileName = ArchivalService.GenerateFileName(uniqueId, projectName, ext);
            string exportedFilePath = System.IO.Path.Combine(destinationFolder, fileName);
            System.IO.Directory.CreateDirectory(destinationFolder);

            ProgressText.Text = "Exporting layout…";
            token.ThrowIfCancellationRequested();
            var (exported, exportError) = await ArcGIS.Desktop.Framework.Threading.Tasks.QueuedTask.Run(async () =>
            {
                return await ExportService.ExportLayoutAsync(layoutName, exportedFilePath, exportFormat, dpi);
            });

            token.ThrowIfCancellationRequested();
            if (!exported)
                throw new Exception($"Failed to export layout.\n\n{exportError}");

            ArchiveFilePath = exportedFilePath;

            ProgressText.Text = "Registering in database…";
            var mapMetadata = new
            {
                unique_id = uniqueId,
                layout_name = layoutName,
                project_path = projectUri,
                project_name = projectName,
                category = category,
                income_num = incomeNum,
                outcome_num = outcomeNum,
                to_whom = toWhom,
                status = status ?? "In Progress",
                comment = comment,
                file_path = exportedFilePath,
                category_prefix = categoryPrefix
            };

            var (success, error) = await ApiService.ArchiveMapAsync(mapMetadata);
            if (!success)
            {
                TryDeleteFile(exportedFilePath);
                throw new Exception($"API archive registration failed.\n\nError: {error}");
            }

            Logger.Info($"Archive completed: ID={uniqueId}, file={exportedFilePath}");
        }

        private async System.Threading.Tasks.Task ExecuteEditExistingAsync(CancellationToken token)
        {
            int mapId = _editingMapId.Value;
            string layoutName = SelectedLayout;
            string categoryPrefix = CategoryPrefix;
            string category = Category;
            string exportFormat = ExportFormat;
            int dpi = DPI;
            string incomeNum = IncomeNum;
            string outcomeNum = OutcomeNum;
            string toWhom = ToWhom;
            string status = Status;
            string comment = Comment;
            string projectName = ProjectName;
            string projectUri = ProjectUri;
            string uniqueId = ArchiveId;

            Logger.Info($"Archive edit: mapId={mapId}, layout={layoutName}, category={category}, prefix={categoryPrefix}");

            string archiveRoot = ConfigManager.ArchiveRoot;
            string destinationFolder = ArchivalService.GenerateDestinationFolder(archiveRoot, category);
            string ext = exportFormat.ToLowerInvariant() == "jpeg" ? "jpeg" : "pdf";
            string fileName = ArchivalService.GenerateFileName(uniqueId, projectName, ext);
            string newExportedFilePath = System.IO.Path.Combine(destinationFolder, fileName);
            System.IO.Directory.CreateDirectory(destinationFolder);

            ProgressText.Text = "Exporting layout…";
            token.ThrowIfCancellationRequested();
            var (exported, exportError) = await ArcGIS.Desktop.Framework.Threading.Tasks.QueuedTask.Run(async () =>
            {
                return await ExportService.ExportLayoutAsync(layoutName, newExportedFilePath, exportFormat, dpi);
            });

            token.ThrowIfCancellationRequested();
            if (!exported)
                throw new Exception($"Failed to re-export layout.\n\n{exportError}");

            ArchiveFilePath = newExportedFilePath;

            ProgressText.Text = "Updating database record…";
            var mapMetadata = new
            {
                layout_name = layoutName,
                project_path = projectUri,
                project_name = projectName,
                category = category,
                income_num = incomeNum,
                outcome_num = outcomeNum,
                to_whom = toWhom,
                status = status ?? "In Progress",
                comment = comment,
                file_path = newExportedFilePath,
                category_prefix = categoryPrefix
            };

            var (success, error) = await ApiService.UpdateMapAsync(mapId, mapMetadata);
            if (!success)
            {
                TryDeleteFile(newExportedFilePath);
                throw new Exception($"Failed to update map record.\n\nError: {error}");
            }

            Logger.Info($"Map updated: ID={uniqueId}, file={newExportedFilePath}");
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            // If user clicks cancel during processing
            if (_isProcessing)
            {
                ProgressText.Text = "Cancelling…";
                CancelBtn.IsEnabled = false;
                _cts?.Cancel();
                return;
            }

            // On success, "Close" acts as close
            if (ArchiveSucceeded)
            {
                DialogResult = true;
                Close();
                return;
            }

            if (_isProcessing) return;

            DialogResult = false;
            Close();
        }

        private void OnClosing(object sender, CancelEventArgs e)
        {
            if (_isProcessing)
            {
                e.Cancel = true;
                return;
            }
            if (!ArchiveSucceeded)
                DialogResult = false;
        }

        private void TryDeleteFile(string filePath)
        {
            if (!string.IsNullOrEmpty(filePath) && System.IO.File.Exists(filePath))
            {
                try { System.IO.File.Delete(filePath); } catch { }
            }
        }

        public PreFlightResult GetPreFlightResult() => _lastPreFlightResult;
        public int? GetEditingMapId() => _editingMapId;
        public bool IsEditMode() => _isEditMode;

        public bool IsBackClicked { get; private set; } = false;

        public void ShowBackButton(bool show)
        {
            if (BackBtn != null)
            {
                BackBtn.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
            }
        }

        private void BackButton_Click(object sender, RoutedEventArgs e)
        {
            if (_isProcessing) return;
            IsBackClicked = true;
            DialogResult = false;
            Close();
        }
    }
}
