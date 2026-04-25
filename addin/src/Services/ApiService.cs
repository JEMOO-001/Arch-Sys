using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace ArcLayoutSentinel.Services
{
    public class ApiService
    {
        private static readonly HttpClient _client = new HttpClient()
        {
            Timeout = TimeSpan.FromSeconds(30)
        };

        public static async Task<(string id, string error)> GetGenerateIdAsync(string prefix)
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"{ConfigManager.BaseUrl}/maps/next-id?prefix={prefix}");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ConfigManager.ApiToken);

                var response = await _client.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadAsStringAsync();
                    using (var doc = JsonDocument.Parse(result))
                    {
                        var id = doc.RootElement.GetProperty("next_id").GetString();
                        return (id, null);
                    }
                }

                var errorBody = await response.Content.ReadAsStringAsync();
                return (null, $"HTTP {(int)response.StatusCode}: {errorBody}");
            }
            catch (TaskCanceledException)
            {
                return (null, "Request timed out (30s). Is the API server running?");
            }
            catch (HttpRequestException ex)
            {
                return (null, $"Network error: {ex.Message}");
            }
            catch (Exception ex)
            {
                return (null, $"{ex.GetType().Name}: {ex.Message}");
            }
        }

        public static async Task<(bool success, string error)> ArchiveMapAsync(object mapMetadata)
        {
            try
            {
                var json = JsonSerializer.Serialize(mapMetadata);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var request = new HttpRequestMessage(HttpMethod.Post, $"{ConfigManager.BaseUrl}/maps/");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ConfigManager.ApiToken);
                request.Content = content;

                var response = await _client.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    return (true, string.Empty);
                }

                var error = await response.Content.ReadAsStringAsync();
                return (false, $"HTTP {(int)response.StatusCode}: {error}");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }
    }
}
