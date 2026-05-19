using System;
using System.IO;
using System.Text.Json;
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

        public static void SaveToProject()
        {
            try
            {
                var project = ArcGIS.Desktop.Core.Project.Current;
                if (project != null)
                {
                    project.SetCustomProperty("Sentinel_BaseUrl", BaseUrl);
                    project.SetCustomProperty("Sentinel_ArchiveRoot", ArchiveRoot);
                    project.SetCustomProperty("Sentinel_ApiToken", ApiToken);
                    project.SetCustomProperty("Sentinel_LastUsername", LastUsername);
                    project.SetCustomProperty("Sentinel_SessionId", SessionId);
                    project.SetCustomProperty("Sentinel_SessionCreatedAt", SessionCreatedAt?.ToString("o") ?? "");
                    project.SetCustomProperty("Sentinel_SessionExpiresAt", SessionExpiresAt?.ToString("o") ?? "");
                    System.Diagnostics.Debug.WriteLine("ConfigManager: Settings saved to project.");
                }
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
                var project = ArcGIS.Desktop.Core.Project.Current;
                if (project != null)
                {
                    var baseUrl = project.GetCustomProperty("Sentinel_BaseUrl") as string;
                    if (!string.IsNullOrEmpty(baseUrl)) BaseUrl = baseUrl;

                    var archiveRoot = project.GetCustomProperty("Sentinel_ArchiveRoot") as string;
                    if (!string.IsNullOrEmpty(archiveRoot)) ArchiveRoot = archiveRoot;

                    var apiToken = project.GetCustomProperty("Sentinel_ApiToken") as string;
                    if (!string.IsNullOrEmpty(apiToken)) ApiToken = apiToken;

                    var lastUsername = project.GetCustomProperty("Sentinel_LastUsername") as string;
                    if (!string.IsNullOrEmpty(lastUsername)) LastUsername = lastUsername;

                    var sessionId = project.GetCustomProperty("Sentinel_SessionId") as string;
                    if (!string.IsNullOrEmpty(sessionId)) SessionId = sessionId;

                    var createdAtStr = project.GetCustomProperty("Sentinel_SessionCreatedAt") as string;
                    if (DateTime.TryParse(createdAtStr, out var createdAt)) SessionCreatedAt = createdAt;

                    var expiresAtStr = project.GetCustomProperty("Sentinel_SessionExpiresAt") as string;
                    if (DateTime.TryParse(expiresAtStr, out var expiresAt)) SessionExpiresAt = expiresAt;

                    System.Diagnostics.Debug.WriteLine("ConfigManager: Settings loaded from project.");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"ConfigManager.LoadFromProject failed: {ex.Message}");
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