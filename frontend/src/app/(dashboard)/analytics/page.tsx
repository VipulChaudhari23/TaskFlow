"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProfile } from "@/context/ProfileContext";
import {
  BarChart2,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Download,
  Sparkles,
  ChevronLeft,
  RefreshCw,
  Users,
  Activity,
  Flame,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  eachDayOfInterval,
  format,
  subDays,
  parseISO,
  isSameDay,
} from "date-fns";

type Range = "30days" | "quarter";

interface ProfileStat {
  id: string;
  name: string;
  avatarColor: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  completionRate: number;
  highPriority: number;
}

interface TaskRaw {
  createdAt: string;
  status: string;
  dueDate?: string | null;
  priority: string;
  title: string;
}

interface Report {
  period: string;
  profileStats: ProfileStat[];
  weeklyData: Record<string, { total: number; completed: number }>;
  overall: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
    completionRate: number;
    highPriority: number;
  };
  aiReport: string;
  tasks?: TaskRaw[];
}

// ── Simple markdown renderer (your existing one, unchanged) ──
function MarkdownReport({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith("## "))
          return (
            <h3
              key={i}
              className="text-base font-bold mt-4 mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              {line.slice(3)}
            </h3>
          );
        if (line.startsWith("### "))
          return (
            <h4
              key={i}
              className="text-sm font-semibold mt-3"
              style={{ color: "var(--accent)" }}
            >
              {line.slice(4)}
            </h4>
          );
        if (line.startsWith("**") && line.endsWith("**"))
          return (
            <p
              key={i}
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {line.slice(2, -2)}
            </p>
          );
        if (line.startsWith("- "))
          return (
            <p
              key={i}
              className="text-sm flex gap-2"
              style={{ color: "var(--text-secondary)" }}
            >
              <span style={{ color: "var(--accent)" }}>•</span>
              {line.slice(2)}
            </p>
          );
        if (line.match(/^\d+\. /))
          return (
            <p
              key={i}
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {line}
            </p>
          );
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return (
          <p
            key={i}
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// ── BURNDOWN CHART COMPONENT ────────────────────────────
// ════════════════════════════════════════════════════════
function BurndownChart({ tasks, range }: { tasks: TaskRaw[]; range: Range }) {
  const days = range === "quarter" ? 90 : 30;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const startDate = subDays(today, days - 1);
  const allDays = eachDayOfInterval({ start: startDate, end: today });

  const total = tasks.length;
  if (total === 0) {
    return (
      <div className="card p-8 flex flex-col items-center justify-center text-center">
        <Activity
          size={32}
          style={{ color: "var(--text-muted)" }}
          className="mb-2"
        />
        <p
          className="text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          No tasks in this period for burndown
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Add tasks and return to see your sprint burndown chart
        </p>
      </div>
    );
  }

  // Build per-day data
  const dailyData = allDays.map((day, dayIndex) => {
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    // Tasks created on or before this day
    const createdSoFar = tasks.filter((t) => new Date(t.createdAt) <= dayEnd);

    // Still remaining (not completed) as of this day
    // We approximate: if status is COMPLETED, we treat it as completed
    const remaining = createdSoFar.filter(
      (t) => t.status !== "COMPLETED",
    ).length;

    const completedSoFar = createdSoFar.filter(
      (t) => t.status === "COMPLETED",
    ).length;

    // Ideal: linear burn from total → 0 over the period
    const ideal = Math.max(
      0,
      Math.round(total - (total / Math.max(days - 1, 1)) * dayIndex),
    );

    return {
      date: day,
      label: format(day, "d MMM"),
      remaining,
      completedSoFar,
      ideal,
      totalCreated: createdSoFar.length,
    };
  });

  // SVG dimensions (use a wide viewBox, render responsive)
  const VB_W = 500;
  const VB_H = 200;
  const PAD_L = 36;
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 32;
  const chartW = VB_W - PAD_L - PAD_R;
  const chartH = VB_H - PAD_T - PAD_B;

  const maxY = Math.max(total, 1);
  const n = allDays.length;

  const toX = (i: number) => PAD_L + (i / Math.max(n - 1, 1)) * chartW;
  const toY = (v: number) => PAD_T + (1 - Math.min(v, maxY) / maxY) * chartH;

  // Path builders
  const idealPathD = dailyData
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d.ideal).toFixed(1)}`,
    )
    .join(" ");

  const actualPathD = dailyData
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d.remaining).toFixed(1)}`,
    )
    .join(" ");

  // Fill under actual line
  const actualFillD =
    actualPathD +
    ` L${toX(n - 1).toFixed(1)},${toY(0).toFixed(1)} L${toX(0).toFixed(1)},${toY(0).toFixed(1)} Z`;

  // Y-axis ticks
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) =>
    Math.round((maxY * i) / (yTickCount - 1)),
  );

  // X-axis ticks — ~6 evenly spaced
  const xTickStep = Math.max(1, Math.ceil(n / 6));
  const xTicks = allDays
    .map((day, i) => ({ day, i }))
    .filter(({ i }) => i % xTickStep === 0 || i === n - 1);

  // Sprint health
  const currentRemaining = dailyData[n - 1]?.remaining ?? 0;
  const currentIdeal = dailyData[n - 1]?.ideal ?? 0;
  const behindBy = currentRemaining - currentIdeal;

  // Velocity: completed in last 7 days vs previous 7
  const last7Done = dailyData.slice(-7).reduce((acc, d, idx, arr) => {
    if (idx === 0) return 0;
    return acc + Math.max(0, d.completedSoFar - arr[idx - 1].completedSoFar);
  }, 0);

  const prev7Done = dailyData.slice(-14, -7).reduce((acc, d, idx, arr) => {
    if (idx === 0) return 0;
    return acc + Math.max(0, d.completedSoFar - arr[idx - 1].completedSoFar);
  }, 0);

  const velocityPct =
    prev7Done > 0 ? Math.round(((last7Done - prev7Done) / prev7Done) * 100) : 0;

  // Projected days to done
  const avgPerDay = last7Done / 7 || 0.5;
  const projectedDays =
    currentRemaining <= 0 ? 0 : Math.ceil(currentRemaining / avgPerDay);

  return (
    <div className="card p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.15)" }}
          >
            <Activity size={15} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Sprint Burndown Chart
            </h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Remaining work vs ideal pace ·{" "}
              {range === "quarter" ? "90-day" : "30-day"} sprint
            </p>
          </div>
        </div>

        {/* Health badges */}
        <div className="flex gap-2 flex-wrap">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{
              background:
                behindBy <= 0
                  ? "rgba(16,185,129,0.12)"
                  : "rgba(239,68,68,0.12)",
              color: behindBy <= 0 ? "#10b981" : "#ef4444",
              border: `1px solid ${
                behindBy <= 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"
              }`,
            }}
          >
            {behindBy <= 0
              ? `✓ ${Math.abs(behindBy)} task${Math.abs(behindBy) !== 1 ? "s" : ""} ahead`
              : `⚠ ${behindBy} task${behindBy !== 1 ? "s" : ""} behind`}
          </span>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{
              background:
                velocityPct >= 0
                  ? "rgba(16,185,129,0.12)"
                  : "rgba(245,158,11,0.12)",
              color: velocityPct >= 0 ? "#10b981" : "#f59e0b",
              border: `1px solid ${
                velocityPct >= 0
                  ? "rgba(16,185,129,0.3)"
                  : "rgba(245,158,11,0.3)"
              }`,
            }}
          >
            {velocityPct >= 0 ? "↑" : "↓"} Velocity {Math.abs(velocityPct)}% vs
            last week
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={{ width: "100%", minWidth: 300, display: "block" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="idealFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Y grid lines + labels */}
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD_L}
                y1={toY(v)}
                x2={VB_W - PAD_R}
                y2={toY(v)}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="0.6"
              />
              <text
                x={PAD_L - 4}
                y={toY(v) + 1.5}
                fontSize="6"
                textAnchor="end"
                fill="rgba(255,255,255,0.3)"
              >
                {v}
              </text>
            </g>
          ))}

          {/* Ideal area fill */}
          <path
            d={
              idealPathD +
              ` L${toX(n - 1).toFixed(1)},${toY(0).toFixed(1)} L${toX(0).toFixed(1)},${toY(0).toFixed(1)} Z`
            }
            fill="url(#idealFill)"
          />

          {/* Actual area fill */}
          <path d={actualFillD} fill="url(#burnFill)" />

          {/* Ideal dashed line */}
          <path
            d={idealPathD}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1"
            strokeDasharray="4,3"
          />

          {/* Actual burndown line */}
          <path
            d={actualPathD}
            fill="none"
            stroke="#6366f1"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dot at today */}
          <circle
            cx={toX(n - 1)}
            cy={toY(currentRemaining)}
            r="3.5"
            fill="#6366f1"
            stroke="rgba(99,102,241,0.3)"
            strokeWidth="4"
          />

          {/* X-axis tick labels */}
          {xTicks.map(({ day, i }) => (
            <text
              key={i}
              x={toX(i)}
              y={VB_H - PAD_B + 10}
              fontSize="6"
              textAnchor="middle"
              fill="rgba(255,255,255,0.28)"
            >
              {format(day, "d MMM")}
            </text>
          ))}

          {/* Axes */}
          <line
            x1={PAD_L}
            y1={PAD_T}
            x2={PAD_L}
            y2={VB_H - PAD_B}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.6"
          />
          <line
            x1={PAD_L}
            y1={VB_H - PAD_B}
            x2={VB_W - PAD_R}
            y2={VB_H - PAD_B}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.6"
          />

          {/* Y-axis label */}
          <text
            x={8}
            y={VB_H / 2}
            fontSize="6"
            fill="rgba(255,255,255,0.25)"
            textAnchor="middle"
            transform={`rotate(-90, 8, ${VB_H / 2})`}
          >
            Tasks Remaining
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div
            className="rounded"
            style={{ width: 20, height: 3, background: "#6366f1" }}
          />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Actual remaining
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="20" height="6">
            <line
              x1="0"
              y1="3"
              x2="20"
              y2="3"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />
          </svg>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Ideal pace
          </span>
        </div>
        <span
          className="ml-auto text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {currentRemaining} task{currentRemaining !== 1 ? "s" : ""} remaining
        </span>
      </div>

      {/* Sprint velocity mini-stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[
          {
            icon: Flame,
            label: "Sprint Velocity",
            value: `${last7Done} tasks`,
            sub: "completed last 7 days",
            color: "#818cf8",
          },
          {
            icon: Target,
            label: "Remaining Work",
            value: `${currentRemaining}`,
            sub: "tasks left in sprint",
            color: currentRemaining > currentIdeal ? "#ef4444" : "#10b981",
          },
          {
            icon: TrendingUp,
            label: "Projected Done",
            value:
              currentRemaining <= 0
                ? "✓ Complete"
                : `~${projectedDays} day${projectedDays !== 1 ? "s" : ""}`,
            sub: "at current velocity",
            color: "#f59e0b",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-3 text-center"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-2"
              style={{ background: `${s.color}18` }}
            >
              <s.icon size={13} style={{ color: s.color }} />
            </div>
            <div
              className="text-base font-bold"
              style={{ color: s.color, fontFamily: "var(--font-display)" }}
            >
              {s.value}
            </div>
            <div
              className="text-xs mt-0.5 font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {s.label}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity Heatmap ─────────────────────────────────────
function ActivityHeatmap({ tasks, range }: { tasks: TaskRaw[]; range: Range }) {
  const days = range === "quarter" ? 90 : 30;
  const today = new Date();
  const allDays = eachDayOfInterval({
    start: subDays(today, days - 1),
    end: today,
  });

  const countByDay = allDays.map((day) => ({
    date: day,
    total: tasks.filter((t) =>
      isSameDay(parseISO(t.createdAt.split("T")[0] + "T00:00:00"), day),
    ).length,
    completed: tasks.filter(
      (t) =>
        isSameDay(parseISO(t.createdAt.split("T")[0] + "T00:00:00"), day) &&
        t.status === "COMPLETED",
    ).length,
  }));

  const maxCount = Math.max(...countByDay.map((d) => d.total), 1);

  const getColor = (count: number) => {
    if (count === 0) return "rgba(255,255,255,0.05)";
    const pct = count / maxCount;
    if (pct < 0.25) return "rgba(99,102,241,0.3)";
    if (pct < 0.5) return "rgba(99,102,241,0.5)";
    if (pct < 0.75) return "rgba(99,102,241,0.7)";
    return "#6366f1";
  };

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Flame size={15} style={{ color: "#f59e0b" }} />
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Daily Activity Heatmap
        </h3>
        <span
          className="text-xs ml-auto"
          style={{ color: "var(--text-muted)" }}
        >
          {tasks.length} task{tasks.length !== 1 ? "s" : ""} · {days} days
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {countByDay.map((d, i) => (
          <div
            key={i}
            title={`${format(d.date, "MMM d")} — ${d.total} tasks (${d.completed} completed)`}
            className="rounded-sm cursor-pointer transition-transform hover:scale-110"
            style={{
              width: 14,
              height: 14,
              background: getColor(d.total),
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Less
        </span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: 12,
              height: 12,
              background: getColor(v * maxCount),
            }}
          />
        ))}
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          More
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// ── MAIN PAGE (your existing page + burndown tab added) ─
// ════════════════════════════════════════════════════════
export default function AnalyticsPage() {
  const { activeProfile } = useProfile();
  const router = useRouter();
  const [range, setRange] = useState<Range>("30days");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<"burndown" | "overview" | "ai">(
    "burndown",
  );

  // Manager view
  const [viewingMember, setViewingMember] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [owners, setOwners] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  useEffect(() => {
    api
      .get("/team/my-owners")
      .then((r) => setOwners(r.data))
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setReport(null);
    try {
      let url = `/ai/productivity-report?range=${range}`;
      if (viewingMember)
        url = `/ai/member-report?memberId=${viewingMember.id}&range=${range}`;
      else if (activeProfile?.id) url += `&profileId=${activeProfile.id}`;
      const { data } = await api.get(url);
      setReport(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to generate report";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [range, activeProfile?.id, viewingMember]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDownload = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      const content = [
        `TASKFLOW PRODUCTIVITY REPORT`,
        `Period: ${report.period}`,
        `Generated: ${new Date().toLocaleString()}`,
        ``,
        `OVERALL SUMMARY`,
        `Total Tasks: ${report.overall.total}`,
        `Completed: ${report.overall.completed} (${report.overall.completionRate}%)`,
        `In Progress: ${report.overall.inProgress}`,
        `Pending: ${report.overall.pending}`,
        `Overdue: ${report.overall.overdue}`,
        ``,
        `PROFILE BREAKDOWN`,
        ...report.profileStats.map(
          (p) =>
            `${p.name}: ${p.total} tasks | ${p.completed} completed (${p.completionRate}%) | ${p.overdue} overdue`,
        ),
        ``,
        `AI ANALYSIS`,
        ``,
        report.aiReport,
      ].join("\n");

      const blob = new Blob([content], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `taskflow-analytics-${range}-${
        new Date().toISOString().split("T")[0]
      }.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report downloaded!");
    } finally {
      setDownloading(false);
    }
  };

  const STAT_CARDS = report
    ? [
        {
          label: "Total Tasks",
          value: report.overall.total,
          icon: BarChart2,
          color: "#818cf8",
          bg: "rgba(99,102,241,0.1)",
        },
        {
          label: "Completed",
          value: report.overall.completed,
          icon: CheckCircle2,
          color: "#10b981",
          bg: "rgba(16,185,129,0.1)",
        },
        {
          label: "In Progress",
          value: report.overall.inProgress,
          icon: TrendingUp,
          color: "#f59e0b",
          bg: "rgba(245,158,11,0.1)",
        },
        {
          label: "Overdue",
          value: report.overall.overdue,
          icon: AlertTriangle,
          color: "#ef4444",
          bg: "rgba(239,68,68,0.1)",
        },
        {
          label: "Completion Rate",
          value: `${report.overall.completionRate}%`,
          icon: TrendingUp,
          color: "#6366f1",
          bg: "rgba(99,102,241,0.1)",
        },
        {
          label: "High Priority",
          value: report.overall.highPriority,
          icon: Clock,
          color: "#ef4444",
          bg: "rgba(239,68,68,0.08)",
        },
      ]
    : [];

  const weeklyEntries = report ? Object.entries(report.weeklyData) : [];
  const maxWeekly =
    weeklyEntries.length > 0
      ? Math.max(...weeklyEntries.map(([, v]) => v.total))
      : 1;

  const tasksForCharts: TaskRaw[] = report?.tasks || [];

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 min-h-screen">
        {/* Header — unchanged */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="btn-ghost p-2 rounded-lg"
            >
              <ChevronLeft size={16} />
            </button>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.15)" }}
            >
              <Sparkles size={18} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h1
                className="text-2xl font-bold"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                }}
              >
                Analytics & Insights
              </h1>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {viewingMember
                  ? `Viewing: ${viewingMember.name}`
                  : `AI-powered productivity report · ${
                      activeProfile?.name || "All Profiles"
                    }`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {owners.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowMemberPicker(!showMemberPicker)}
                  className="btn-ghost text-xs px-3 py-2 gap-1.5"
                >
                  <Users size={14} />
                  {viewingMember ? viewingMember.name : "My Report"}
                </button>
                {showMemberPicker && (
                  <div
                    className="absolute right-0 top-10 z-20 rounded-xl shadow-xl overflow-hidden w-48"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <button
                      onClick={() => {
                        setViewingMember(null);
                        setShowMemberPicker(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs transition-colors"
                      style={{
                        color: !viewingMember
                          ? "var(--accent)"
                          : "var(--text-primary)",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,0.05)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      My Report
                    </button>
                    {owners.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => {
                          setViewingMember({ id: o.id, name: o.name });
                          setShowMemberPicker(false);
                        }}
                        className="w-full text-left px-3 py-2.5 text-xs transition-colors"
                        style={{
                          color:
                            viewingMember?.id === o.id
                              ? "var(--accent)"
                              : "var(--text-primary)",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(255,255,255,0.05)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        {o.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div
              className="flex rounded-lg overflow-hidden p-0.5"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              {(["30days", "quarter"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: range === r ? "var(--accent)" : "transparent",
                    color: range === r ? "white" : "var(--text-secondary)",
                  }}
                >
                  {r === "30days" ? "Last 30 Days" : "Last Quarter"}
                </button>
              ))}
            </div>

            <button
              onClick={fetchReport}
              disabled={loading}
              className="btn-ghost p-2 rounded-lg"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            {report && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="btn-primary gap-1.5 text-sm"
              >
                {downloading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Download
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center animate-pulse"
              style={{ background: "rgba(99,102,241,0.15)" }}
            >
              <Sparkles size={24} style={{ color: "var(--accent)" }} />
            </div>
            <div className="text-center">
              <p
                className="font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Generating AI Report…
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Analysing your tasks and productivity patterns
              </p>
            </div>
          </div>
        ) : !report ? null : (
          <>
            {/* ── Tab bar (NEW) ── */}
            <div
              className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              {[
                { id: "burndown", label: "Burndown", icon: Activity },
                { id: "overview", label: "Overview", icon: BarChart2 },
                { id: "ai", label: "AI Report", icon: Sparkles },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id as "burndown" | "overview" | "ai")
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background:
                      activeTab === tab.id ? "var(--accent)" : "transparent",
                    color:
                      activeTab === tab.id ? "white" : "var(--text-secondary)",
                  }}
                >
                  <tab.icon size={13} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ══ OVERVIEW TAB (your existing content, unchanged) ══ */}
            {activeTab === "overview" && (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
                    <div
                      key={label}
                      className="card p-4 flex items-center gap-3"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: bg }}
                      >
                        <Icon size={16} style={{ color }} />
                      </div>
                      <div>
                        <div
                          className="text-xl font-bold"
                          style={{ color, fontFamily: "var(--font-display)" }}
                        >
                          {value}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Completion rate bar */}
                <div className="card p-5 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Overall Completion Rate
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{
                        color:
                          report.overall.completionRate >= 70
                            ? "#10b981"
                            : report.overall.completionRate >= 40
                              ? "#f59e0b"
                              : "#ef4444",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {report.overall.completionRate}%
                    </span>
                  </div>
                  <div
                    className="w-full h-3 rounded-full overflow-hidden"
                    style={{ background: "var(--bg-input)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${report.overall.completionRate}%`,
                        background:
                          report.overall.completionRate >= 70
                            ? "#10b981"
                            : report.overall.completionRate >= 40
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      0%
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Target: 80%
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      100%
                    </span>
                  </div>
                </div>

                {/* Weekly bar chart
                {weeklyEntries.length > 0 && (
                  <div className="card p-5 mb-4">
                    <h3
                      className="text-sm font-semibold mb-4"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Weekly Activity
                    </h3>
                    <div className="flex items-end gap-2 h-32">
                      {weeklyEntries.map(([week, data]) => (
                        <div
                          key={week}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <div
                            className="w-full flex flex-col items-center gap-0.5"
                            style={{ height: 100 }}
                          >
                            <div
                              className="w-full rounded-t-md relative"
                              title={`${data.total} tasks`}
                              style={{
                                height: `${(data.total / maxWeekly) * 100}%`,
                                background: "rgba(99,102,241,0.3)",
                                marginTop: "auto",
                                minHeight: data.total > 0 ? 4 : 0,
                              }}
                            >
                              <div
                                className="absolute bottom-0 left-0 right-0 rounded-t-md"
                                style={{
                                  height: `${
                                    data.total > 0
                                      ? (data.completed / data.total) * 100
                                      : 0
                                  }%`,
                                  background: "#6366f1",
                                  minHeight: data.completed > 0 ? 3 : 0,
                                }}
                              />
                            </div>
                          </div>
                          <span
                            className="text-center"
                            style={{
                              fontSize: 9,
                              color: "var(--text-muted)",
                            }}
                          >
                            {week}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ background: "#6366f1" }}
                        />
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Completed
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ background: "rgba(99,102,241,0.3)" }}
                        />
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Total
                        </span>
                      </div>
                    </div>
                  </div>
                )} */}
                {/* Weekly bar chart */}
                {weeklyEntries.length > 0 && (
                  <div className="card p-5 mb-4">
                    <h3
                      className="text-sm font-semibold mb-5"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Weekly Activity
                    </h3>

                    <div className="flex items-end justify-between h-36 gap-3">
                      {weeklyEntries.map(([week, data]) => {
                        const totalHeight = (data.total / maxWeekly) * 100;
                        const completedHeight =
                          data.total > 0
                            ? (data.completed / data.total) * 100
                            : 0;

                        return (
                          <div
                            key={week}
                            className="flex-1 flex flex-col items-center group"
                          >
                            {/* Bar */}
                            <div className="w-full h-full flex items-end">
                              <div
                                className="w-full rounded-xl relative transition-all duration-300 group-hover:scale-[1.05]"
                                style={{
                                  height: `${totalHeight}%`,
                                  background:
                                    "linear-gradient(to top, rgba(99,102,241,0.15), rgba(99,102,241,0.35))",
                                  minHeight: data.total > 0 ? 6 : 0,
                                }}
                              >
                                {/* Completed overlay */}
                                <div
                                  className="absolute bottom-0 left-0 right-0 rounded-xl"
                                  style={{
                                    height: `${completedHeight}%`,
                                    background:
                                      "linear-gradient(to top, #6366f1, #818cf8)",
                                    minHeight: data.completed > 0 ? 4 : 0,
                                  }}
                                />

                                {/* Tooltip */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition bg-black/80 text-white whitespace-nowrap">
                                  {data.completed}/{data.total}
                                </div>
                              </div>
                            </div>

                            {/* Label */}
                            <span
                              className="mt-2 text-[10px]"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {week}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-end gap-5 mt-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-indigo-500 to-indigo-400" />
                        <span style={{ color: "var(--text-muted)" }}>
                          Completed
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-indigo-500/30" />
                        <span style={{ color: "var(--text-muted)" }}>
                          Total
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Profile breakdown */}
                {report.profileStats.length > 1 && (
                  <div className="card p-5 mb-4">
                    <h3
                      className="text-sm font-semibold mb-4"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Profile Breakdown
                    </h3>
                    <div className="space-y-3">
                      {report.profileStats.map((p) => (
                        <div key={p.id}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ background: p.avatarColor }}
                              >
                                {p.name[0]}
                              </div>
                              <span
                                className="text-sm"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {p.name}
                              </span>
                            </div>
                            <div
                              className="flex items-center gap-3 text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              <span>
                                {p.completed}/{p.total} done
                              </span>
                              <span
                                className="font-semibold"
                                style={{
                                  color:
                                    p.completionRate >= 70
                                      ? "#10b981"
                                      : p.completionRate >= 40
                                        ? "#f59e0b"
                                        : "#ef4444",
                                }}
                              >
                                {p.completionRate}%
                              </span>
                            </div>
                          </div>
                          <div
                            className="w-full h-2 rounded-full"
                            style={{ background: "var(--bg-input)" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${p.completionRate}%`,
                                background: p.avatarColor,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ══ BURNDOWN TAB (NEW) ══ */}
            {activeTab === "burndown" && (
              <div className="space-y-4">
                {tasksForCharts.length > 0 ? (
                  <>
                    <BurndownChart tasks={tasksForCharts} range={range} />
                    <ActivityHeatmap tasks={tasksForCharts} range={range} />
                  </>
                ) : (
                  <div
                    className="card p-12 flex flex-col items-center justify-center text-center"
                    style={{ borderStyle: "dashed" }}
                  >
                    <Activity
                      size={36}
                      style={{ color: "var(--text-muted)" }}
                      className="mb-3"
                    />
                    <p
                      className="font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      No task data for burndown chart
                    </p>
                    <p
                      className="text-sm mt-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Add tasks and come back to see your sprint analysis
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ══ AI REPORT TAB (your existing AI section, moved to tab) ══ */}
            {activeTab === "ai" && (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(99,102,241,0.15)" }}
                  >
                    <Sparkles size={15} style={{ color: "var(--accent)" }} />
                  </div>
                  <div>
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      AI Analysis
                    </h3>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Powered by Llama 3.3 70B · {report.period}
                    </p>
                  </div>
                  <button
                    onClick={fetchReport}
                    disabled={loading}
                    className="ml-auto btn-ghost py-1.5 px-3 text-xs gap-1.5"
                  >
                    <RefreshCw
                      size={12}
                      className={loading ? "animate-spin" : ""}
                    />
                    Regenerate
                  </button>
                </div>
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <MarkdownReport text={report.aiReport} />
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
