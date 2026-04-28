using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace ArcLayoutSentinel.Services
{
    public class CategoryInfo
    {
        public int category_id { get; set; }
        public string name { get; set; }
        public string prefix { get; set; }
        public string description { get; set; }
    }

    public class MapInfo
    {
        public int MapId { get; set; }
        public string UniqueId { get; set; }
        public string LayoutName { get; set; }
        public string ProjectPath { get; set; }
        public string ProjectName { get; set; }
        public string Category { get; set; }
        public string IncomeNum { get; set; }
        public string OutcomeNum { get; set; }
        public string ToWhom { get; set; }
        public string Status { get; set; }
        public string Comment { get; set; }
        public string FilePath { get; set; }
        public int AnalystId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class ApiService
    {
        private static readonly HttpClient _client = new() { Timeout = TimeSpan.FromSeconds(30) };

        public static async Task<List<CategoryInfo>> GetCategoriesAsync()
        {
            var categories = new List<CategoryInfo>();
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"{ConfigManager.BaseUrl}/categories/");
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ConfigManager.ApiToken);

                var response = await _client.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(result);
                    foreach (var item in doc.RootElement.EnumerateArray())
                    {
                        categories.Add(new CategoryInfo
                        {
                            category_id = item.GetProperty("category_id").GetInt32(),
                            name = item.GetProperty("name").GetString(),
                            prefix = item.GetProperty("prefix").GetString(),
                            description = item.TryGetProperty("description", out var desc) ? desc.GetString() : null
                        });
                    }
                }
            }
            catch { }
            return categories;
        }

        public static async Task<(string id, string error)> GetGenerateIdAsync(string prefix)
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"{ConfigManager.BaseUrl}/maps/next-id?prefix={prefix}");
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ConfigManager.ApiToken);

                var response = await _client.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(result);
                    var id = doc.RootElement.GetProperty("next_id").GetString();
                    return (id, null);
                }

                var errorBody = await response.Content.ReadAsStringAsync();
                return (null, $"HTTP {(int)response.StatusCode}: {errorBody}");
            }
            catch (TaskCanceledException) { return (null, "Request timed out (30s)."); }
            catch (HttpRequestException ex) { return (null, $"Network error: {ex.Message}"); }
            catch (Exception ex) { return (null, $"{ex.GetType().Name}: {ex.Message}"); }
        }

        public static async Task<(bool success, string token, string error)> LoginAsync(string username, string password)
        {
            try
            {
                var formData = new System.Collections.Generic.Dictionary<string, string>
                {
                    { "username", username },
                    { "password", password }
                };
                var content = new FormUrlEncodedContent(formData);

                var response = await _client.PostAsync($"{ConfigManager.BaseUrl}/auth/login", content);

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("access_token", out var tokenElement))
                        return (true, tokenElement.GetString(), null);
                    return (false, null, "Invalid server response: access_token missing");
                }

                var errorBody = await response.Content.ReadAsStringAsync();
                return (false, null, $"Login failed: {response.StatusCode} - {errorBody}");
            }
            catch (Exception ex) { return (false, null, ex.Message); }
        }

        public static async Task<(bool success, string error)> ArchiveMapAsync(object mapMetadata)
        {
            try
            {
                var json = JsonSerializer.Serialize(mapMetadata);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var request = new HttpRequestMessage(HttpMethod.Post, $"{ConfigManager.BaseUrl}/maps/");
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ConfigManager.ApiToken);
                request.Content = content;

                var response = await _client.SendAsync(request);

                if (response.IsSuccessStatusCode)
                    return (true, string.Empty);

                var error = await response.Content.ReadAsStringAsync();
                return (false, $"HTTP {(int)response.StatusCode}: {error}");
            }
            catch (Exception ex) { return (false, ex.Message); }
        }

        public static async Task<List<MapInfo>> GetUserMapsAsync(string search = null)
        {
            var maps = new List<MapInfo>();
            try
            {
                var url = $"{ConfigManager.BaseUrl}/maps/my";
                if (!string.IsNullOrEmpty(search))
                {
                    url += $"?search={Uri.EscapeDataString(search)}&search_field=layout_name";
                }

                var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ConfigManager.ApiToken);

                var response = await _client.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(result);
                    foreach (var item in doc.RootElement.EnumerateArray())
                    {
                        maps.Add(new MapInfo
                        {
                            MapId = item.GetProperty("map_id").GetInt32(),
                            UniqueId = item.GetProperty("unique_id").GetString(),
                            LayoutName = item.GetProperty("layout_name").GetString(),
                            ProjectPath = item.GetProperty("project_path").GetString(),
                            ProjectName = item.GetProperty("project_name").GetString(),
                            Category = item.GetProperty("category").GetString(),
                            IncomeNum = item.TryGetProperty("income_num", out var inc) ? inc.GetString() : null,
                            OutcomeNum = item.TryGetProperty("outcome_num", out var out_) ? out_.GetString() : null,
                            ToWhom = item.TryGetProperty("to_whom", out var tw) ? tw.GetString() : null,
                            Status = item.GetProperty("status").GetString(),
                            Comment = item.TryGetProperty("comment", out var com) ? com.GetString() : null,
                            FilePath = item.GetProperty("file_path").GetString(),
                            AnalystId = item.GetProperty("analyst_id").GetInt32(),
                            CreatedAt = item.GetProperty("created_at").GetDateTime(),
                            UpdatedAt = item.TryGetProperty("updated_at", out var upd) && upd.ValueKind != JsonValueKind.Null ? upd.GetDateTime() : null
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"GetUserMapsAsync error: {ex.Message}");
            }
            return maps;
        }

        public static async Task<(bool success, string error)> UpdateMapAsync(int mapId, object mapMetadata)
        {
            try
            {
                var json = JsonSerializer.Serialize(mapMetadata);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var request = new HttpRequestMessage(HttpMethod.Put, $"{ConfigManager.BaseUrl}/maps/{mapId}/reexport");
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ConfigManager.ApiToken);
                request.Content = content;

                var response = await _client.SendAsync(request);

                if (response.IsSuccessStatusCode)
                    return (true, string.Empty);

                var error = await response.Content.ReadAsStringAsync();
                return (false, $"HTTP {(int)response.StatusCode}: {error}");
            }
            catch (Exception ex) { return (false, ex.Message); }
        }
    }
}