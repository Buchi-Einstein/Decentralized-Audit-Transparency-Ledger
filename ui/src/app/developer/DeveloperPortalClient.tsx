"use client";

import { useState } from "react";
import {
  Code,
  Terminal,
  BookOpen,
  FileCode,
  HelpCircle,
  History,
  Copy,
  Check,
  Play,
  Send,
  ExternalLink,
  ChevronRight,
  Search,
} from "lucide-react";
import { SectionErrorBoundary } from "@/components/PageErrorBoundary";

type PortalSection = "api" | "playground" | "sdks" | "deployment" | "troubleshooting" | "changelog";

interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PATCH";
  path: string;
  summary: string;
  params?: Array<{ name: string; type: string; required: boolean; description: string; default?: string }>;
  body?: string;
  sampleResponse: Record<string, unknown>;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "get-events",
    method: "GET",
    path: "/v1/events",
    summary: "List all verified audit events with pagination and filters",
    params: [
      { name: "limit", type: "number", required: false, description: "Max items to return (1-100)", default: "20" },
      { name: "offset", type: "number", required: false, description: "Offset index for pagination", default: "0" },
      { name: "type", type: "string", required: false, description: "Filter by event category (e.g. payment, audit)" },
    ],
    sampleResponse: {
      data: [
        {
          index: 104,
          timestamp: 1727263200,
          event_type: "payment",
          submitter: "GBZX4K92...",
          event_hash: "a4f912c984...",
          prev_hash: "82bc0914e1...",
        },
      ],
      total: 105,
      limit: 20,
      offset: 0,
    },
  },
  {
    id: "get-stats",
    method: "GET",
    path: "/v1/stats",
    summary: "Retrieve contract-wide metrics and global cap status",
    sampleResponse: {
      totalEvents: 24180,
      globalMaxLogs: 100000,
      eventsByType: { payment: 12400, refund: 4100, transfer: 5200, audit: 2180, governance: 300 },
      isPaused: false,
    },
  },
  {
    id: "post-compliance-report",
    method: "POST",
    path: "/v1/compliance/reports/generate",
    summary: "Generate an automated regulatory report (SOX, GDPR, MiCA)",
    body: JSON.stringify(
      {
        regulation: "SOX",
        jurisdiction: "US",
        timeRange: { from: 1724544000, to: 1727263200 },
        includeProofs: true,
      },
      null,
      2
    ),
    sampleResponse: {
      reportId: "rep-sox-8819",
      regulation: "SOX",
      generatedAt: "2026-09-25T12:00:00Z",
      integrityProof: "sha256:7bc89d41...",
      eventsAudited: 4210,
      nonCompliantCount: 0,
      status: "verified",
    },
  },
  {
    id: "post-replay-start",
    method: "POST",
    path: "/v1/replay/start",
    summary: "Initiate ledger event replay and state reconstruction",
    body: JSON.stringify(
      {
        fromLedger: 520000,
        toLedger: 525000,
        checkpointInterval: 1000,
        verifyHashChain: true,
      },
      null,
      2
    ),
    sampleResponse: {
      replayId: "rpl-5502",
      status: "running",
      fromLedger: 520000,
      toLedger: 525000,
      processedEvents: 0,
      checkpoints: [],
    },
  },
];

const CODE_EXAMPLES: Record<string, { code: string; language: string }> = {
  typescript: {
    language: "typescript",
    code: `import { AuditLedgerClient } from "@audit-ledger/sdk";

// Initialize client with Soroban Testnet RPC
const client = new AuditLedgerClient({
  network: "testnet",
  contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  rpcUrl: "https://soroban-testnet.stellar.org",
});

// 1. Commit an audit event to the ledger
async function run() {
  console.log("Submitting immutable audit event...");
  const tx = await client.logEvent({
    eventType: "payment_settled",
    submitter: "GBZX4K92...",
    metadata: {
      orderId: "ORD-99120",
      amount: "150.00",
      currency: "USDC",
    },
  });

  console.log("Event committed! Index:", tx.index);
  console.log("Cryptographic Hash:", tx.eventHash);

  // 2. Verify hash-chain integrity
  const isValid = await client.verifyIntegrity({ fromIndex: 0, toIndex: tx.index });
  console.log("Hash chain integrity verified:", isValid);
}

run();`,
  },
  python: {
    language: "python",
    code: `from audit_ledger import AuditLedgerClient

# Connect to Soroban Testnet
client = AuditLedgerClient(
    network="testnet",
    contract_id="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    rpc_url="https://soroban-testnet.stellar.org"
)

# Record compliance audit log
result = client.record_event(
    event_type="governance_vote",
    submitter="GBZX4K92...",
    payload={
        "proposal_id": "prop-412",
        "vote": "APPROVE",
        "weight": 1
    }
)

print(f"Log recorded successfully at index: {result['index']}")
print(f"Ledger commitment hash: {result['event_hash']}")

# Check stats
stats = client.get_contract_stats()
print(f"Total events on chain: {stats['total_events']}")`,
  },
  rust: {
    language: "rust",
    code: `use soroban_sdk::{Env, Address, String, Bytes, BytesN};

pub fn record_audit_log(
    env: &Env,
    submitter: Address,
    event_type: String,
    metadata: Bytes,
) -> BytesN<32> {
    submitter.require_auth();

    // Call AuditLedger contract invoke
    let contract_id = Address::from_string(&String::from_str(env, "CDLZ..."));
    let client = AuditLedgerClient::new(env, &contract_id);

    let event_hash = client.log_event(&submitter, &event_type, &metadata);
    event_hash
}`,
  },
};

const TROUBLESHOOTING_ITEMS = [
  {
    code: "HostError(Contract, #100)",
    title: "Global Event Limit Exceeded",
    cause: "The contract has reached its maximum configured global storage limit.",
    solution: "Admins must execute a governance proposal to increase the limit via set_global_cap, or trigger archival via archive_events.",
  },
  {
    code: "RateLimitExceeded (HTTP 429)",
    title: "Submitter Rate Limit Exhausted",
    cause: "The submitter address has exceeded the per-minute token bucket rate quota.",
    solution: "Implement exponential backoff retry in client SDK, or request a quota tier upgrade.",
  },
  {
    code: "InvalidSignature / AuthError",
    title: "Soroban Authentication Mismatch",
    cause: "The transaction source account signature does not match the submitter address in the payload.",
    solution: "Ensure the signing keypair matches the submitter address passed to require_auth.",
  },
  {
    code: "IntegrityVerificationFailed",
    title: "Hash Chain Linkage Broken",
    cause: "An event's prev_hash does not match the sha256 hash of the preceding event record.",
    solution: "Run event replay tool (replay_events) to identify corrupted or missing ledger intervals and re-sync.",
  },
];

export default function DeveloperPortalClient() {
  const [activeSection, setActiveSection] = useState<PortalSection>("api");
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(API_ENDPOINTS[0]);
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [playgroundLang, setPlaygroundLang] = useState<"typescript" | "python" | "rust">("typescript");
  const [playgroundConsole, setPlaygroundConsole] = useState<string>("");
  const [playgroundRunning, setPlaygroundRunning] = useState(false);

  const handleSendApi = () => {
    setApiLoading(true);
    setTimeout(() => {
      setApiResponse(JSON.stringify(selectedEndpoint.sampleResponse, null, 2));
      setApiLoading(false);
    }, 400);
  };

  const handleRunPlayground = () => {
    setPlaygroundRunning(true);
    setPlaygroundConsole("Connecting to Soroban Testnet RPC [https://soroban-testnet.stellar.org]...\nCompiling invocation payload...");
    setTimeout(() => {
      setPlaygroundConsole(
        (prev) =>
          prev +
          "\nSimulating transaction against contract CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC...\n" +
          "-> CPU Gas Consumed: 14,280 instructions\n" +
          "-> Memory Gas: 8,140 bytes\n" +
          "-> Transaction status: SUCCESS (Ledger sequence: 524190)\n" +
          "-> Event Commitment Hash: 0xa4f912c984bd8910f135ea29b8c014798e1f57aa18d890bf23b7\n" +
          "-> Hash chain verified: OK (Prev: 0x82bc0914e1...)\n" +
          "Execution completed in 84ms."
      );
      setPlaygroundRunning(false);
    }, 800);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <SectionErrorBoundary title="Developer Portal">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
          <Code className="text-accent" size={28} />
          Developer Portal & API Playground
        </h1>
        <p className="text-muted" style={{ marginTop: 6 }}>
          Build, integrate, and verify on-chain audit trails with the AuditLedger SDKs, REST APIs, and interactive playground.
        </p>
      </div>

      {/* Navigation tabs */}
      <div className="dashboard-tabs" style={{ marginBottom: 24 }}>
        <button
          className={`dashboard-tab ${activeSection === "api" ? "active" : ""}`}
          onClick={() => setActiveSection("api")}
        >
          <Terminal size={16} />
          API Explorer
        </button>
        <button
          className={`dashboard-tab ${activeSection === "playground" ? "active" : ""}`}
          onClick={() => setActiveSection("playground")}
        >
          <Play size={16} />
          Code Playground
        </button>
        <button
          className={`dashboard-tab ${activeSection === "sdks" ? "active" : ""}`}
          onClick={() => setActiveSection("sdks")}
        >
          <BookOpen size={16} />
          SDK Guides
        </button>
        <button
          className={`dashboard-tab ${activeSection === "deployment" ? "active" : ""}`}
          onClick={() => setActiveSection("deployment")}
        >
          <FileCode size={16} />
          CLI Deployment
        </button>
        <button
          className={`dashboard-tab ${activeSection === "troubleshooting" ? "active" : ""}`}
          onClick={() => setActiveSection("troubleshooting")}
        >
          <HelpCircle size={16} />
          Troubleshooting
        </button>
        <button
          className={`dashboard-tab ${activeSection === "changelog" ? "active" : ""}`}
          onClick={() => setActiveSection("changelog")}
        >
          <History size={16} />
          Changelog
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: API EXPLORER                                                   */}
      {/* ========================================================================= */}
      {activeSection === "api" && (
        <div className="grid-2">
          {/* Endpoint selection sidebar */}
          <div className="card">
            <p style={{ fontWeight: 600, marginBottom: 14 }}>Endpoints</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {API_ENDPOINTS.map((ep) => (
                <div
                  key={ep.id}
                  onClick={() => {
                    setSelectedEndpoint(ep);
                    setApiResponse(null);
                  }}
                  style={{
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid",
                    borderColor: selectedEndpoint.id === ep.id ? "var(--accent)" : "var(--border)",
                    background:
                      selectedEndpoint.id === ep.id
                        ? "color-mix(in srgb, var(--accent) 8%, var(--surface))"
                        : "var(--surface)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      className="badge"
                      style={{
                        background:
                          ep.method === "GET"
                            ? "var(--chart-1)"
                            : ep.method === "POST"
                            ? "var(--chart-2)"
                            : "var(--warn)",
                        color: "#fff",
                        fontSize: 10,
                      }}
                    >
                      {ep.method}
                    </span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
                      {ep.path}
                    </span>
                  </div>
                  <p className="text-muted text-sm" style={{ marginTop: 4 }}>
                    {ep.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Request & Response Panel */}
          <div className="card">
            <div className="flex-between mb-4">
              <div>
                <p style={{ fontWeight: 600 }}>Interactive Test Runner</p>
                <p className="mono" style={{ color: "var(--accent)", fontSize: 13 }}>
                  {selectedEndpoint.method} {selectedEndpoint.path}
                </p>
              </div>
              <button
                onClick={handleSendApi}
                disabled={apiLoading}
                style={{ padding: "6px 14px", fontSize: 13, width: "auto" }}
              >
                {apiLoading ? "Sending..." : "Send Request"}
                <Send size={14} style={{ marginLeft: 6, verticalAlign: "middle" }} />
              </button>
            </div>

            {selectedEndpoint.body && (
              <div style={{ marginBottom: 16 }}>
                <p className="text-sm text-muted" style={{ fontWeight: 600, marginBottom: 6 }}>
                  Request Payload (JSON)
                </p>
                <textarea
                  readOnly
                  rows={6}
                  value={selectedEndpoint.body}
                  style={{ width: "100%", fontSize: 12, fontFamily: "monospace" }}
                />
              </div>
            )}

            <div>
              <div className="flex-between mb-2">
                <p className="text-sm text-muted" style={{ fontWeight: 600 }}>
                  Response
                </p>
                {apiResponse && (
                  <span className="badge" style={{ background: "color-mix(in srgb, var(--success) 20%, transparent)", color: "var(--success)" }}>
                    200 OK • 42ms
                  </span>
                )}
              </div>
              <pre
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: 12,
                  fontSize: 12,
                  overflowX: "auto",
                  minHeight: 180,
                }}
              >
                {apiResponse || "// Click 'Send Request' to trigger call against contract API"}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: CODE PLAYGROUND                                                */}
      {/* ========================================================================= */}
      {activeSection === "playground" && (
        <div>
          <div className="card mb-6">
            <div className="flex-between mb-4">
              <div style={{ display: "flex", gap: 8 }}>
                {(["typescript", "python", "rust"] as const).map((lang) => (
                  <button
                    key={lang}
                    className={`filter-preset ${playgroundLang === lang ? "active" : ""}`}
                    onClick={() => {
                      setPlaygroundLang(lang);
                      setPlaygroundConsole("");
                    }}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="secondary"
                  onClick={() => copyToClipboard(CODE_EXAMPLES[playgroundLang].code)}
                  style={{ width: "auto" }}
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  <span style={{ marginLeft: 6 }}>{copiedCode ? "Copied" : "Copy"}</span>
                </button>
                <button
                  onClick={handleRunPlayground}
                  disabled={playgroundRunning}
                  style={{ width: "auto" }}
                >
                  <Play size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {playgroundRunning ? "Executing..." : "Run Code"}
                </button>
              </div>
            </div>

            <textarea
              value={CODE_EXAMPLES[playgroundLang].code}
              readOnly
              rows={14}
              style={{
                width: "100%",
                fontFamily: "monospace",
                fontSize: 13,
                lineHeight: 1.5,
                background: "var(--bg)",
              }}
            />
          </div>

          {/* Console output window */}
          <div className="card">
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Simulator Console Output</p>
            <pre
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: 12,
                fontSize: 12,
                minHeight: 120,
                overflowX: "auto",
                color: playgroundConsole ? "var(--text)" : "var(--text-muted)",
              }}
            >
              {playgroundConsole || "// Output from simulated contract execution will appear here"}
            </pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: SDK GUIDES                                                     */}
      {/* ========================================================================= */}
      {activeSection === "sdks" && (
        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span className="badge" style={{ background: "var(--chart-1)", color: "#fff" }}>JS / TS</span>
              <p style={{ fontWeight: 700 }}>JavaScript & TypeScript SDK</p>
            </div>
            <p className="text-muted text-sm mb-4">
              Full client library with automated contract simulation, batch logging, and WebSocket listeners.
            </p>
            <pre style={{ background: "var(--bg)", padding: 8, borderRadius: 4, fontSize: 12 }} className="mono mb-4">
              npm install @audit-ledger/sdk @stellar/stellar-sdk
            </pre>
            <ul style={{ paddingLeft: 18, fontSize: 13, color: "var(--text-muted)" }}>
              <li>Promise-based async/await API</li>
              <li>WebSocket live subscription stream</li>
              <li>Merkle hash integrity verification</li>
            </ul>
          </div>

          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span className="badge" style={{ background: "var(--chart-2)", color: "#fff" }}>Python</span>
              <p style={{ fontWeight: 700 }}>Python SDK</p>
            </div>
            <p className="text-muted text-sm mb-4">
              Pythonic client for backend ingestion, regulatory compliance scripts, and ML feature storage.
            </p>
            <pre style={{ background: "var(--bg)", padding: 8, borderRadius: 4, fontSize: 12 }} className="mono mb-4">
              pip install audit-ledger
            </pre>
            <ul style={{ paddingLeft: 18, fontSize: 13, color: "var(--text-muted)" }}>
              <li>Type annotations and Pydantic models</li>
              <li>SOX & GDPR compliance exporter</li>
              <li>Sync and Asyncio support</li>
            </ul>
          </div>

          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span className="badge" style={{ background: "var(--warn)", color: "#000" }}>Rust</span>
              <p style={{ fontWeight: 700 }}>Rust / Soroban SDK</p>
            </div>
            <p className="text-muted text-sm mb-4">
              Native Soroban contract client and cross-contract call interface.
            </p>
            <pre style={{ background: "var(--bg)", padding: 8, borderRadius: 4, fontSize: 12 }} className="mono mb-4">
              cargo add audit-ledger-sdk
            </pre>
            <ul style={{ paddingLeft: 18, fontSize: 13, color: "var(--text-muted)" }}>
              <li>Zero-copy ScVal serialization</li>
              <li>WASM size optimized</li>
              <li>Cross-contract call invocation</li>
            </ul>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: CLI DEPLOYMENT GUIDE                                           */}
      {/* ========================================================================= */}
      {activeSection === "deployment" && (
        <div className="card">
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            Stellar / Soroban CLI Deployment Walkthrough
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <p style={{ fontWeight: 600 }}>1. Build Contract WASM</p>
              <pre style={{ background: "var(--bg)", padding: 12, borderRadius: 6, fontSize: 12 }} className="mono">
                stellar contract build
              </pre>
            </div>

            <div>
              <p style={{ fontWeight: 600 }}>2. Deploy Contract to Testnet</p>
              <pre style={{ background: "var(--bg)", padding: 12, borderRadius: 6, fontSize: 12 }} className="mono">
                stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/audit_ledger.wasm \
  --source alice \
  --network testnet
              </pre>
            </div>

            <div>
              <p style={{ fontWeight: 600 }}>3. Initialize Ledger Parameters</p>
              <pre style={{ background: "var(--bg)", padding: 12, borderRadius: 6, fontSize: 12 }} className="mono">
                stellar contract invoke \
  --id &lt;CONTRACT_ID&gt; \
  --source alice \
  --network testnet \
  -- initialize \
  --admin alice \
  --global_max_logs 100000
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: TROUBLESHOOTING                                                */}
      {/* ========================================================================= */}
      {activeSection === "troubleshooting" && (
        <div className="card">
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            Common Contract & API Errors Reference
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {TROUBLESHOOTING_ITEMS.map((item, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: 14,
                  background: "var(--surface)",
                }}
              >
                <div className="flex-between">
                  <span style={{ fontWeight: 600 }}>{item.title}</span>
                  <span className="badge" style={{ background: "var(--error)", color: "#fff" }}>
                    {item.code}
                  </span>
                </div>
                <p className="text-sm" style={{ marginTop: 6, color: "var(--text-muted)" }}>
                  <strong>Cause:</strong> {item.cause}
                </p>
                <p className="text-sm" style={{ marginTop: 4, color: "var(--accent)" }}>
                  <strong>Resolution:</strong> {item.solution}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: CHANGELOG & CONTRIBUTING                                       */}
      {/* ========================================================================= */}
      {activeSection === "changelog" && (
        <div className="card">
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            Changelog & Release Notes
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="badge" style={{ background: "var(--success)", color: "#fff" }}>v1.2.0</span>
                <span style={{ fontWeight: 600 }}>Contract Monitoring Dashboard, Developer Portal & Regulatory Reporting</span>
                <span className="text-muted text-sm">September 2026</span>
              </div>
              <ul style={{ paddingLeft: 20, marginTop: 8, fontSize: 13, color: "var(--text-muted)" }}>
                <li>Dedicated monitoring dashboard layout: Overview, Events, Governance, Performance, Health.</li>
                <li>Interactive Developer Portal with API explorer, code playground, and SDK guides.</li>
                <li>Automated event compliance for SOX, GDPR, MiCA and regulatory reporting.</li>
                <li>Incremental event replay protocol and state reconstruction from ledger history.</li>
              </ul>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="badge">v1.1.0</span>
                <span style={{ fontWeight: 600 }}>WASM Validators, Parallel Replay & Threshold Policies</span>
                <span className="text-muted text-sm">August 2026</span>
              </div>
              <ul style={{ paddingLeft: 20, marginTop: 8, fontSize: 13, color: "var(--text-muted)" }}>
                <li>Custom WASM validator registry and gas metering.</li>
                <li>Parallel event replay coordinator with checkpointing.</li>
                <li>Multi-signature threshold policy engine and timelock lifecycle.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </SectionErrorBoundary>
  );
}
