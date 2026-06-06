using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using ArcLayoutSentinel.Models;

namespace ArcLayoutSentinel.Services
{
    public static class PreFlightService
    {
        private static string GetHealthUrl()
        {
            try
            {
                var uri = new Uri(ConfigManager.BaseUrl);
                return $"{uri.Scheme}://{uri.Authority}/health";
            }
            catch
            {
                return "http://172.20.0.149:8000/health";
            }
        }

        public static async Task<PreFlightResult> RunPreFlightCheckAsync()
        {
            var result = new PreFlightResult();

            try
            {
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
                var response = await client.GetAsync(GetHealthUrl());
                result.ApiReachable = response.IsSuccessStatusCode;
                if (!result.ApiReachable) result.ApiError = $"HTTP {(int)response.StatusCode}";
            }
            catch (Exception ex) { result.ApiReachable = false; result.ApiError = $"{ex.GetType().Name}: {ex.Message}"; }

            if (result.ApiReachable)
            {
                try
                {
                    using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
                    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ConfigManager.ApiToken);
                    var response = await client.GetAsync($"{ConfigManager.BaseUrl}/users/me");
                    result.TokenValid = response.IsSuccessStatusCode;
                    if (!result.TokenValid) result.TokenError = "Token expired or invalid";
                }
                catch (Exception ex) { result.TokenValid = false; result.TokenError = ex.Message; }
            }
            else { result.TokenValid = false; result.TokenError = "Skipped - API unreachable"; }

            try
            {
                string testPath = Path.Combine(ConfigManager.ArchiveRoot, $".preflight_test_{Guid.NewGuid()}.tmp");
                using (File.Create(testPath)) { }
                File.Delete(testPath);
                result.UncPathWritable = true;
            }
            catch (Exception ex) { result.UncPathWritable = false; result.UncError = $"{ex.GetType().Name}: {ex.Message}"; }

            return result;
        }

        public static async Task<(bool reachable, string error)> CheckApiReachableAsync()
        {
            try
            {
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
                var response = await client.GetAsync(GetHealthUrl());
                return (response.IsSuccessStatusCode, null);
            }
            catch (Exception ex) { return (false, ex.Message); }
        }
    }
}