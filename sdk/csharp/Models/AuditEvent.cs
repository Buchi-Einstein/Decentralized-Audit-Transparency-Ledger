using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace AuditLedger.SDK.Models
{
    /// <summary>
    /// Represents an immutable audit event recorded in the AuditLedger.
    /// </summary>
    public class AuditEvent
    {
        [JsonPropertyName("eventId")]
        public string EventId { get; set; } = string.Empty;

        [JsonPropertyName("contractId")]
        public string ContractId { get; set; } = string.Empty;

        [JsonPropertyName("topic")]
        public string Topic { get; set; } = string.Empty;

        [JsonPropertyName("payload")]
        public string Payload { get; set; } = string.Empty;

        [JsonPropertyName("sequenceNumber")]
        public ulong SequenceNumber { get; set; }

        [JsonPropertyName("timestamp")]
        public long Timestamp { get; set; }

        [JsonPropertyName("submitterAddress")]
        public string SubmitterAddress { get; set; } = string.Empty;

        [JsonPropertyName("signature")]
        public string? Signature { get; set; }

        [JsonPropertyName("proof")]
        public string? Proof { get; set; }

        [JsonPropertyName("metadata")]
        public Dictionary<string, string> Metadata { get; set; } = new Dictionary<string, string>();
    }

    /// <summary>
    /// Verification result for an audit event against on-chain cryptographic proofs.
    /// </summary>
    public class AuditEventVerification
    {
        [JsonPropertyName("eventId")]
        public string EventId { get; set; } = string.Empty;

        [JsonPropertyName("isValid")]
        public bool IsValid { get; set; }

        [JsonPropertyName("merkleRoot")]
        public string MerkleRoot { get; set; } = string.Empty;

        [JsonPropertyName("blockHeight")]
        public ulong BlockHeight { get; set; }

        [JsonPropertyName("timestamp")]
        public long Timestamp { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Verified";
    }

    /// <summary>
    /// Result of submitting a batch of audit events.
    /// </summary>
    public class BatchLogResult
    {
        [JsonPropertyName("batchId")]
        public string BatchId { get; set; } = string.Empty;

        [JsonPropertyName("totalSubmitted")]
        public int TotalSubmitted { get; set; }

        [JsonPropertyName("successfulCount")]
        public int SuccessfulCount { get; set; }

        [JsonPropertyName("failedCount")]
        public int FailedCount { get; set; }

        [JsonPropertyName("eventIds")]
        public List<string> EventIds { get; set; } = new List<string>();

        [JsonPropertyName("errors")]
        public List<string> Errors { get; set; } = new List<string>();
    }

    /// <summary>
    /// Typed exception thrown by the AuditLedger SDK.
    /// </summary>
    public class AuditLedgerException : Exception
    {
        public int? StatusCode { get; }
        public string? ErrorCode { get; }

        public AuditLedgerException(string message) : base(message) { }

        public AuditLedgerException(string message, Exception innerException) : base(message, innerException) { }

        public AuditLedgerException(string message, int statusCode, string? errorCode = null) : base(message)
        {
            StatusCode = statusCode;
            ErrorCode = errorCode;
        }
    }
}
