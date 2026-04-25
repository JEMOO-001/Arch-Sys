using System;
using System.IO;
using System.Text.Json;

namespace ArcLayoutSentinel.Services
{
    public static class ConfigManager
    {
        public static string BaseUrl { get; set; } = "http://localhost:8000";
        public static string ArchiveRoot { get; set; } = @"\\172.20.0.125\e\LTest";
        public static string ApiToken { get; set; } = "";
        public static string LastUsername { get; set; } = "";

        private static string ConfigPath => Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "ArcLayoutSentinel",
            "config.json"
        );

        public static void Load()
        {
            try
            {
                if (File.Exists(ConfigPath))
                {
                    var json = File.ReadAllText(ConfigPath);
                    var config = JsonSerializer.Deserialize<ConfigSettings>(json);
                    BaseUrl = config.BaseUrl ?? BaseUrl;
                    ArchiveRoot = config.ArchiveRoot ?? ArchiveRoot;
                    ApiToken = config.ApiToken ?? ApiToken;
                    LastUsername = config.LastUsername ?? LastUsername;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"ConfigManager.Load failed: {ex.GetType().Name} - {ex.Message}");
            }
        }

        public static void Save()
        {
            try
            {
                var directory = Path.GetDirectoryName(ConfigPath);
                if (!Directory.Exists(directory))
                    Directory.CreateDirectory(directory);

                var config = new ConfigSettings
                {
                    BaseUrl = BaseUrl,
                    ArchiveRoot = ArchiveRoot,
                    ApiToken = ApiToken,
                    LastUsername = LastUsername
                };
                File.WriteAllText(ConfigPath, JsonSerializer.Serialize(config));
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"ConfigManager.Save failed: {ex.GetType().Name} - {ex.Message}");
            }
        }

        private class ConfigSettings
        {
            public string BaseUrl { get; set; }
            public string ArchiveRoot { get; set; }
            public string ApiToken { get; set; }
            public string LastUsername { get; set; }
        }
    }
}
