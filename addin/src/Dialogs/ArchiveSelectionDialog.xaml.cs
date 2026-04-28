using System.Windows;
using System.Windows.Media;

namespace ArcLayoutSentinel.Dialogs
{
    public partial class ArchiveSelectionDialog : Window
    {
        public enum SelectionResult
        {
            None,
            CreateNew,
            EditExisting
        }

        public SelectionResult Result { get; private set; } = SelectionResult.None;

        public Brush BackgroundBrush => new SolidColorBrush(ThemeHelper.Colors.Background);
        public Brush SurfaceBrush => new SolidColorBrush(ThemeHelper.Colors.Surface);
        public Brush BorderBrush => new SolidColorBrush(ThemeHelper.Colors.Border);
        public Brush TextPrimaryBrush => new SolidColorBrush(ThemeHelper.Colors.TextPrimary);
        public Brush TextSecondaryBrush => new SolidColorBrush(ThemeHelper.Colors.TextSecondary);

        public ArchiveSelectionDialog()
        {
            InitializeComponent();
            ApplyTheme();
        }

        private void ApplyTheme()
        {
            MainGrid.Background = BackgroundBrush;
            HeaderBorder.Background = SurfaceBrush;
            HeaderBorder.BorderBrush = BorderBrush;
        }

        private void CreateNewButton_Click(object sender, RoutedEventArgs e)
        {
            Result = SelectionResult.CreateNew;
            DialogResult = true;
            Close();
        }

        private void EditExistingButton_Click(object sender, RoutedEventArgs e)
        {
            Result = SelectionResult.EditExisting;
            DialogResult = true;
            Close();
        }
    }
}