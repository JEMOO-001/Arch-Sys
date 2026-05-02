using System;
using System.IO;
using System.Text.Json;
using ArcLayoutSentinel.Services;

namespace ArcLayoutSentinel.Services
{
    public static class ConfigManager
    {
        public static string BaseUrl { get; set; } = "http://localhost:8000/api/v1";
        public static string ArchiveRoot { get; set; } = @"\\172.20.0.125\e\LTest";
        public static string ApiToken { get; set; } = "";
        public static string LastUsername { get; set; } = "";

        public static string SessionId { get; set; } = "";
        public static string MachineId { get; set; } = "";
        public static DateTime? SessionCreatedAt { get; set; }
        public static DateTime? SessionExpiresAt { get; set; }

        private static string ConfigPath => Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "ArcLayoutSentinel", "config.json");

        private static string SessionFilePath => Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ArcLayoutSentinel", "session.json");

        public static void Load()
        {
            try
            {
                if (File.Exists(ConfigPath))
                {
                    var json = File.ReadAllText(ConfigPath);
                    var config = JsonSerializer.Deserialize<ConfigSettings>(json);
                    if (config != null)
                    {
                        BaseUrl = config.BaseUrl ?? BaseUrl;
                        ArchiveRoot = config.ArchiveRoot ?? ArchiveRoot;
                        ApiToken = config.ApiToken ?? ApiToken;
                        LastUsername = config.LastUsername ?? LastUsername;
                        SessionId = config.SessionId ?? "";
                        MachineId = config.MachineId ?? "";
                        SessionCreatedAt = config.SessionCreatedAt;
                        SessionExpiresAt = config.SessionExpiresAt;
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"ConfigManager.Load failed: {ex.Message}");
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
                    LastUsername = LastUsername,
                    SessionId = SessionId,
                    MachineId = MachineId,
                    SessionCreatedAt = SessionCreatedAt,
                    SessionExpiresAt = SessionExpiresAt
                };
                File.WriteAllText(ConfigPath, JsonSerializer.Serialize(config));
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"ConfigManager.Save failed: {ex.Message}");
            }
        }

        public static void ClearSession()
        {
            SessionId = "";
            MachineId = "";
            SessionCreatedAt = null;
            SessionExpiresAt = null;
            ApiToken = "";
            Save();
        }

        public static string GetMachineId()
        {
            if (string.IsNullOrEmpty(MachineId))
            {
                MachineId = Environment.MachineName + "_" + Environment.UserName;
            }
            return MachineId;
        }

        public static bool IsSessionValid()
        {
            if (string.IsNullOrEmpty(ApiToken))
                return false;

            if (SessionExpiresAt.HasValue && SessionExpiresAt.Value < DateTime.UtcNow)
                return false;

            if (string.IsNullOrEmpty(SessionId))
                return false;

            return true;
        }

        private class ConfigSettings
        {
            public string BaseUrl { get; set; }
            public string ArchiveRoot { get; set; }
            public string ApiToken { get; set; }
            public string LastUsername { get; set; }
            public string SessionId { get; set; }
            public string MachineId { get; set; }
            public DateTime? SessionCreatedAt { get; set; }
            public DateTime? SessionExpiresAt { get; set; }
        }
    }
}