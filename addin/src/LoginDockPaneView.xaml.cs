using System.Windows;
using System.Windows.Controls;

namespace ArcLayoutSentinel
{
    public partial class LoginDockPaneView : UserControl
    {
        public LoginDockPaneView()
        {
            InitializeComponent();

            this.Loaded += (s, e) =>
            {
                if (this.DataContext == null)
                {
                    this.DataContext = new LoginDockPaneViewModel();
                }
            };
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