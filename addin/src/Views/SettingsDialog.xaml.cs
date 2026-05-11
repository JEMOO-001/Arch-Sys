using System.Windows;
using System.Windows.Media;
using ArcLayoutSentinel.Services;

namespace ArcLayoutSentinel.Views
{
    public partial class SettingsDialog : Window
    {
        public SettingsDialog()
        {
            InitializeComponent();
            ConfigManager.Load();
            BaseUrlTextBox.Text = ConfigManager.BaseUrl;
            ArchiveRootTextBox.Text = ConfigManager.ArchiveRoot;
            ApplyTheme();
        }

        private void ApplyTheme()
        {
            bool isDark = ThemeHelper.IsDarkTheme();
            var bg = isDark ? "#252525" : "#F3F3F3";
            var surface = isDark ? "#333333" : "#FFFFFF";
            var border = isDark ? "#3a3a3a" : "#D9D9D9";
            var text = isDark ? "#e6e6e6" : "#1A1A1A";
            var secondary = isDark ? "#999999" : "#4A4A4A";
            var inputBg = isDark ? "#2a2a2a" : "#FFFFFF";
            var inputBorder = isDark ? "#3a3a3a" : "#D9D9D9";

            Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(bg));
            HeaderBorder.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(surface));
            HeaderBorder.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(border));
            FooterBorder.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(surface));
            FooterBorder.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(border));

            CancelBtn.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(
                isDark ? "#444444" : "#D4D4D4"));
            CancelBtn.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(text));

            BaseUrlTextBox.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(inputBg));
            BaseUrlTextBox.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(text));
            BaseUrlTextBox.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(inputBorder));
            ArchiveRootTextBox.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(inputBg));
            ArchiveRootTextBox.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(text));
            ArchiveRootTextBox.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(inputBorder));
        }

        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            ConfigManager.BaseUrl = BaseUrlTextBox.Text.Trim();
            ConfigManager.ArchiveRoot = ArchiveRootTextBox.Text.Trim();
            ConfigManager.Save();
            StatusText.Text = "Settings saved successfully!";
            StatusText.Visibility = Visibility.Visible;
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }
}
