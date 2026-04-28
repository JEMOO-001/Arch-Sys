using System;
using System.Windows.Input;

namespace ArcLayoutSentinel
{
    public class RelayCommand : ICommand
    {
        private readonly Action _execute;
        private readonly Func<System.Threading.Tasks.Task> _executeAsync;
        private readonly Func<bool> _canExecute;

        public RelayCommand(Action execute, Func<bool> canExecute = null)
        {
            _execute = execute ?? throw new ArgumentNullException(nameof(execute));
            _canExecute = canExecute;
            _executeAsync = null;
        }

        public RelayCommand(Func<System.Threading.Tasks.Task> executeAsync, Func<bool> canExecute = null)
        {
            _executeAsync = executeAsync ?? throw new ArgumentNullException(nameof(executeAsync));
            _canExecute = canExecute;
            _execute = null;
        }

        public event EventHandler CanExecuteChanged
        {
            add { CommandManager.RequerySuggested += value; }
            remove { CommandManager.RequerySuggested -= value; }
        }

        public bool CanExecute(object parameter) => _canExecute?.Invoke() ?? true;

        public async void Execute(object parameter)
        {
            if (_execute != null) _execute();
            else if (_executeAsync != null) await _executeAsync();
        }
    }
}