using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using AuditLedger.SDK.Models;

namespace AuditLedger.SDK
{
    /// <summary>
    /// Contract for interacting with the AuditLedger node or API.
    /// Supports asynchronous operations and dependency injection.
    /// </summary>
    public interface IAuditLedgerClient : IDisposable
    {
        /// <summary>
        /// Retrieves a recorded audit event by its unique ID.
        /// </summary>
        Task<AuditEvent?> GetEventAsync(string eventId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Appends a new audit event into the ledger asynchronously.
        /// </summary>
        Task<string> LogEventAsync(AuditEvent auditEvent, CancellationToken cancellationToken = default);

        /// <summary>
        /// Submits a batch of audit events atomically or in bulk.
        /// </summary>
        Task<BatchLogResult> LogBatchAsync(IEnumerable<AuditEvent> events, CancellationToken cancellationToken = default);

        /// <summary>
        /// Verifies an audit event's cryptographic proof against ledger state.
        /// </summary>
        Task<AuditEventVerification> VerifyEventAsync(string eventId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Queries events by topic and sequence number range.
        /// </summary>
        Task<IReadOnlyList<AuditEvent>> QueryEventsAsync(string topic, ulong? fromSequence = null, ulong? toSequence = null, int limit = 100, CancellationToken cancellationToken = default);

        /// <summary>
        /// Checks the health and sync state of the AuditLedger node.
        /// </summary>
        Task<bool> PingAsync(CancellationToken cancellationToken = default);
    }
}
