using System.Windows;
using System.Windows.Controls;
using System.Diagnostics;

namespace ArcLayoutSentinel.Panes
{
    /// <summary>
    /// Interaction logic for LoginDockPaneView.xaml
    /// </summary>
    public partial class LoginDockPaneView : UserControl
    {
        public LoginDockPaneView()
        {
            Debug.WriteLine("=== LoginDockPaneView Constructor ===");
            InitializeComponent();

            // CRITICAL: Ensure DataContext is set to ViewModel
            this.Loaded += (s, e) =>
            {
                if (this.DataContext == null)
                {
                    Debug.WriteLine("LoginDockPaneView: DataContext is NULL - setting manually");
                    this.DataContext = new LoginDockPaneViewModel();
                }
                else
                {
                    Debug.WriteLine($"LoginDockPaneView: DataContext already set to {this.DataContext.GetType().Name}");
                }
            };
        }

        private void PasswordBox_PasswordChanged(object sender, RoutedEventArgs e)
        {
            if (DataContext is LoginDockPaneViewModel vm)
            {
                vm.Password = ((PasswordBox)sender).Password;
                Debug.WriteLine("Password updated in ViewModel");
            }
        }
    }
}
