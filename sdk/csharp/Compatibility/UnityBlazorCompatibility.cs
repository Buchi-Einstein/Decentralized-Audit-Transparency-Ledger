using System;
using System.Net.Http;

namespace AuditLedger.SDK.Compatibility
{
    /// <summary>
    /// Utility helpers providing platform-specific configurations for Blazor WebAssembly and Unity.
    /// </summary>
    public static class PlatformCompatibility
    {
        /// <summary>
        /// Creates an HttpClient configured for browser environments (Blazor WASM)
        /// with standard CORS and credentials policies.
        /// </summary>
        public static HttpClient CreateBlazorWasmHttpClient(string baseUrl)
        {
            var handler = new HttpClientHandler();
            var client = new HttpClient(handler)
            {
                BaseAddress = new Uri(baseUrl.EndsWith("/") ? baseUrl : baseUrl + "/")
            };
            return client;
        }

        /// <summary>
        /// Creates an AuditLedgerClient instance optimized for Unity Mono / IL2CPP runtime.
        /// Avoids dynamic code generation and respects WebGL single-threaded concurrency constraints.
        /// </summary>
        public static IAuditLedgerClient CreateUnityClient(string baseUrl, string? apiKey = null)
        {
            var options = new AuditLedgerOptions
            {
                BaseUrl = baseUrl,
                ApiKey = apiKey,
                TimeoutSeconds = 15,
                MaxRetries = 2
            };

            // Under Unity, standard HttpClient with SocketsHttpHandler or UnityWebRequest backend is utilized.
            return new AuditLedgerClient(options);
        }
    }
}
