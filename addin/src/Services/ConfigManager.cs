using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ArcGIS.Desktop.Core;

namespace ArcLayoutSentinel.Services
{
    public static class ConfigManager
    {
        public static string BaseUrl { get; set; } = "http://localhost:8000/api/v1";
        // F3: Removed hardcoded internal UNC path. Users must configure this explicitly.
        public static string ArchiveRoot { get; set; } = "";
        public static string ApiToken { get; set; } = "";
        public static string LastUsername { get; set; } = "";

        public static string SessionId { get; set; } = "";
        public static string MachineId { get; set; } = "";
        public static DateTime? SessionCreatedAt { get; set; }
        public static DateTime? SessionExpiresAt { get; set; }

        private static string ConfigPath => Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "ArcLayoutSentinel", "config.json");

        // F1: DPAPI entropy for token protection — scoped to this application.
        private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("ArcLayoutSentinel.TokenProtection.v1");

        /// <summary>Encrypts plaintext using Windows DPAPI (CurrentUser scope).</summary>
        private static string Protect(string plainText)
        {
            if (string.IsNullOrEmpty(plainText)) return "";
            var encrypted = ProtectedData.Protect(
                Encoding.UTF8.GetBytes(plainText), Entropy, DataProtectionScope.CurrentUser);
            return Convert.ToBase64String(encrypted);
        }

        /// <summary>
        /// Decrypts a DPAPI-protected value. Falls back to plainText to
        /// transparently upgrade legacy plaintext configs on next save.
        /// </summary>
        private static string Unprotect(string protectedText)
        {
            if (string.IsNullOrEmpty(protectedText)) return "";
            try
            {
                var decrypted = ProtectedData.Unprotect(
                    Convert.FromBase64String(protectedText), Entropy, DataProtectionScope.CurrentUser);
                return Encoding.UTF8.GetString(decrypted);
            }
            catch
            {
                // Legacy plaintext value — return as-is; will be re-encrypted on next Save().
                return protectedText;
            }
        }

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
                        // F1: Decrypt stored token via DPAPI.
                        if (!string.IsNullOrEmpty(config.ApiToken)) ApiToken = Unprotect(config.ApiToken);
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
                    // F1: Encrypt the API token before writing to disk.
                    ApiToken = Protect(ApiToken),
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

                // F2: Only write non-sensitive fields to shared project config.
                // ApiToken, SessionId, MachineId, and timestamps are intentionally omitted.
                var config = new ConfigSettings
                {
                    BaseUrl = BaseUrl,
                    ArchiveRoot = ArchiveRoot,
                    LastUsername = LastUsername
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
                    // F2: ApiToken and SessionId are never stored in project files; skip them.
                    if (!string.IsNullOrEmpty(config.LastUsername)) LastUsername = config.LastUsername;
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