using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace ArcLayoutSentinel.Services
{
    /// <summary>
    /// Pre-Flight Heartbeat Service - Verifies all dependencies before write operations.
    /// Constitution: "Pre-Flight First" - Always verify API and UNC connectivity before writes.
    /// </summary>
    public static class PreFlightService
    {
        public class PreFlightResult
        {
            public bool ApiReachable { get; set; }
            public bool TokenValid { get; set; }
            public bool UncPathWritable { get; set; }
            public string ApiError { get; set; }
            public string TokenError { get; set; }
            public string UncError { get; set; }

            public bool AllPassed => ApiReachable && TokenValid && UncPathWritable;

            public string GetSummary()
            {
                if (AllPassed) return "All pre-flight checks passed.";

                var sb = new System.Text.StringBuilder();
                sb.AppendLine("Pre-flight check failed:");
                if (!ApiReachable) sb.AppendLine($"  • API Unreachable: {ApiError}");
                if (!TokenValid) sb.AppendLine($"  • Token Invalid: {TokenError}");
                if (!UncPathWritable) sb.AppendLine($"  • UNC Path Error: {UncError}");
                return sb.ToString();
            }
        }

        /// <summary>
        /// Performs full pre-flight check: API connectivity, Token validity, and UNC write access.
        /// </summary>
        public static async Task<PreFlightResult> RunPreFlightCheckAsync()
        {
            var result = new PreFlightResult();

            // Check 1: API Reachability
            try
            {
                using (var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) })
                {
                    var response = await client.GetAsync($"{ConfigManager.BaseUrl}/health");
                    result.ApiReachable = response.IsSuccessStatusCode;
                    if (!result.ApiReachable)
                    {
                        result.ApiError = $"HTTP {(int)response.StatusCode}";
                    }
                }
            }
            catch (TaskCanceledException)
            {
                result.ApiReachable = false;
                result.ApiError = "Connection timeout (5s)";
            }
            catch (HttpRequestException ex)
            {
                result.ApiReachable = false;
                result.ApiError = ex.Message;
            }
            catch (Exception ex)
            {
                result.ApiReachable = false;
                result.ApiError = $"{ex.GetType().Name}: {ex.Message}";
            }

            // Check 2: Token Validity (skip if API is unreachable)
            if (result.ApiReachable)
            {
                try
                {
                    using (var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) })
                    {
                        client.DefaultRequestHeaders.Authorization =
                            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ConfigManager.ApiToken);

                        var response = await client.GetAsync($"{ConfigManager.BaseUrl}/users/me");
                        result.TokenValid = response.IsSuccessStatusCode;
                        if (!result.TokenValid)
                        {
                            result.TokenError = $"HTTP {(int)response.StatusCode} - Token may be expired";
                        }
                    }
                }
                catch (Exception ex)
                {
                    result.TokenValid = false;
                    result.TokenError = ex.Message;
                }
            }
            else
            {
                result.TokenValid = false;
                result.TokenError = "Skipped - API unreachable";
            }

            // Check 3: UNC Path Writable
            try
            {
                string testPath = Path.Combine(ConfigManager.ArchiveRoot, $".preflight_test_{Guid.NewGuid()}.tmp");
                // Try to create and immediately delete a test file
                using (File.Create(testPath)) { }
                File.Delete(testPath);
                result.UncPathWritable = true;
            }
            catch (UnauthorizedAccessException)
            {
                result.UncPathWritable = false;
                result.UncError = "Access denied - check permissions";
            }
            catch (DirectoryNotFoundException)
            {
                result.UncPathWritable = false;
                result.UncError = "Archive path does not exist";
            }
            catch (IOException ex)
            {
                result.UncPathWritable = false;
                result.UncError = $"IO Error: {ex.Message}";
            }
            catch (Exception ex)
            {
                result.UncPathWritable = false;
                result.UncError = $"{ex.GetType().Name}: {ex.Message}";
            }

            return result;
        }

        /// <summary>
        /// Quick check for the UI - just API connectivity.
        /// </summary>
        public static async Task<(bool reachable, string error)> CheckApiReachableAsync()
        {
            try
            {
                using (var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) })
                {
                    var response = await client.GetAsync($"{ConfigManager.BaseUrl}/health");
                    return (response.IsSuccessStatusCode, null);
                }
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }
    }
}
