using Microsoft.Win32;
using System.Windows;

namespace ArcLayoutSentinel.Dialogs
{
    public static class ThemeHelper
    {
        public static bool IsDarkTheme()
        {
            try
            {
                using var key = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize");
                var value = key?.GetValue("AppsUseLightTheme");
                return value is int intValue && intValue == 0;
            }
            catch
            {
                return false;
            }
        }

        public static class Colors
        {
            public static System.Windows.Media.Color Background => IsDarkTheme() ? DarkBackground : LightBackground;
            public static System.Windows.Media.Color Surface => IsDarkTheme() ? DarkSurface : LightSurface;
            public static System.Windows.Media.Color Border => IsDarkTheme() ? DarkBorder : LightBorder;
            public static System.Windows.Media.Color TextPrimary => IsDarkTheme() ? DarkTextPrimary : LightTextPrimary;
            public static System.Windows.Media.Color TextSecondary => IsDarkTheme() ? DarkTextSecondary : LightTextSecondary;
            public static System.Windows.Media.Color TextDark => IsDarkTheme() ? LightTextPrimary : DarkTextPrimary;
            public static System.Windows.Media.Color Hover => IsDarkTheme() ? DarkHover : LightHover;
            public static System.Windows.Media.Color Selected => IsDarkTheme() ? DarkSelected : LightSelected;
            public static System.Windows.Media.Color InputBackground => IsDarkTheme() ? DarkInputBackground : LightInputBackground;

            public static System.Windows.Media.Color LightBackground => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#F3F3F3");
            public static System.Windows.Media.Color LightSurface => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#FFFFFF");
            public static System.Windows.Media.Color LightBorder => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#D9D9D9");
            public static System.Windows.Media.Color LightTextPrimary => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#1A1A1A");
            public static System.Windows.Media.Color LightTextSecondary => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#4A4A4A");
            public static System.Windows.Media.Color DarkTextPrimary => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#FFFFFF");
            public static System.Windows.Media.Color DarkTextSecondary => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#AAAAAA");
            public static System.Windows.Media.Color LightHover => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#E6E6E6");
            public static System.Windows.Media.Color DarkHover => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#3A3A3A");
public static System.Windows.Media.Color LightSelected => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#E6F2FF");
            public static System.Windows.Media.Color DarkSelected => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#1A3A5C");
            public static System.Windows.Media.Color LightInputBackground => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#FFFFFF");

            public static System.Windows.Media.Color DarkBackground => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#202020");
            public static System.Windows.Media.Color DarkSurface => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#2D2D2D");
            public static System.Windows.Media.Color DarkBorder => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#404040");
            public static System.Windows.Media.Color DarkInputBackground => (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#383838");
        }
    }
}