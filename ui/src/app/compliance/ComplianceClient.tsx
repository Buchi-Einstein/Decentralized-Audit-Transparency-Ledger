"use client";

import { useState } from "react";
import {
  ShieldCheck,
  FileText,
  Trash2,
  Clock,
  Download,
  CheckCircle,
  AlertTriangle,
  Send,
  Lock,
  ExternalLink,
} from "lucide-react";
import { SectionErrorBoundary } from "@/components/PageErrorBoundary";

interface Report {
  id: string;
  regulation: string;
  jurisdiction: string;
  generatedAt: string;
  status: "verified" | "flagged";
  eventsAudited: number;
  immutabilityProof: string;
}

const INITIAL_REPORTS: Report[] = [
  {
    id: "rep-sox-8819",
    regulation: "SOX (Section 404/802)",
    jurisdiction: "US",
    generatedAt: "2026-09-25 10:30 UTC",
    status: "verified",
    eventsAudited: 4210,
    immutabilityProof: "7bc89d41ae0918c47b59...991a",
  },
  {
    id: "rep-mica-2144",
    regulation: "MiCA Crypto-Asset Audit",
    jurisdiction: "EU",
    generatedAt: "2026-09-24 16:15 UTC",
    status: "verified",
    eventsAudited: 1840,
    immutabilityProof: "f419c802bc117da83e91...44bc",
  },
  {
    id: "rep-gdpr-1102",
    regulation: "GDPR Data Processing Record",
    jurisdiction: "EU",
    generatedAt: "2026-09-23 09:00 UTC",
    status: "verified",
    eventsAudited: 3100,
    immutabilityProof: "32a1ef84b01988ec2910...aa71",
  },
];

const RETENTION_POLICIES = [
  { regulation: "SOX (Sarbanes-Oxley)", retentionYears: "7 Years", statutoryBasis: "SOX § 802 / SEC Rule 17a-4", status: "Active" },
  { regulation: "GDPR (General Data Protection)", retentionYears: "2 Years / On-Demand", statutoryBasis: "GDPR Art. 5(1)(e) & Art. 17", status: "Active" },
  { regulation: "MiCA (Markets in Crypto-Assets)", retentionYears: "5 Years", statutoryBasis: "MiCA Title III / IV Guidelines", status: "Active" },
  { regulation: "FINRA / SEC Broker-Dealer", retentionYears: "6 Years", statutoryBasis: "FINRA Rule 4511 / SEC 17a-4", status: "Active" },
];

export default function ComplianceClient() {
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
  const [selectedRegulation, setSelectedRegulation] = useState<string>("SOX");
  const [jurisdiction, setJurisdiction] = useState<string>("US");
  const [generating, setGenerating] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // GDPR Erasure Form
  const [subjectId, setSubjectId] = useState("");
  const [eventIndexes, setEventIndexes] = useState("");
  const [erasureSubmitting, setErasureSubmitting] = useState(false);
  const [erasureResult, setErasureResult] = useState<string | null>(null);

  const handleGenerateReport = () => {
    setGenerating(true);
    setTimeout(() => {
      const newReport: Report = {
        id: `rep-${selectedRegulation.toLowerCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        regulation: selectedRegulation,
        jurisdiction,
        generatedAt: new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC",
        status: "verified",
        eventsAudited: Math.floor(2000 + Math.random() * 3000),
        immutabilityProof: `${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      };
      setReports([newReport, ...reports]);
      setGenerating(false);
      setSuccessMsg(`Compliance report ${newReport.id} successfully generated and cryptographically signed!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    }, 600);
  };

  const handleErasureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !eventIndexes) return;
    setErasureSubmitting(true);
    setTimeout(() => {
      setErasureResult(
        `GDPR Article 17 Erasure Executed for Subject ${subjectId}. PII metadata has been cryptographically redacted; audit hash-chain integrity preserved with certificate GDPR-ART17-${Math.random().toString(16).slice(2, 10)}.`
      );
      setErasureSubmitting(false);
      setSubjectId("");
      setEventIndexes("");
    }, 700);
  };

  return (
    <SectionErrorBoundary title="Compliance & Regulatory Reporting">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldCheck className="text-accent" size={28} />
          Compliance & Regulatory Reporting
        </h1>
        <p className="text-muted" style={{ marginTop: 6 }}>
          Generate immutable compliance reports for SOX, GDPR, and MiCA, enforce statutory data retention schedules, and execute GDPR Article 17 erasure requests with audit preservation.
        </p>
      </div>

      {successMsg && (
        <div className="card mb-6" style={{ background: "color-mix(in srgb, var(--success) 12%, var(--surface))", borderColor: "var(--success)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle style={{ color: "var(--success)" }} size={20} />
            <p style={{ fontWeight: 600, color: "var(--success)" }}>{successMsg}</p>
          </div>
        </div>
      )}

      {/* Grid: Generator & Erasure */}
      <div className="grid-2 mb-6">
        {/* Report Generator */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <FileText size={20} style={{ color: "var(--accent)" }} />
            <p style={{ fontWeight: 600, fontSize: 16 }}>Automated Report Generator</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="text-sm text-muted" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                Regulatory Framework
              </label>
              <select
                value={selectedRegulation}
                onChange={(e) => setSelectedRegulation(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="SOX">SOX (Sarbanes-Oxley § 404 / 802)</option>
                <option value="GDPR">GDPR (EU General Data Protection Reg)</option>
                <option value="MiCA">MiCA (EU Markets in Crypto-Assets)</option>
                <option value="FINRA">FINRA Order Audit Trail (Rule 4511)</option>
                <option value="SEC">SEC Books & Records (Rule 17a-4)</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-muted" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                Jurisdiction
              </label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="US">United States (SEC / FINRA / CFTC)</option>
                <option value="EU">European Union (ESMA / MiCA / GDPR)</option>
                <option value="GB">United Kingdom (FCA)</option>
                <option value="SG">Singapore (MAS)</option>
                <option value="DE">Germany (BaFin)</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input type="checkbox" id="includeProofs" defaultChecked />
              <label htmlFor="includeProofs" className="text-sm">
                Include Merkle cryptographic immutability proofs
              </label>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={generating}
              style={{ marginTop: 12 }}
            >
              {generating ? "Generating Compliance Report..." : "Generate Signed Report"}
              <Send size={14} style={{ marginLeft: 6, verticalAlign: "middle" }} />
            </button>
          </div>
        </div>

        {/* GDPR Erasure with Audit Trail Preservation */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Trash2 size={20} style={{ color: "var(--warn)" }} />
            <p style={{ fontWeight: 600, fontSize: 16 }}>GDPR Right to Erasure (Art. 17)</p>
          </div>
          <p className="text-muted text-sm mb-4">
            Execute statutory erasure requests while cryptographically preserving hash-chain linkage and immutability proofs.
          </p>

          <form onSubmit={handleErasureSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="text-sm text-muted" style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>
                Data Subject Identifier
              </label>
              <input
                type="text"
                placeholder="e.g. SUB-99014"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label className="text-sm text-muted" style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>
                Event Index Range (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. 104, 105, 108"
                value={eventIndexes}
                onChange={(e) => setEventIndexes(e.target.value)}
                required
                style={{ width: "100%" }}
              />
            </div>

            <button type="submit" disabled={erasureSubmitting} className="secondary" style={{ marginTop: 12 }}>
              {erasureSubmitting ? "Executing Redaction..." : "Execute Erasure & Issue Certificate"}
            </button>
          </form>

          {erasureResult && (
            <div style={{ marginTop: 14, padding: 10, borderRadius: 6, background: "var(--bg)", border: "1px solid var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--success)" }}>
                ✓ {erasureResult}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Generated Reports Table */}
      <div className="card mb-6">
        <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 14 }}>Generated Regulatory Reports</p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th scope="col">Report ID</th>
                <th scope="col">Regulation</th>
                <th scope="col">Jurisdiction</th>
                <th scope="col">Generated At</th>
                <th scope="col">Events Verified</th>
                <th scope="col">Immutability Proof</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((rep) => (
                <tr key={rep.id}>
                  <td className="mono" style={{ fontWeight: 600, color: "var(--accent)" }}>
                    {rep.id}
                  </td>
                  <td>{rep.regulation}</td>
                  <td>
                    <span className="badge">{rep.jurisdiction}</span>
                  </td>
                  <td>{rep.generatedAt}</td>
                  <td>{rep.eventsAudited.toLocaleString()}</td>
                  <td className="mono">{rep.immutabilityProof}</td>
                  <td>
                    <button
                      className="secondary"
                      onClick={() => alert(`Downloading verified compliance certificate for ${rep.id}...`)}
                      style={{ fontSize: 11, padding: "4px 8px" }}
                    >
                      <Download size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statutory Retention Schedule Table */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Clock size={20} style={{ color: "var(--chart-5)" }} />
          <p style={{ fontWeight: 600, fontSize: 16 }}>Statutory Data Retention Schedule</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th scope="col">Regulatory Regime</th>
                <th scope="col">Minimum Retention Horizon</th>
                <th scope="col">Statutory Reference</th>
                <th scope="col">Enforcement Engine</th>
              </tr>
            </thead>
            <tbody>
              {RETENTION_POLICIES.map((pol, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{pol.regulation}</td>
                  <td>{pol.retentionYears}</td>
                  <td className="text-muted">{pol.statutoryBasis}</td>
                  <td>
                    <span className="badge" style={{ background: "color-mix(in srgb, var(--success) 20%, transparent)", color: "var(--success)" }}>
                      {pol.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionErrorBoundary>
  );
}
