using System;
using System.IO;
using System.Text.Json;
using ArcGIS.Desktop.Core;

namespace ArcLayoutSentinel.Services
{
    public static class ConfigManager
    {
        public static string BaseUrl { get; set; } = "http://172.20.1.24:8000/api/v1";
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
                        if (!string.IsNullOrEmpty(config.BaseUrl)) BaseUrl = config.BaseUrl;
                        if (!string.IsNullOrEmpty(config.ArchiveRoot)) ArchiveRoot = config.ArchiveRoot;
                        if (!string.IsNullOrEmpty(config.ApiToken)) ApiToken = config.ApiToken;
                        if (!string.IsNullOrEmpty(config.LastUsername)) LastUsername = config.LastUsername;
                        if (!string.IsNullOrEmpty(config.SessionId)) SessionId = config.SessionId;
                        if (!string.IsNullOrEmpty(config.MachineId)) MachineId = config.MachineId;
                        if (config.SessionCreatedAt.HasValue) SessionCreatedAt = config.SessionCreatedAt;
                        if (config.SessionExpiresAt.HasValue) SessionExpiresAt = config.SessionExpiresAt;
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

        public static void SaveToProject()
        {
            try
            {
                var path = GetProjectConfigPath();
                if (path == null) return;

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
                File.WriteAllText(path, JsonSerializer.Serialize(config));
                System.Diagnostics.Debug.WriteLine($"ConfigManager: Settings saved to {path}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"ConfigManager.SaveToProject failed: {ex.Message}");
            }
        }

        public static void LoadFromProject()
        {
            try
            {
                var path = GetProjectConfigPath();
                if (path == null || !File.Exists(path)) return;

                var json = File.ReadAllText(path);
                var config = JsonSerializer.Deserialize<ConfigSettings>(json);
                if (config != null)
                {
                    if (!string.IsNullOrEmpty(config.BaseUrl)) BaseUrl = config.BaseUrl;
                    if (!string.IsNullOrEmpty(config.ArchiveRoot)) ArchiveRoot = config.ArchiveRoot;
                    if (!string.IsNullOrEmpty(config.ApiToken)) ApiToken = config.ApiToken;
                    if (!string.IsNullOrEmpty(config.LastUsername)) LastUsername = config.LastUsername;
                    if (!string.IsNullOrEmpty(config.SessionId)) SessionId = config.SessionId;
                    if (config.SessionCreatedAt.HasValue) SessionCreatedAt = config.SessionCreatedAt;
                    if (config.SessionExpiresAt.HasValue) SessionExpiresAt = config.SessionExpiresAt;
                    System.Diagnostics.Debug.WriteLine($"ConfigManager: Settings loaded from {path}");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"ConfigManager.LoadFromProject failed: {ex.Message}");
            }
        }

        private static string GetProjectConfigPath()
        {
            try
            {
                var project = ArcGIS.Desktop.Core.Project.Current;
                if (project == null || string.IsNullOrEmpty(project.URI)) return null;
                
                var projectFolder = Path.GetDirectoryName(project.URI);
                if (string.IsNullOrEmpty(projectFolder)) return null;

                return Path.Combine(projectFolder, ".sentinel_config");
            }
            catch { return null; }
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