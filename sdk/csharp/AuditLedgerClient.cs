using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AuditLedger.SDK.Models;

namespace AuditLedger.SDK
{
    /// <summary>
    /// Thread-safe, asynchronous AuditLedger SDK client.
    /// Compatible with .NET Standard 2.0/2.1, .NET 6/8, Unity, and Blazor WebAssembly.
    /// </summary>
    public class AuditLedgerClient : IAuditLedgerClient
    {
        private readonly HttpClient _httpClient;
        private readonly AuditLedgerOptions _options;
        private readonly bool _ownsHttpClient;
        private readonly JsonSerializerOptions _jsonOptions;

        public AuditLedgerClient(AuditLedgerOptions options) : this(new HttpClient(), options, ownsHttpClient: true)
        {
        }

        public AuditLedgerClient(HttpClient httpClient, AuditLedgerOptions options, bool ownsHttpClient = false)
        {
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
            _options = options ?? throw new ArgumentNullException(nameof(options));
            _ownsHttpClient = ownsHttpClient;

            var baseUri = new Uri(_options.BaseUrl.EndsWith("/") ? _options.BaseUrl : _options.BaseUrl + "/");
            if (_httpClient.BaseAddress == null)
            {
                _httpClient.BaseAddress = baseUri;
            }

            if (!string.IsNullOrEmpty(_options.ApiKey))
            {
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
            }

            _httpClient.DefaultRequestHeaders.Accept.Clear();
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            };
        }

        public async Task<AuditEvent?> GetEventAsync(string eventId, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(eventId))
                throw new ArgumentException("Event ID cannot be null or empty", nameof(eventId));

            var uri = $"api/v1/events/{Uri.EscapeDataString(eventId)}";
            return await SendWithRetryAsync<AuditEvent?>(HttpMethod.Get, uri, null, cancellationToken).ConfigureAwait(false);
        }

        public async Task<string> LogEventAsync(AuditEvent auditEvent, CancellationToken cancellationToken = default)
        {
            if (auditEvent == null)
                throw new ArgumentNullException(nameof(auditEvent));

            if (string.IsNullOrEmpty(auditEvent.EventId))
                auditEvent.EventId = Guid.NewGuid().ToString("N");

            if (auditEvent.Timestamp <= 0)
                auditEvent.Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

            if (string.IsNullOrEmpty(auditEvent.ContractId) && !string.IsNullOrEmpty(_options.ContractId))
                auditEvent.ContractId = _options.ContractId;

            var response = await SendWithRetryAsync<JsonElement>(HttpMethod.Post, "api/v1/events", auditEvent, cancellationToken).ConfigureAwait(false);
            if (response.TryGetProperty("eventId", out var eventIdElem))
            {
                return eventIdElem.GetString() ?? auditEvent.EventId;
            }
            return auditEvent.EventId;
        }

        public async Task<BatchLogResult> LogBatchAsync(IEnumerable<AuditEvent> events, CancellationToken cancellationToken = default)
        {
            if (events == null)
                throw new ArgumentNullException(nameof(events));

            var payload = new { events };
            return await SendWithRetryAsync<BatchLogResult>(HttpMethod.Post, "api/v1/events/batch", payload, cancellationToken).ConfigureAwait(false);
        }

        public async Task<AuditEventVerification> VerifyEventAsync(string eventId, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(eventId))
                throw new ArgumentException("Event ID cannot be null or empty", nameof(eventId));

            var uri = $"api/v1/events/{Uri.EscapeDataString(eventId)}/verify";
            return await SendWithRetryAsync<AuditEventVerification>(HttpMethod.Get, uri, null, cancellationToken).ConfigureAwait(false);
        }

        public async Task<IReadOnlyList<AuditEvent>> QueryEventsAsync(string topic, ulong? fromSequence = null, ulong? toSequence = null, int limit = 100, CancellationToken cancellationToken = default)
        {
            var sb = new StringBuilder($"api/v1/events?topic={Uri.EscapeDataString(topic)}&limit={limit}");
            if (fromSequence.HasValue) sb.Append($"&fromSeq={fromSequence.Value}");
            if (toSequence.HasValue) sb.Append($"&toSeq={toSequence.Value}");

            var result = await SendWithRetryAsync<List<AuditEvent>>(HttpMethod.Get, sb.ToString(), null, cancellationToken).ConfigureAwait(false);
            return result ?? new List<AuditEvent>();
        }

        public async Task<bool> PingAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                using var response = await _httpClient.GetAsync("health", cancellationToken).ConfigureAwait(false);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        private async Task<T> SendWithRetryAsync<T>(HttpMethod method, string requestUri, object? body, CancellationToken cancellationToken)
        {
            int attempts = 0;
            int maxAttempts = Math.Max(1, _options.MaxRetries);

            while (true)
            {
                attempts++;
                try
                {
                    using var request = new HttpRequestMessage(method, requestUri);
                    if (body != null)
                    {
                        var json = JsonSerializer.Serialize(body, _jsonOptions);
                        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
                    }

                    using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken).ConfigureAwait(false);

                    if (response.IsSuccessStatusCode)
                    {
                        using var stream = await response.Content.ReadAsStreamAsync().ConfigureAwait(false);
                        var data = await JsonSerializer.DeserializeAsync<T>(stream, _jsonOptions, cancellationToken).ConfigureAwait(false);
                        return data!;
                    }

                    if ((int)response.StatusCode >= 500 && attempts < maxAttempts)
                    {
                        await Task.Delay(TimeSpan.FromMilliseconds(200 * attempts), cancellationToken).ConfigureAwait(false);
                        continue;
                    }

                    var errBody = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                    throw new AuditLedgerException($"AuditLedger API returned status {(int)response.StatusCode} ({response.ReasonPhrase}): {errBody}", (int)response.StatusCode);
                }
                catch (HttpRequestException ex) when (attempts < maxAttempts)
                {
                    await Task.Delay(TimeSpan.FromMilliseconds(200 * attempts), cancellationToken).ConfigureAwait(false);
                }
            }
        }

        public void Dispose()
        {
            if (_ownsHttpClient)
            {
                _httpClient.Dispose();
            }
        }
    }
}
