using System.Windows;
using ArcLayoutSentinel.Services;

namespace ArcLayoutSentinel.Views
{
    public partial class ArchiveSelectionDialog : Window
    {
        public enum SelectionResult { None, CreateNew, EditExisting }
        public SelectionResult Result { get; private set; } = SelectionResult.None;

        public ArchiveSelectionDialog()
        {
            InitializeComponent();
            ThemeHelper.ApplyTheme(this);
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
