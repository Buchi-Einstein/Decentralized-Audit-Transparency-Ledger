using System;

namespace AuditLedger.SDK
{
    /// <summary>
    /// Configuration options for the AuditLedger SDK client.
    /// </summary>
    public class AuditLedgerOptions
    {
        /// <summary>
        /// Base URL for the AuditLedger API endpoint or node RPC.
        /// </summary>
        public string BaseUrl { get; set; } = "http://localhost:8080";

        /// <summary>
        /// Optional API Key for authentication or rate limiting.
        /// </summary>
        public string? ApiKey { get; set; }

        /// <summary>
        /// Contract ID on Soroban / Stellar network.
        /// </summary>
        public string? ContractId { get; set; }

        /// <summary>
        /// HTTP request timeout in seconds. Defaults to 30.
        /// </summary>
        public int TimeoutSeconds { get; set; } = 30;

        /// <summary>
        /// Maximum retry attempts for transient errors. Defaults to 3.
        /// </summary>
        public int MaxRetries { get; set; } = 3;

        /// <summary>
        /// Enables automatic batching buffer if configured.
        /// </summary>
        public bool EnableBatching { get; set; } = false;

        /// <summary>
        /// Delay in milliseconds before flushing automatic batches.
        /// </summary>
        public int BatchIntervalMs { get; set; } = 500;
    }
}
