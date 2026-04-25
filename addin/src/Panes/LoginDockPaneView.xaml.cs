using System.Windows;
using System.Windows.Controls;

namespace ArcLayoutSentinel.Panes
{
    public partial class LoginDockPaneView : UserControl
    {
        public LoginDockPaneView()
        {
            InitializeComponent();
        }

        private void PasswordBox_PasswordChanged(object sender, RoutedEventArgs e)
        {
            if (DataContext is LoginDockPaneViewModel vm)
            {
                vm.Password = ((PasswordBox)sender).Password;
            }
        }
    }
}
