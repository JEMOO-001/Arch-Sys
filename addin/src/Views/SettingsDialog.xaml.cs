using System.Windows;
using ArcLayoutSentinel.Services;

namespace ArcLayoutSentinel.Views
{
    public partial class SettingsDialog : Window
    {
        public SettingsDialog()
        {
            InitializeComponent();
            ThemeHelper.ApplyTheme(this);
            ConfigManager.Load();
            BaseUrlTextBox.Text = ConfigManager.BaseUrl;
            ArchiveRootTextBox.Text = ConfigManager.ArchiveRoot;
        }

        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
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
