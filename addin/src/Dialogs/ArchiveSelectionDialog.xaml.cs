using System.Windows;

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

        public ArchiveSelectionDialog()
        {
            InitializeComponent();
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