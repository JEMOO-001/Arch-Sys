using ArcGIS.Desktop.Framework;
using Microsoft.Win32;
using System.Windows;
using System.Windows.Media;

namespace ArcLayoutSentinel.Services
{
    public static class ThemeHelper
    {
        public static bool IsDarkTheme()
        {
            try
            {
                if (FrameworkApplication.ApplicationTheme == ApplicationTheme.Dark)
                    return true;

                using var key = Registry.CurrentUser.OpenSubKey(
                    @"SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize");
                var value = key?.GetValue("AppsUseLightTheme");
                return value is int intValue && intValue == 0;
            }
            catch { return false; }
        }

        /// <summary>
        /// Apply light/dark colors to all Sentinel.* brush resources on a FrameworkElement.
        /// Call after InitializeComponent in each dialog's constructor.
        /// </summary>
        public static void ApplyTheme(FrameworkElement element)
        {
            bool isDark = IsDarkTheme();
            var resources = element.Resources;

            // ArcGIS Sentinel Design System Colors
            SetBrush(resources, "Sentinel.WindowBackground",      isDark ? "#1E1E1E" : "#FFFFFF"); // --dark-bg-primary / --light-bg-primary
            SetBrush(resources, "Sentinel.SurfaceBackground",     isDark ? "#2D2D30" : "#F8F9FA"); // --dark-surface / --light-bg-secondary
            SetBrush(resources, "Sentinel.InputBackground",       isDark ? "#252526" : "#FFFFFF"); // --dark-bg-secondary / --light-surface
            SetBrush(resources, "Sentinel.CardBackground",        isDark ? "#2D2D30" : "#FFFFFF"); // --dark-surface / --light-surface
            SetBrush(resources, "Sentinel.BorderBrush",           isDark ? "#3E3E42" : "#D1D5DB"); // --dark-border / --light-border
            SetBrush(resources, "Sentinel.InputBorderBrush",      isDark ? "#464647" : "#E5E7EB"); // --dark-border-subtle / --light-border-subtle
            SetBrush(resources, "Sentinel.TextPrimary",           isDark ? "#E8E8E8" : "#1F2937"); // --dark-text-primary / --light-text-primary
            SetBrush(resources, "Sentinel.TextSecondary",         isDark ? "#A0A0A0" : "#4B5563"); // --dark-text-secondary / --light-text-secondary
            SetBrush(resources, "Sentinel.TextMuted",             isDark ? "#6E6E6E" : "#9CA3AF"); // --dark-text-muted / --light-text-muted
            SetBrush(resources, "Sentinel.TextOnAccent",          "#FFFFFF");
            SetBrush(resources, "Sentinel.AccentBrush",           isDark ? "#3B82F6" : "#2563EB"); // --primary-500 / --primary-600
            SetBrush(resources, "Sentinel.AccentOrange",          "#D97706"); // --warning
            SetBrush(resources, "Sentinel.SuccessBrush",          isDark ? "#34D399" : "#059669"); // --success
            SetBrush(resources, "Sentinel.ErrorBrush",            isDark ? "#F87171" : "#DC2626"); // --error
            SetBrush(resources, "Sentinel.WarningBrush",          "#D97706"); // --warning
            SetBrush(resources, "Sentinel.CancelButtonBackground", isDark ? "#3E3E42" : "#F3F4F6"); // --dark-surface-hover / --light-bg-tertiary
            SetBrush(resources, "Sentinel.CancelButtonForeground", isDark ? "#E8E8E8" : "#4B5563"); // --dark-text-primary / --light-text-secondary
            SetBrush(resources, "Sentinel.HoverBrush",             isDark ? "#3E3E42" : "#F5F6F7"); // --dark-surface-hover / --light-surface-hover
            SetBrush(resources, "Sentinel.SelectedBrush",          isDark ? "#1E3A8A" : "#DBEAFE"); // --primary-900 / --primary-100
            SetBrush(resources, "Sentinel.LoginBackground",        isDark ? "#1E1E1E" : "#FFFFFF");
            SetBrush(resources, "Sentinel.LoginInputBackground",   isDark ? "#2D2D30" : "#F9FAFB");
            SetBrush(resources, "Sentinel.LoginInputBorder",       isDark ? "#3E3E42" : "#D1D5DB");
            SetBrush(resources, "Sentinel.LoginButtonBackground",  isDark ? "#2563EB" : "#3B82F6");
        }

        private static void SetBrush(ResourceDictionary resources, string key, string hexColor)
        {
            try
            {
                var color = (Color)ColorConverter.ConvertFromString(hexColor);
                var newBrush = new SolidColorBrush(color);
                
                // If it's a frozen resource from a MergedDictionary, we might need to look deeper
                // but generally setting the key on the element's local dictionary works.
                if (resources.Contains(key))
                {
                    resources[key] = newBrush;
                }
                else
                {
                    // If not in local, check merged
                    foreach (var dict in resources.MergedDictionaries)
                    {
                        if (dict.Contains(key))
                        {
                            try { dict[key] = newBrush; return; } catch { /* dict is read-only */ }
                        }
                    }
                    // If all else fails, just add to local to override
                    resources[key] = newBrush;
                }
            }
            catch { /* Ignore theme errors to prevent app crash */ }
        }

        public static Brush FindBrush(FrameworkElement element, string key)
        {
            return element.FindResource(key) as Brush;
        }

        public static class Colors
        {
            public static Color Background => IsDarkTheme() ? DarkBackground : LightBackground;
            public static Color Surface => IsDarkTheme() ? DarkSurface : LightSurface;
            public static Color Border => IsDarkTheme() ? DarkBorder : LightBorder;
            public static Color TextPrimary => IsDarkTheme() ? DarkTextPrimary : LightTextPrimary;
            public static Color TextSecondary => IsDarkTheme() ? DarkTextSecondary : LightTextSecondary;

            public static Color LightBackground => (Color)ColorConverter.ConvertFromString("#F3F3F3");
            public static Color LightSurface => (Color)ColorConverter.ConvertFromString("#FFFFFF");
            public static Color LightBorder => (Color)ColorConverter.ConvertFromString("#D9D9D9");
            public static Color LightTextPrimary => (Color)ColorConverter.ConvertFromString("#1A1A1A");
            public static Color LightTextSecondary => (Color)ColorConverter.ConvertFromString("#4A4A4A");
            public static Color DarkTextPrimary => (Color)ColorConverter.ConvertFromString("#FFFFFF");
            public static Color DarkTextSecondary => (Color)ColorConverter.ConvertFromString("#AAAAAA");
            public static Color DarkBackground => (Color)ColorConverter.ConvertFromString("#202020");
            public static Color DarkSurface => (Color)ColorConverter.ConvertFromString("#2D2D2D");
            public static Color DarkBorder => (Color)ColorConverter.ConvertFromString("#404040");
        }
    }
}
