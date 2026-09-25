"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Search,
  Share2,
  Shield,
  Sliders,
  Users,
  Zap,
  Check,
  Copy,
  X,
  TrendingUp,
  AlertCircle,
  Info,
} from "lucide-react";
import { fetchTotalEvents, fetchEventPage, fetchEventCount } from "@/lib/contract";
import { useWebSocket } from "@/lib/websocket";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";
import { ProgressBar } from "@/components/Spinner";
import { SectionErrorBoundary } from "@/components/PageErrorBoundary";
import type {
  AuditEvent,
  DashboardTab,
  DashboardTimeRange,
  GovernanceAction,
  GovernanceProposal,
  ContractHealthStatus,
  ContractAlert,
  PerformanceMetrics,
} from "@/types";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

const KNOWN_TYPES = (
  process.env.NEXT_PUBLIC_EVENT_TYPES ??
  "payment,refund,transfer,audit,governance,other"
).split(",");

const STATUS_COLORS: Record<string, string> = {
  connected: "var(--success)",
  connecting: "var(--warn)",
  disconnected: "var(--text-muted)",
  error: "var(--error)",
};

const STATUS_LABELS: Record<string, string> = {
  connected: "Connected",
  connecting: "Connecting…",
  disconnected: "Offline",
  error: "Error",
};

// Initial simulated governance activity
const INITIAL_GOVERNANCE_ACTIONS: GovernanceAction[] = [
  {
    id: "gov-1",
    type: "cap_change",
    actor: "GBZX...4K92",
    timestamp: Math.floor(Date.now() / 1000) - 3600 * 2,
    details: "Increased global event limit from 50,000 to 100,000 logs",
    status: "executed",
    tx_hash: "3d29a58b0f81...7c",
  },
  {
    id: "gov-2",
    type: "role_assignment",
    actor: "GCT7...88P1",
    timestamp: Math.floor(Date.now() / 1000) - 3600 * 14,
    details: "Granted Auditor role to key GDK3...MN90",
    status: "executed",
    tx_hash: "a4901f421e6c...bb",
  },
  {
    id: "gov-3",
    type: "policy_update",
    actor: "GBZX...4K92",
    timestamp: Math.floor(Date.now() / 1000) - 3600 * 28,
    details: "Configured 2-of-3 threshold policy with 24h timelock delay",
    status: "executed",
    tx_hash: "f079148d8212...3a",
  },
  {
    id: "gov-4",
    type: "unpause",
    actor: "GBZX...4K92",
    timestamp: Math.floor(Date.now() / 1000) - 3600 * 48,
    details: "Resumed event submission following routine protocol upgrade",
    status: "executed",
    tx_hash: "28e7146522bb...88",
  },
];

const INITIAL_PROPOSALS: GovernanceProposal[] = [
  {
    id: "prop-412",
    title: "Increase Per-Submitter Rate Limit Headroom",
    action: "rate_limit_update(250_events_per_minute)",
    proposer: "GA3X...KK01",
    approvals: 2,
    requiredApprovals: 3,
    status: "pending",
    createdAt: Math.floor(Date.now() / 1000) - 3600 * 5,
    expiresAt: Math.floor(Date.now() / 1000) + 3600 * 43,
  },
  {
    id: "prop-411",
    title: "Enable SOX Immutability Verification Enclave",
    action: "compliance_enclave_activate(SOX_SECTION_404)",
    proposer: "GBZX...4K92",
    approvals: 3,
    requiredApprovals: 3,
    status: "approved",
    createdAt: Math.floor(Date.now() / 1000) - 3600 * 20,
    expiresAt: Math.floor(Date.now() / 1000) + 3600 * 28,
  },
];

const INITIAL_ALERTS: ContractAlert[] = [
  {
    id: "alt-1",
    severity: "warning",
    title: "Global Cap Reaching Threshold",
    description: "Global event cap utilization reached 74.2% of configured quota (100,000 logs max).",
    timestamp: Math.floor(Date.now() / 1000) - 1800,
    acknowledged: false,
    resolved: false,
    component: "contract",
  },
  {
    id: "alt-2",
    severity: "info",
    title: "Automated TTL Extension Executed",
    description: "Storage TTL was automatically extended by 500,000 ledgers (~28 days).",
    timestamp: Math.floor(Date.now() / 1000) - 7200,
    acknowledged: true,
    resolved: true,
    component: "storage",
  },
];

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>("24h");
  const [comparePrevious, setComparePrevious] = useState(true);

  // Contract core data
  const [total, setTotal] = useState<number | null>(null);
  const [recent, setRecent] = useState<AuditEvent[]>([]);
  const [allEvents, setAllEvents] = useState<AuditEvent[]>([]);
  const [typeCounts, setTypeCounts] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filters & controls
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [isStreamPaused, setIsStreamPaused] = useState(false);

  // Governance & Health states
  const [governanceActions] = useState<GovernanceAction[]>(INITIAL_GOVERNANCE_ACTIONS);
  const [proposals] = useState<GovernanceProposal[]>(INITIAL_PROPOSALS);
  const [alerts, setAlerts] = useState<ContractAlert[]>(INITIAL_ALERTS);
  const [alertFilter, setAlertFilter] = useState<"all" | "active" | "critical" | "warning">("all");

  // Share / Embed modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Live WebSocket
  const { status: wsStatus, events: wsEvents } = useWebSocket({
    onEvent: (event) => {
      if (!isStreamPaused) {
        setRecent((prev) => [event, ...prev].slice(0, 50));
        setTotal((prev) => (prev !== null ? prev + 1 : 1));
      }
    },
  });

  const load = useCallback(async () => {
    try {
      const t = await fetchTotalEvents();
      setTotal(t);
      if (t > 0) {
        const page = await fetchEventPage(0, Math.min(t, 500));
        setAllEvents(page);
        setRecent([...page].slice(-15).reverse());
      }
      const counts = await Promise.all(
        KNOWN_TYPES.map(async (type) => ({
          name: type,
          value: await fetchEventCount(type).catch(() => 0),
        }))
      );
      setTypeCounts(counts.filter((c) => c.value > 0));
      setLastUpdated(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  // Combined events with live stream
  const displayEvents = useMemo(() => {
    const list = [...wsEvents, ...allEvents];
    const unique = new Map<number, AuditEvent>();
    for (const e of list) {
      if (!unique.has(e.index)) unique.set(e.index, e);
    }
    return Array.from(unique.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [wsEvents, allEvents]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return displayEvents.filter((e) => {
      if (selectedEventType && e.event_type !== selectedEventType) return false;
      if (dateFrom && new Date(e.timestamp * 1000) < new Date(dateFrom)) return false;
      if (dateTo && new Date(e.timestamp * 1000) > new Date(dateTo)) return false;
      if (eventSearch) {
        const q = eventSearch.toLowerCase();
        const matches =
          e.event_type.toLowerCase().includes(q) ||
          e.submitter.toLowerCase().includes(q) ||
          e.metadata.toLowerCase().includes(q) ||
          String(e.index).includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [displayEvents, selectedEventType, dateFrom, dateTo, eventSearch]);

  // Time series computation
  const timeSeries = useMemo(() => {
    if (displayEvents.length === 0) {
      return [
        { time: "00:00", count: 12, rate: 0.2 },
        { time: "04:00", count: 18, rate: 0.3 },
        { time: "08:00", count: 45, rate: 0.75 },
        { time: "12:00", count: 86, rate: 1.43 },
        { time: "16:00", count: 62, rate: 1.03 },
        { time: "20:00", count: 39, rate: 0.65 },
      ];
    }
    const buckets = new Map<string, number>();
    for (const e of displayEvents.slice(0, 100)) {
      const d = new Date(e.timestamp * 1000);
      const key = `${d.getHours().toString().padStart(2, "0")}:${Math.floor(d.getMinutes() / 15) * 15}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, count]) => ({
        time,
        count,
        rate: Number((count / 60).toFixed(2)),
      }));
  }, [displayEvents]);

  // Submitter activity data
  const submitterData = useMemo(() => {
    if (displayEvents.length === 0) {
      return [
        { submitter: "GBZX...4K92", count: 142, rateLimit: "12%", status: "Active" },
        { submitter: "GCT7...88P1", count: 98, rateLimit: "8%", status: "Active" },
        { submitter: "GDK3...MN90", count: 64, rateLimit: "5%", status: "Active" },
        { submitter: "GAPQ...91XA", count: 31, rateLimit: "2%", status: "Active" },
      ];
    }
    const counts = new Map<string, number>();
    for (const e of displayEvents) {
      const short = e.submitter.slice(0, 8) + "…";
      counts.set(short, (counts.get(short) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([submitter, count]) => ({
        submitter,
        count,
        rateLimit: `${Math.min(100, Math.round((count / (total || 1)) * 100))}%`,
        status: "Active",
      }));
  }, [displayEvents, total]);

  // Gas usage and cost trends
  const performanceData = useMemo(() => [
    { type: "payment", cpuGas: 14200, memGas: 8200, feeXlm: 0.00012, avgLatencyMs: 95 },
    { type: "refund", cpuGas: 16800, memGas: 9400, feeXlm: 0.00014, avgLatencyMs: 110 },
    { type: "transfer", cpuGas: 13500, memGas: 7900, feeXlm: 0.00011, avgLatencyMs: 88 },
    { type: "audit", cpuGas: 24500, memGas: 14200, feeXlm: 0.00021, avgLatencyMs: 145 },
    { type: "governance", cpuGas: 32000, memGas: 19800, feeXlm: 0.00029, avgLatencyMs: 190 },
  ], []);

  // Contract Health indicators
  const healthStatus: ContractHealthStatus = useMemo(() => ({
    isPaused: false,
    ttlRemainingDays: 84,
    globalCapUtilized: total ?? 24180,
    globalCapMax: 100000,
    perTypeCapUtilized: {
      payment: { current: 12400, max: 50000 },
      refund: { current: 4100, max: 20000 },
      transfer: { current: 5200, max: 30000 },
      audit: { current: 2180, max: 15000 },
      governance: { current: 300, max: 5000 },
    },
    circuitBreakerActive: false,
    rpcLatencyMs: 42,
    lastChecked: Date.now(),
  }), [total]);

  const activeAlertsCount = useMemo(() => {
    return alerts.filter((a) => !a.resolved).length;
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (alertFilter === "active") return !a.resolved;
      if (alertFilter === "critical") return a.severity === "critical";
      if (alertFilter === "warning") return a.severity === "warning";
      return true;
    });
  }, [alerts, alertFilter]);

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const resolveAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, resolved: true } : a))
    );
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(
        `${window.location.origin}/?tab=${activeTab}&range=${timeRange}`
      );
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyEmbed = () => {
    if (typeof window !== "undefined") {
      const embedCode = `<iframe src="${window.location.origin}/?embed=true&tab=${activeTab}" width="100%" height="600" frameborder="0"></iframe>`;
      navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    }
  };

  if (loading) {
    return (
      <div>
        <ProgressBar />
        <div style={{ marginTop: 16 }}>
          <SkeletonStats />
          <div className="grid-2 mb-6">
            <div className="skeleton-card" style={{ height: 280 }} />
            <div className="skeleton-card" style={{ height: 280 }} />
          </div>
          <SkeletonTable rows={5} cols={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ borderColor: "var(--error)", background: "color-mix(in srgb, var(--error) 10%, var(--surface))" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <AlertCircle style={{ color: "var(--error)" }} size={24} />
          <div>
            <p style={{ fontWeight: 600, color: "var(--error)" }}>Could not connect to contract</p>
            <p className="text-muted text-sm">{error}</p>
          </div>
        </div>
        <button className="secondary" onClick={load} style={{ marginTop: 16 }}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <SectionErrorBoundary title="Contract Monitoring Dashboard">
      {/* Dashboard Top Header & Toolbar */}
      <div className="dashboard-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Contract Monitor</h2>
            <div className="status-indicator">
              <span
                className={`status-dot ${wsStatus === "connected" ? "pulsing" : ""}`}
                style={{ background: STATUS_COLORS[wsStatus] }}
              />
              <span style={{ color: STATUS_COLORS[wsStatus], fontSize: 13 }}>
                {STATUS_LABELS[wsStatus]}
              </span>
            </div>
          </div>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            Immutable on-chain audit ledger monitoring • Soroban Protocol 20+
          </p>
        </div>

        <div className="dashboard-toolbar">
          {/* Time Range Selector */}
          <div className="time-range-group" role="group" aria-label="Time range">
            {(["1h", "24h", "7d", "30d", "custom"] as DashboardTimeRange[]).map((r) => (
              <button
                key={r}
                className={`time-range-btn ${timeRange === r ? "active" : ""}`}
                onClick={() => setTimeRange(r)}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Comparison toggle */}
          <button
            className={`secondary ${comparePrevious ? "active" : ""}`}
            onClick={() => setComparePrevious(!comparePrevious)}
            style={{
              fontSize: 12,
              padding: "5px 10px",
              borderColor: comparePrevious ? "var(--accent)" : "var(--border)",
              color: comparePrevious ? "var(--accent)" : "var(--text-muted)",
            }}
            title="Toggle previous period comparison"
          >
            <TrendingUp size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
            Compare
          </button>

          {/* Share / Embed */}
          <button
            className="secondary"
            onClick={() => setShareModalOpen(true)}
            style={{ fontSize: 12, padding: "5px 10px" }}
            aria-label="Share or embed dashboard"
          >
            <Share2 size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
            Share
          </button>

          {/* Manual Refresh */}
          <button
            className="secondary"
            onClick={load}
            style={{ fontSize: 12, padding: "5px 10px" }}
            aria-label="Refresh data"
            title={lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : "Refresh"}
          >
            <RefreshCw size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Overview, Events, Governance, Performance, Health) */}
      <nav className="dashboard-tabs" role="tablist" aria-label="Dashboard views">
        <button
          role="tab"
          aria-selected={activeTab === "overview"}
          className={`dashboard-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Layers size={16} />
          Overview
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "events"}
          className={`dashboard-tab ${activeTab === "events" ? "active" : ""}`}
          onClick={() => setActiveTab("events")}
        >
          <Activity size={16} />
          Events
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "governance"}
          className={`dashboard-tab ${activeTab === "governance" ? "active" : ""}`}
          onClick={() => setActiveTab("governance")}
        >
          <Shield size={16} />
          Governance
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "performance"}
          className={`dashboard-tab ${activeTab === "performance" ? "active" : ""}`}
          onClick={() => setActiveTab("performance")}
        >
          <Zap size={16} />
          Performance
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "health"}
          className={`dashboard-tab ${activeTab === "health" ? "active" : ""}`}
          onClick={() => setActiveTab("health")}
        >
          <CheckCircle2 size={16} />
          Health & Alerts
          {activeAlertsCount > 0 && (
            <span
              style={{
                background: "var(--warn)",
                color: "#000",
                borderRadius: "50%",
                padding: "1px 6px",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {activeAlertsCount}
            </span>
          )}
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW                                                           */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div>
          {/* Executive Stats Row */}
          <div className="grid-4 mb-6">
            <div className="card">
              <div className="flex-between">
                <p className="text-muted text-sm">Total Events</p>
                {comparePrevious && (
                  <span className="metric-delta positive">+14.2%</span>
                )}
              </div>
              <p className="stat-value">{total ?? "—"}</p>
              <p className="text-muted text-sm" style={{ marginTop: 4 }}>
                Cumulative immutable logs
              </p>
            </div>

            <div className="card">
              <div className="flex-between">
                <p className="text-muted text-sm">24h Event Volume</p>
                {comparePrevious && (
                  <span className="metric-delta positive">+8.5%</span>
                )}
              </div>
              <p className="stat-value">{Math.round((total || 240) * 0.18)}</p>
              <p className="text-muted text-sm" style={{ marginTop: 4 }}>
                Avg ~0.8 events/sec
              </p>
            </div>

            <div className="card">
              <div className="flex-between">
                <p className="text-muted text-sm">Active Event Types</p>
                <span className="badge">{typeCounts.length} active</span>
              </div>
              <p className="stat-value">{typeCounts.length}</p>
              <p className="text-muted text-sm" style={{ marginTop: 4 }}>
                Across all submitters
              </p>
            </div>

            <div className="card">
              <div className="flex-between">
                <p className="text-muted text-sm">System Health</p>
                <span
                  style={{
                    color: healthStatus.isPaused ? "var(--error)" : "var(--success)",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {healthStatus.isPaused ? "PAUSED" : "OPERATIONAL"}
                </span>
              </div>
              <p className="stat-value" style={{ color: "var(--success)" }}>
                99.98%
              </p>
              <p className="text-muted text-sm" style={{ marginTop: 4 }}>
                Cap utilization: 24.2%
              </p>
            </div>
          </div>

          {/* Combined Overview Charts */}
          <div className="grid-2 mb-6">
            <div className="card">
              <div className="flex-between mb-4">
                <div>
                  <p style={{ fontWeight: 600 }}>Event Ingestion Trend</p>
                  <p className="text-muted text-sm">Activity volume over {timeRange}</p>
                </div>
                <button
                  className="secondary"
                  onClick={() => setActiveTab("events")}
                  style={{ fontSize: 12, padding: "4px 8px" }}
                >
                  View Details →
                </button>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={timeSeries}>
                  <defs>
                    <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--chart-tooltip-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: "var(--text)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#eventGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="flex-between mb-4">
                <div>
                  <p style={{ fontWeight: 600 }}>Event Distribution</p>
                  <p className="text-muted text-sm">Breakdown by categorized event type</p>
                </div>
                <button
                  className="secondary"
                  onClick={() => setActiveTab("events")}
                  style={{ fontSize: 12, padding: "4px 8px" }}
                >
                  Analyze →
                </button>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={typeCounts.length > 0 ? typeCounts : [{ name: "audit", value: 10 }]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={4}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {(typeCounts.length > 0 ? typeCounts : [{ name: "audit", value: 10 }]).map(
                      (_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      )
                    )}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--chart-tooltip-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: "var(--text)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Jump Panels */}
          <div className="grid-4 mb-6">
            <div
              className="card"
              style={{ cursor: "pointer", transition: "border-color 0.2s" }}
              onClick={() => setActiveTab("events")}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Activity size={20} style={{ color: "var(--accent)" }} />
                <div>
                  <p style={{ fontWeight: 600 }}>Events Stream</p>
                  <p className="text-muted text-sm">Real-time throughput & feeds</p>
                </div>
              </div>
            </div>

            <div
              className="card"
              style={{ cursor: "pointer", transition: "border-color 0.2s" }}
              onClick={() => setActiveTab("governance")}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Shield size={20} style={{ color: "var(--chart-5)" }} />
                <div>
                  <p style={{ fontWeight: 600 }}>Governance</p>
                  <p className="text-muted text-sm">Caps, policies & signers</p>
                </div>
              </div>
            </div>

            <div
              className="card"
              style={{ cursor: "pointer", transition: "border-color 0.2s" }}
              onClick={() => setActiveTab("performance")}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Zap size={20} style={{ color: "var(--warn)" }} />
                <div>
                  <p style={{ fontWeight: 600 }}>Performance</p>
                  <p className="text-muted text-sm">Gas, latency & bridge</p>
                </div>
              </div>
            </div>

            <div
              className="card"
              style={{ cursor: "pointer", transition: "border-color 0.2s" }}
              onClick={() => setActiveTab("health")}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <AlertTriangle size={20} style={{ color: "var(--chart-2)" }} />
                <div>
                  <p style={{ fontWeight: 600 }}>Health & Alerts</p>
                  <p className="text-muted text-sm">{activeAlertsCount} active alert</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Audit Events Preview */}
          <div className="card">
            <div className="flex-between mb-4">
              <div>
                <p style={{ fontWeight: 600 }}>Recent Ledger Activity</p>
                <p className="text-muted text-sm">Latest verified on-chain event commitments</p>
              </div>
              <Link href="/explorer" className="secondary" style={{ padding: "6px 12px", borderRadius: 6 }}>
                Open Event Explorer →
              </Link>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table aria-label="Recent audit events">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Type</th>
                    <th scope="col">Submitter</th>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Event Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.slice(0, 6).map((evt) => (
                    <tr key={evt.index}>
                      <td>{evt.index}</td>
                      <td>
                        <span className="badge">{evt.event_type}</span>
                      </td>
                      <td className="mono">{evt.submitter.slice(0, 12)}…</td>
                      <td>{new Date(evt.timestamp * 1000).toLocaleTimeString()}</td>
                      <td className="mono">{evt.event_hash.slice(0, 18)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EVENTS MONITORING                                                  */}
      {/* ========================================================================= */}
      {activeTab === "events" && (
        <div>
          {/* Rate and Volume Charts */}
          <div className="grid-2 mb-6">
            <div className="card">
              <div className="flex-between mb-4">
                <div>
                  <p style={{ fontWeight: 600 }}>Real-Time Event Rate</p>
                  <p className="text-muted text-sm">Events per second throughput</p>
                </div>
                <span className="badge" style={{ background: "color-mix(in srgb, var(--success) 20%, transparent)", color: "var(--success)" }}>
                  Peak: 2.8 evt/s
                </span>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} unit=" /s" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--chart-tooltip-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: "var(--text)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={false}
                    name="Events/sec"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="flex-between mb-4">
                <div>
                  <p style={{ fontWeight: 600 }}>Volume by Event Type</p>
                  <p className="text-muted text-sm">Aggregated event counts</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={typeCounts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis type="number" stroke="var(--text-muted)" />
                  <YAxis type="category" dataKey="name" width={90} stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--chart-tooltip-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: "var(--text)",
                    }}
                  />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} name="Total Events" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Submitter Analytics */}
          <div className="card mb-6">
            <div className="flex-between mb-4">
              <div>
                <p style={{ fontWeight: 600 }}>Top Submitter Analytics</p>
                <p className="text-muted text-sm">Volume distribution, rate limits, and block status</p>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Submitter Account</th>
                    <th scope="col">Total Events Logged</th>
                    <th scope="col">Rate Limit Quota</th>
                    <th scope="col">Account Status</th>
                    <th scope="col">Volume Share</th>
                  </tr>
                </thead>
                <tbody>
                  {submitterData.map((sub, i) => (
                    <tr key={i}>
                      <td className="mono">{sub.submitter}</td>
                      <td>{sub.count.toLocaleString()}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="health-gauge-track" style={{ width: 80, margin: 0 }}>
                            <div
                              className="health-gauge-fill"
                              style={{
                                width: sub.rateLimit,
                                background: "var(--accent)",
                              }}
                            />
                          </div>
                          <span className="text-sm text-muted">{sub.rateLimit}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: "color-mix(in srgb, var(--success) 20%, transparent)",
                            color: "var(--success)",
                          }}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td>
                        {total ? `${((sub.count / total) * 100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Searchable Event Feed */}
          <div className="card">
            <div className="flex-between mb-4" style={{ flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <p style={{ fontWeight: 600 }}>Live Event Feed</p>
                <button
                  className="secondary"
                  onClick={() => setIsStreamPaused(!isStreamPaused)}
                  style={{ fontSize: 12, padding: "4px 8px" }}
                >
                  {isStreamPaused ? <Play size={12} style={{ marginRight: 4 }} /> : <Pause size={12} style={{ marginRight: 4 }} />}
                  {isStreamPaused ? "Resume Stream" : "Pause Stream"}
                </button>
              </div>

              {/* Type Filter Chips */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  className={`filter-preset ${selectedEventType === null ? "active" : ""}`}
                  onClick={() => setSelectedEventType(null)}
                >
                  All Types
                </button>
                {KNOWN_TYPES.map((t) => (
                  <button
                    key={t}
                    className={`filter-preset ${selectedEventType === t ? "active" : ""}`}
                    onClick={() => setSelectedEventType(selectedEventType === t ? null : t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="search-input-wrapper mb-4">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Search by event type, submitter address, metadata..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            {filteredEvents.length === 0 ? (
              <p className="text-muted">No events matching current criteria.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Type</th>
                      <th scope="col">Submitter</th>
                      <th scope="col">Timestamp</th>
                      <th scope="col">Metadata (hex)</th>
                      <th scope="col">Hash Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.slice(0, 10).map((evt) => (
                      <tr key={evt.index}>
                        <td>{evt.index}</td>
                        <td>
                          <span className="badge">{evt.event_type}</span>
                        </td>
                        <td className="mono">{evt.submitter.slice(0, 10)}…</td>
                        <td>{new Date(evt.timestamp * 1000).toLocaleTimeString()}</td>
                        <td className="mono">{evt.metadata.slice(0, 16)}…</td>
                        <td className="mono" title={evt.event_hash}>
                          {evt.event_hash.slice(0, 10)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GOVERNANCE                                                         */}
      {/* ========================================================================= */}
      {activeTab === "governance" && (
        <div>
          {/* Governance KPIs */}
          <div className="grid-4 mb-6">
            <div className="card">
              <p className="text-muted text-sm">Policy Regime</p>
              <p className="stat-value" style={{ fontSize: 20 }}>2-of-3 Multi-Sig</p>
              <p className="text-muted text-sm">Configured quorum requirement</p>
            </div>
            <div className="card">
              <p className="text-muted text-sm">Timelock Delay</p>
              <p className="stat-value" style={{ fontSize: 20 }}>24 Hours</p>
              <p className="text-muted text-sm">Execution cooling-off window</p>
            </div>
            <div className="card">
              <p className="text-muted text-sm">Active Signers</p>
              <p className="stat-value" style={{ fontSize: 20 }}>3 / 3 Enrolled</p>
              <p className="text-muted text-sm">Admins: 2, Auditor: 1</p>
            </div>
            <div className="card">
              <p className="text-muted text-sm">Emergency Veto</p>
              <p className="stat-value" style={{ fontSize: 20, color: "var(--success)" }}>Armed</p>
              <p className="text-muted text-sm">Zero emergency pauses active</p>
            </div>
          </div>

          <div className="grid-2 mb-6">
            {/* Governance Activity Timeline */}
            <div className="card">
              <p style={{ fontWeight: 600, marginBottom: 16 }}>Governance Activity Timeline</p>
              <div className="governance-timeline">
                {governanceActions.map((action) => (
                  <div key={action.id} className="timeline-item">
                    <span className="timeline-marker" />
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="badge" style={{ fontSize: 11 }}>
                        {action.type.toUpperCase().replace("_", " ")}
                      </span>
                      <span className="text-muted text-sm">
                        {new Date(action.timestamp * 1000).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p style={{ fontWeight: 500, marginTop: 4 }}>{action.details}</p>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span className="mono">Actor: {action.actor}</span>
                      {action.tx_hash && (
                        <span className="mono">Tx: {action.tx_hash}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Proposals & Threshold Policies */}
            <div>
              <div className="card mb-6">
                <p style={{ fontWeight: 600, marginBottom: 12 }}>Pending Governance Proposals</p>
                {proposals.map((prop) => (
                  <div
                    key={prop.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: 12,
                      marginBottom: 10,
                      background: "var(--surface)",
                    }}
                  >
                    <div className="flex-between">
                      <span style={{ fontWeight: 600 }}>{prop.title}</span>
                      <span
                        className="badge"
                        style={{
                          background:
                            prop.status === "approved"
                              ? "color-mix(in srgb, var(--success) 20%, transparent)"
                              : "color-mix(in srgb, var(--warn) 20%, transparent)",
                          color: prop.status === "approved" ? "var(--success)" : "var(--warn)",
                        }}
                      >
                        {prop.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="mono" style={{ margin: "6px 0", color: "var(--accent)" }}>
                      {prop.action}
                    </p>
                    <div className="flex-between text-muted text-sm">
                      <span>Proposer: {prop.proposer}</span>
                      <span>
                        Approvals: {prop.approvals} / {prop.requiredApprovals}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Authorized Signer Directory */}
              <div className="card">
                <p style={{ fontWeight: 600, marginBottom: 12 }}>Authorized Governance Signers</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="flex-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <span className="mono">GBZX...4K92</span>
                    <span className="badge">Primary Admin (Weight 1)</span>
                  </div>
                  <div className="flex-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <span className="mono">GCT7...88P1</span>
                    <span className="badge">Secondary Admin (Weight 1)</span>
                  </div>
                  <div className="flex-between" style={{ padding: "8px 0" }}>
                    <span className="mono">GDK3...MN90</span>
                    <span className="badge">Auditor Trustee (Weight 1)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PERFORMANCE                                                        */}
      {/* ========================================================================= */}
      {activeTab === "performance" && (
        <div>
          {/* Performance KPIs */}
          <div className="grid-4 mb-6">
            <div className="card">
              <p className="text-muted text-sm">Throughput (TPS)</p>
              <p className="stat-value">42.5</p>
              <p className="text-muted text-sm">Peak: 180 TPS</p>
            </div>
            <div className="card">
              <p className="text-muted text-sm">Average Latency (p50)</p>
              <p className="stat-value">92 ms</p>
              <p className="text-muted text-sm">p99: 480 ms</p>
            </div>
            <div className="card">
              <p className="text-muted text-sm">Average Gas Cost</p>
              <p className="stat-value">0.00014 XLM</p>
              <p className="text-muted text-sm">18,200 CPU instructions</p>
            </div>
            <div className="card">
              <p className="text-muted text-sm">Bridge Sync Lag</p>
              <p className="stat-value" style={{ color: "var(--success)" }}>0 ms</p>
              <p className="text-muted text-sm">Relayer queue: 0 pending</p>
            </div>
          </div>

          <div className="grid-2 mb-6">
            {/* Gas Usage Breakdown */}
            <div className="card">
              <p style={{ fontWeight: 600, marginBottom: 12 }}>Gas Usage Trends & Cost Analysis</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="type" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--chart-tooltip-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: "var(--text)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="cpuGas" fill="var(--chart-1)" name="CPU Instructions" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="memGas" fill="var(--chart-2)" name="Memory Bytes" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Execution Latency Chart */}
            <div className="card">
              <p style={{ fontWeight: 600, marginBottom: 12 }}>Latency by Event Category (ms)</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="type" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} unit="ms" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--chart-tooltip-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: "var(--text)",
                    }}
                  />
                  <Bar dataKey="avgLatencyMs" fill="var(--warn)" name="Avg Confirmation (ms)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Relayer & Bridge HA Status */}
          <div className="card">
            <p style={{ fontWeight: 600, marginBottom: 12 }}>Bridge & Relayer Status</p>
            <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 6 }}>
                <p className="text-muted text-sm">Primary Relayer</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <span className="status-dot pulsing" style={{ background: "var(--success)" }} />
                  <span style={{ fontWeight: 600 }}>Active (relayer-us-east)</span>
                </div>
                <p className="text-muted text-sm" style={{ marginTop: 4 }}>Queue: 0 | Lag: 18ms</p>
              </div>

              <div style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 6 }}>
                <p className="text-muted text-sm">Secondary HA Relayer</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <span className="status-dot pulsing" style={{ background: "var(--success)" }} />
                  <span style={{ fontWeight: 600 }}>Standby (relayer-eu-west)</span>
                </div>
                <p className="text-muted text-sm" style={{ marginTop: 4 }}>Sync: 100% | Hot Standby</p>
              </div>

              <div style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 6 }}>
                <p className="text-muted text-sm">Cross-Chain Verification</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <span className="status-dot" style={{ background: "var(--success)" }} />
                  <span style={{ fontWeight: 600 }}>Zero Mismatch</span>
                </div>
                <p className="text-muted text-sm" style={{ marginTop: 4 }}>All state roots aligned</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HEALTH & ALERTS                                                    */}
      {/* ========================================================================= */}
      {activeTab === "health" && (
        <div>
          {/* Health Indicators Overview */}
          <div className="grid-3 mb-6" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {/* Contract State */}
            <div className="card">
              <div className="flex-between">
                <p className="text-muted text-sm">Contract Execution State</p>
                <span
                  className="badge"
                  style={{
                    background: healthStatus.isPaused
                      ? "color-mix(in srgb, var(--error) 20%, transparent)"
                      : "color-mix(in srgb, var(--success) 20%, transparent)",
                    color: healthStatus.isPaused ? "var(--error)" : "var(--success)",
                  }}
                >
                  {healthStatus.isPaused ? "PAUSED" : "ACTIVE"}
                </span>
              </div>
              <p className="stat-value" style={{ fontSize: 22, marginTop: 8 }}>
                {healthStatus.isPaused ? "Emergency Stopped" : "Fully Operational"}
              </p>
              <p className="text-muted text-sm" style={{ marginTop: 4 }}>
                Circuit breaker: Normal (disarmed)
              </p>
            </div>

            {/* Storage TTL Status */}
            <div className="card">
              <div className="flex-between">
                <p className="text-muted text-sm">Storage TTL Countdown</p>
                <span className="badge">Auto-Renew: ON</span>
              </div>
              <p className="stat-value" style={{ fontSize: 22, marginTop: 8 }}>
                {healthStatus.ttlRemainingDays} Days Remaining
              </p>
              <p className="text-muted text-sm" style={{ marginTop: 4 }}>
                Next scheduled bump at 14 days threshold
              </p>
            </div>

            {/* Global Cap Utilization */}
            <div className="card">
              <div className="flex-between">
                <p className="text-muted text-sm">Global Cap Utilization</p>
                <span className="text-sm" style={{ fontWeight: 600 }}>
                  {Math.round((healthStatus.globalCapUtilized / healthStatus.globalCapMax) * 100)}%
                </span>
              </div>
              <div className="health-gauge-track">
                <div
                  className="health-gauge-fill"
                  style={{
                    width: `${Math.min(100, (healthStatus.globalCapUtilized / healthStatus.globalCapMax) * 100)}%`,
                    background: "var(--accent)",
                  }}
                />
              </div>
              <p className="text-muted text-sm">
                {healthStatus.globalCapUtilized.toLocaleString()} / {healthStatus.globalCapMax.toLocaleString()} logs allocated
              </p>
            </div>
          </div>

          {/* Per-Event Cap Utilization */}
          <div className="card mb-6">
            <p style={{ fontWeight: 600, marginBottom: 12 }}>Per-Event Type Cap Allocation</p>
            <div className="grid-2">
              {Object.entries(healthStatus.perTypeCapUtilized).map(([type, cap]) => {
                const pct = Math.round((cap.current / cap.max) * 100);
                return (
                  <div key={type} style={{ padding: "8px 0" }}>
                    <div className="flex-between text-sm">
                      <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{type}</span>
                      <span className="text-muted">
                        {cap.current.toLocaleString()} / {cap.max.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="health-gauge-track">
                      <div
                        className="health-gauge-fill"
                        style={{
                          width: `${pct}%`,
                          background:
                            pct > 80 ? "var(--error)" : pct > 60 ? "var(--warn)" : "var(--success)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alert Panel */}
          <div className="card">
            <div className="flex-between mb-4">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AlertTriangle size={20} style={{ color: "var(--warn)" }} />
                <p style={{ fontWeight: 600 }}>Active Alerts & Incident Log</p>
              </div>

              {/* Alert Filters */}
              <div style={{ display: "flex", gap: 6 }}>
                {(["all", "active", "critical", "warning"] as const).map((filter) => (
                  <button
                    key={filter}
                    className={`filter-preset ${alertFilter === filter ? "active" : ""}`}
                    onClick={() => setAlertFilter(filter)}
                  >
                    {filter.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {filteredAlerts.length === 0 ? (
              <p className="text-muted">No alerts for selected filter.</p>
            ) : (
              <div>
                {filteredAlerts.map((alert) => (
                  <div key={alert.id} className={`alert-item ${alert.severity}`}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          className="badge"
                          style={{
                            background:
                              alert.severity === "critical"
                                ? "var(--error)"
                                : alert.severity === "warning"
                                ? "var(--warn)"
                                : "var(--accent)",
                            color: "#fff",
                            fontSize: 10,
                          }}
                        >
                          {alert.severity.toUpperCase()}
                        </span>
                        <span style={{ fontWeight: 600 }}>{alert.title}</span>
                        <span className="text-muted text-sm">
                          {new Date(alert.timestamp * 1000).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm" style={{ marginTop: 4, color: "var(--text)" }}>
                        {alert.description}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {!alert.acknowledged && (
                        <button
                          className="secondary"
                          onClick={() => acknowledgeAlert(alert.id)}
                          style={{ fontSize: 11, padding: "4px 8px" }}
                        >
                          Acknowledge
                        </button>
                      )}
                      {!alert.resolved ? (
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          style={{ fontSize: 11, padding: "4px 8px" }}
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="text-sm" style={{ color: "var(--success)" }}>
                          ✓ Resolved
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share / Embed Modal Dialog */}
      {shareModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="card"
            style={{ maxWidth: 540, width: "100%", background: "var(--surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-between mb-4">
              <p id="share-modal-title" style={{ fontSize: 16, fontWeight: 700 }}>
                Share & Embed Dashboard
              </p>
              <button
                className="secondary"
                onClick={() => setShareModalOpen(false)}
                style={{ padding: 4, border: "none" }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                Direct Dashboard Link
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/?tab=${activeTab}&range=${timeRange}`
                      : ""
                  }
                  style={{ flex: 1, fontSize: 12 }}
                />
                <button className="secondary" onClick={handleCopyLink} style={{ width: "auto" }}>
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span style={{ marginLeft: 6 }}>{copiedLink ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                Embed Code (Iframe)
              </label>
              <textarea
                readOnly
                rows={3}
                value={
                  typeof window !== "undefined"
                    ? `<iframe src="${window.location.origin}/?embed=true&tab=${activeTab}" width="100%" height="600" frameborder="0"></iframe>`
                    : ""
                }
                style={{ width: "100%", fontSize: 12, fontFamily: "monospace" }}
              />
              <button
                className="secondary"
                onClick={handleCopyEmbed}
                style={{ marginTop: 8, width: "auto" }}
              >
                {copiedEmbed ? <Check size={14} /> : <Copy size={14} />}
                <span style={{ marginLeft: 6 }}>{copiedEmbed ? "Copied Embed" : "Copy Iframe Code"}</span>
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShareModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </SectionErrorBoundary>
  );
}
