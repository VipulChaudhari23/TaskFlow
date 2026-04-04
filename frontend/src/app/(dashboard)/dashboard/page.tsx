"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Task, TaskStatus, Priority, TaskFilters } from "@/types";
import { taskService } from "@/services/taskService";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import TaskCard from "@/components/TaskCard";
import TaskModal from "@/components/TaskModal";
import { useProfile } from "@/context/ProfileContext";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  Plus,
  Search,
  Loader2,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  LayoutList,
  Columns3,
  CalendarDays,
  ChevronDown,
  UserCircle2,
} from "lucide-react";

type ViewMode = "list" | "kanban" | "calendar";

const STATUS_COLS: {
  status: TaskStatus;
  label: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    status: "PENDING",
    label: "Pending",
    color: "#818cf8",
    bg: "rgba(99,102,241,0.08)",
    border: "rgba(99,102,241,0.3)",
  },
  {
    status: "IN_PROGRESS",
    label: "In Progress",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.3)",
  },
  {
    status: "COMPLETED",
    label: "Completed",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.3)",
  },
];

const PRIORITY_DOT: Record<string, string> = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeProfile, setActiveProfile } = useProfile();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarSelectedDay, setCalendarSelectedDay] = useState<Date | null>(
    null
  );
  const [searchInput, setSearchInput] = useState("");
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

  const [filters, setFilters] = useState<TaskFilters>({
    page: 1,
    limit: 10,
    status: "",
    priority: "",
    search: "",
    profileId: activeProfile?.id || "",
  });

  const fetchTasks = useCallback(async () => {
    if (!activeProfile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await taskService.getAll({
        ...filters,
        profileId: activeProfile.id,
      });
      setTasks(res.tasks);
      setTotalPages(res.pagination.totalPages);
      if (!filters.status && !filters.priority && !filters.search) {
        setTotal(res.pagination.total);
      }
      const [p, ip, c] = await Promise.all([
        taskService.getAll({
          status: "PENDING",
          limit: 1,
          profileId: activeProfile.id,
        }),
        taskService.getAll({
          status: "IN_PROGRESS",
          limit: 1,
          profileId: activeProfile.id,
        }),
        taskService.getAll({
          status: "COMPLETED",
          limit: 1,
          profileId: activeProfile.id,
        }),
      ]);
      setStats({
        pending: p.pagination.total,
        inProgress: ip.pagination.total,
        completed: c.pagination.total,
      });
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [filters, activeProfile?.id]);

  const fetchAllTasks = useCallback(async () => {
    if (!activeProfile?.id) return;
    try {
      const res = await taskService.getAll({
        profileId: activeProfile.id,
        limit: 200,
      });
      setAllTasks(res.tasks);
    } catch {
      /* silent */
    }
  }, [activeProfile?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  useEffect(() => {
    fetchAllTasks();
  }, [fetchAllTasks]);

  useEffect(() => {
    const t = setTimeout(
      () => setFilters((f) => ({ ...f, search: searchInput, page: 1 })),
      350
    );
    return () => clearTimeout(t);
  }, [searchInput]);

  const setFilter = (key: keyof TaskFilters, value: string | number) =>
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const refreshAll = async () => {
    await fetchTasks();
    await fetchAllTasks();
  };

  const handleSaved = async (saved: Task) => {
    if (editingTask)
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    else {
      setTasks((prev) => [saved, ...prev]);
      setTotal((n) => n + 1);
    }
    await refreshAll();
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };
  const handleDeleted = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setAllTasks((prev) => prev.filter((t) => t.id !== id));
    setTotal((n) => Math.max(0, n - 1));
    await refreshAll();
  };
  const handleToggled = async (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setAllTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    await refreshAll();
  };

  const tasksByStatus = (status: TaskStatus) =>
    allTasks.filter((t) => t.status === status);

  const calStart = startOfWeek(startOfMonth(calendarDate));
  const calEnd = endOfWeek(endOfMonth(calendarDate));
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });
  const tasksOnDay = (day: Date) =>
    allTasks.filter((t) => isSameDay(new Date(t.createdAt), day));
  const selectedDayTasks = calendarSelectedDay
    ? tasksOnDay(calendarSelectedDay)
    : [];

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{
                background: activeProfile?.avatarColor || "var(--accent)",
              }}
            >
              {activeProfile?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <h1
                className="text-2xl font-bold leading-tight"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {activeProfile?.name}&apos;s Tasks
              </h1>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {user?.name} · {total} total task{total !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View switcher */}
            <div
              className="flex rounded-lg overflow-hidden p-0.5"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              {(
                [
                  { mode: "list", Icon: LayoutList, title: "List" },
                  { mode: "kanban", Icon: Columns3, title: "Kanban" },
                  { mode: "calendar", Icon: CalendarDays, title: "Calendar" },
                ] as const
              ).map(({ mode, Icon, title }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  title={title}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background:
                      viewMode === mode ? "var(--accent)" : "transparent",
                    color:
                      viewMode === mode ? "white" : "var(--text-secondary)",
                  }}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{title}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setActiveProfile(null);
                router.push("/profiles");
              }}
              className="btn-ghost text-xs px-3 py-2 gap-1.5"
            >
              <UserCircle2 size={14} /> Switch
            </button>

            <button
              onClick={() => {
                setEditingTask(null);
                setModalOpen(true);
              }}
              className="btn-primary gap-1.5"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">New task</span>
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            {
              label: "Pending",
              count: stats.pending,
              color: "#818cf8",
              bg: "rgba(99,102,241,0.08)",
              key: "PENDING",
            },
            {
              label: "In Progress",
              count: stats.inProgress,
              color: "#f59e0b",
              bg: "rgba(245,158,11,0.08)",
              key: "IN_PROGRESS",
            },
            {
              label: "Completed",
              count: stats.completed,
              color: "#10b981",
              bg: "rgba(16,185,129,0.08)",
              key: "COMPLETED",
            },
          ].map((s) => (
            <div
              key={s.label}
              onClick={() => {
                if (viewMode !== "list") setViewMode("list");
                setFilter("status", filters.status === s.key ? "" : s.key);
              }}
              className="rounded-xl p-4 text-center cursor-pointer transition-all duration-150 select-none"
              style={{
                background: s.bg,
                border:
                  filters.status === s.key
                    ? `1.5px solid ${s.color}`
                    : "1.5px solid transparent",
              }}
            >
              <div
                className="text-2xl font-bold"
                style={{ color: s.color, fontFamily: "var(--font-display)" }}
              >
                {s.count}
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── LIST VIEW ── */}
        {viewMode === "list" && (
          <>
            {/* Search + filters */}
            <div className="space-y-2 mb-5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <input
                    type="text"
                    className="input pl-9 text-sm"
                    placeholder="Search tasks…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="btn-ghost px-3 gap-1.5"
                  style={{ color: showFilters ? "var(--accent)" : undefined }}
                >
                  <SlidersHorizontal size={14} />
                  <span className="hidden sm:inline text-xs">Filters</span>
                  {(filters.status || filters.priority) && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--accent)" }}
                    />
                  )}
                </button>
              </div>

              {showFilters && (
                <div className="flex gap-2 flex-wrap">
                  {(["", "PENDING", "IN_PROGRESS", "COMPLETED"] as const).map(
                    (v) => (
                      <button
                        key={v}
                        onClick={() => setFilter("status", v)}
                        className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                        style={{
                          background:
                            filters.status === v
                              ? "var(--accent)"
                              : "var(--bg-card)",
                          color:
                            filters.status === v
                              ? "white"
                              : "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {v === "" ? "All status" : v.replace("_", " ")}
                      </button>
                    )
                  )}
                  <span style={{ color: "var(--border)", alignSelf: "center" }}>
                    |
                  </span>
                  {(["", "LOW", "MEDIUM", "HIGH"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setFilter("priority", v)}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1"
                      style={{
                        background: "var(--bg-card)",
                        color:
                          filters.priority === v
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                        border:
                          filters.priority === v
                            ? `1px solid ${
                                v ? PRIORITY_DOT[v] : "var(--accent)"
                              }`
                            : "1px solid var(--border)",
                      }}
                    >
                      {v && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: PRIORITY_DOT[v] }}
                        />
                      )}
                      {v === "" ? "All priority" : v}
                    </button>
                  ))}
                  {(filters.status || filters.priority || filters.search) && (
                    <button
                      onClick={() => {
                        setFilters({
                          page: 1,
                          limit: 10,
                          status: "",
                          priority: "",
                          search: "",
                          profileId: activeProfile?.id,
                        });
                        setSearchInput("");
                      }}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{
                        color: "var(--danger)",
                        border: "1px solid rgba(239,68,68,0.3)",
                      }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2
                  size={24}
                  className="animate-spin"
                  style={{ color: "var(--accent)" }}
                />
              </div>
            ) : tasks.length === 0 ? (
              <div
                className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
                style={{ border: "1.5px dashed var(--border)" }}
              >
                <ListTodo
                  size={36}
                  style={{ color: "var(--text-muted)" }}
                  className="mb-3"
                />
                <p
                  className="font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No tasks yet
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {filters.search || filters.status || filters.priority
                    ? "No tasks match your filters"
                    : "Create your first task to get started"}
                </p>
                {!filters.search && !filters.status && !filters.priority && (
                  <button
                    onClick={() => setModalOpen(true)}
                    className="btn-primary mt-4 gap-1.5"
                  >
                    <Plus size={14} /> New task
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEdit}
                    onDeleted={handleDeleted}
                    onToggled={handleToggled}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-5">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Page {filters.page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        page: Math.max(1, (f.page || 1) - 1),
                      }))
                    }
                    disabled={(filters.page || 1) <= 1}
                    className="btn-ghost py-1.5 px-3"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        page: Math.min(totalPages, (f.page || 1) + 1),
                      }))
                    }
                    disabled={(filters.page || 1) >= totalPages}
                    className="btn-primary py-1.5 px-3"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── KANBAN VIEW ── */}
        {viewMode === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STATUS_COLS.map((col) => {
              const colTasks = tasksByStatus(col.status);
              return (
                <div
                  key={col.status}
                  className="rounded-2xl flex flex-col"
                  style={{
                    background: col.bg,
                    border: `1px solid ${col.border}`,
                    minHeight: 400,
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: col.border }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: col.color }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: col.color }}
                      >
                        {col.label}
                      </span>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        color: col.color,
                      }}
                    >
                      {colTasks.length}
                    </span>
                  </div>

                  <div
                    className="flex-1 p-3 space-y-2 overflow-y-auto"
                    style={{ maxHeight: 520 }}
                  >
                    {colTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-center">
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          No tasks here
                        </p>
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          onEdit={handleEdit}
                          onToggle={async () => {
                            const updated = await taskService.toggle(task.id);
                            await handleToggled(updated);
                          }}
                          onDelete={async () => {
                            if (!confirm("Delete this task?")) return;
                            await taskService.delete(task.id);
                            toast.success("Task deleted");
                            await handleDeleted(task.id);
                          }}
                        />
                      ))
                    )}
                  </div>

                  <div className="p-3 pt-0">
                    <button
                      onClick={() => {
                        setEditingTask(null);
                        setModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{
                        border: `1px dashed ${col.border}`,
                        color: col.color,
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          "rgba(255,255,255,0.04)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          "transparent")
                      }
                    >
                      <Plus size={13} /> Add task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CALENDAR VIEW ── */}
        {viewMode === "calendar" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Calendar grid */}
            <div
              className="lg:col-span-2 rounded-2xl overflow-hidden"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              {/* Month nav */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <h2
                  className="font-bold text-lg"
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {format(calendarDate, "MMMM yyyy")}
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setCalendarDate(subMonths(calendarDate, 1));
                      setCalendarSelectedDay(null);
                    }}
                    className="btn-ghost p-2 rounded-lg"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => {
                      setCalendarDate(new Date());
                      setCalendarSelectedDay(new Date());
                    }}
                    className="btn-ghost px-3 py-1.5 text-xs"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      setCalendarDate(addMonths(calendarDate, 1));
                      setCalendarSelectedDay(null);
                    }}
                    className="btn-ghost p-2 rounded-lg"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div
                className="grid grid-cols-7 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-xs font-semibold"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calDays.map((day, i) => {
                  const dayTasks = tasksOnDay(day);
                  const isSelected =
                    calendarSelectedDay && isSameDay(day, calendarSelectedDay);
                  const inMonth = isSameMonth(day, calendarDate);
                  const todayDay = isToday(day);
                  return (
                    <div
                      key={i}
                      onClick={() => setCalendarSelectedDay(day)}
                      className="relative cursor-pointer transition-all duration-150"
                      style={{
                        minHeight: 80,
                        padding: "6px",
                        borderRight:
                          (i + 1) % 7 !== 0
                            ? "1px solid var(--border)"
                            : "none",
                        borderBottom:
                          i < calDays.length - 7
                            ? "1px solid var(--border)"
                            : "none",
                        background: isSelected
                          ? "rgba(99,102,241,0.12)"
                          : todayDay
                          ? "rgba(99,102,241,0.05)"
                          : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected)
                          (e.currentTarget as HTMLElement).style.background =
                            "rgba(255,255,255,0.03)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected)
                          (e.currentTarget as HTMLElement).style.background =
                            todayDay ? "rgba(99,102,241,0.05)" : "transparent";
                      }}
                    >
                      <div
                        className="w-6 h-6 flex items-center justify-center rounded-full mb-1"
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          background: todayDay
                            ? "var(--accent)"
                            : "transparent",
                          color: todayDay
                            ? "white"
                            : inMonth
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                        }}
                      >
                        {format(day, "d")}
                      </div>

                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 3).map((task) => (
                          <div
                            key={task.id}
                            className="truncate rounded text-white leading-none"
                            style={{
                              fontSize: 10,
                              padding: "2px 4px",
                              background:
                                task.status === "COMPLETED"
                                  ? "rgba(16,185,129,0.65)"
                                  : task.status === "IN_PROGRESS"
                                  ? "rgba(245,158,11,0.65)"
                                  : "rgba(99,102,241,0.65)",
                            }}
                          >
                            {task.title}
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div
                            style={{
                              fontSize: 9,
                              color: "var(--text-muted)",
                              textAlign: "center",
                            }}
                          >
                            +{dayTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side panel */}
            <div
              className="rounded-2xl flex flex-col"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="px-5 py-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <h3
                  className="font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {calendarSelectedDay
                    ? format(calendarSelectedDay, "EEEE, MMM d")
                    : "Select a day"}
                </h3>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {calendarSelectedDay
                    ? `${selectedDayTasks.length} task${
                        selectedDayTasks.length !== 1 ? "s" : ""
                      } due`
                    : "Click a date to see tasks"}
                </p>
              </div>

              <div
                className="flex-1 p-4 overflow-y-auto space-y-2"
                style={{ maxHeight: 440 }}
              >
                {!calendarSelectedDay ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <CalendarDays
                      size={28}
                      style={{ color: "var(--text-muted)" }}
                      className="mb-2"
                    />
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Pick a day on the calendar
                    </p>
                  </div>
                ) : selectedDayTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      No tasks due
                    </p>
                    <button
                      onClick={() => setModalOpen(true)}
                      className="btn-primary mt-3 text-xs gap-1.5 py-2 px-3"
                    >
                      <Plus size={13} /> Add task
                    </button>
                  </div>
                ) : (
                  selectedDayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl p-3 group transition-all cursor-pointer"
                      style={{
                        background: "var(--bg-input)",
                        border: "1px solid var(--border)",
                      }}
                      onClick={() => handleEdit(task)}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ background: PRIORITY_DOT[task.priority] }}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-sm font-medium truncate"
                            style={{
                              color: "var(--text-primary)",
                              textDecoration:
                                task.status === "COMPLETED"
                                  ? "line-through"
                                  : "none",
                            }}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p
                              className="text-xs mt-0.5 line-clamp-1"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {task.description}
                            </p>
                          )}
                          <span
                            className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background:
                                task.status === "COMPLETED"
                                  ? "rgba(16,185,129,0.15)"
                                  : task.status === "IN_PROGRESS"
                                  ? "rgba(245,158,11,0.15)"
                                  : "rgba(99,102,241,0.15)",
                              color:
                                task.status === "COMPLETED"
                                  ? "#10b981"
                                  : task.status === "IN_PROGRESS"
                                  ? "#f59e0b"
                                  : "#818cf8",
                            }}
                          >
                            {task.status.replace("_", " ")}
                          </span>
                          {/* ADD THIS BELOW THE STATUS BADGE */}
                          {task.dueDate && (
                            <p
                              className="text-xs mt-1 flex items-center gap-1"
                              style={{
                                color:
                                  new Date(task.dueDate) < new Date() &&
                                  task.status !== "COMPLETED"
                                    ? "var(--danger)"
                                    : "var(--text-muted)",
                              }}
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <rect
                                  x="3"
                                  y="4"
                                  width="18"
                                  height="18"
                                  rx="2"
                                />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              Due:{" "}
                              {format(new Date(task.dueDate), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {calendarSelectedDay && (
                <div className="p-4 pt-0">
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      setModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all"
                    style={{
                      border: "1px dashed var(--border)",
                      color: "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.borderColor =
                        "var(--accent)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.borderColor =
                        "var(--border)")
                    }
                  >
                    <Plus size={13} /> Add task for this day
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {modalOpen && (
        <TaskModal
          task={editingTask}
          profileId={activeProfile?.id || ""}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
          onSaved={handleSaved}
          defaultDueDate={
            viewMode === "calendar" && calendarSelectedDay
              ? format(calendarSelectedDay, "yyyy-MM-dd")
              : undefined
          }
        />
      )}
    </>
  );
}

// ── Kanban card ──
function KanbanCard({
  task,
  onEdit,
  onToggle,
  onDelete,
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      className="rounded-xl p-3 group transition-all duration-150 relative"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor =
          "rgba(255,255,255,0.15)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = "var(--border)")
      }
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p
          className="text-sm font-medium leading-snug flex-1"
          style={{
            color: "var(--text-primary)",
            textDecoration:
              task.status === "COMPLETED" ? "line-through" : "none",
          }}
        >
          {task.title}
        </p>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded transition-all"
            style={{
              color: "var(--text-muted)",
              background: "var(--bg-input)",
            }}
          >
            <ChevronDown size={12} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-7 z-20 rounded-xl shadow-xl overflow-hidden"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                width: 130,
              }}
            >
              {[
                {
                  label: "Edit",
                  action: () => {
                    onEdit(task);
                    setMenuOpen(false);
                  },
                  color: "var(--text-primary)",
                },
                {
                  label:
                    task.status === "COMPLETED"
                      ? "Mark pending"
                      : "Mark complete",
                  action: () => {
                    onToggle();
                    setMenuOpen(false);
                  },
                  color: "var(--text-primary)",
                },
                {
                  label: "Delete",
                  action: () => {
                    onDelete();
                    setMenuOpen(false);
                  },
                  color: "var(--danger)",
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full text-left px-3 py-2 text-xs transition-colors"
                  style={{ color: item.color }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.05)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "transparent")
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {task.description && (
        <p
          className="text-xs mb-2 line-clamp-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: PRIORITY_DOT[task.priority] }}
          title={task.priority}
        />
        {task.dueDate && (
          <span
            className="text-xs"
            style={{
              color:
                new Date(task.dueDate) < new Date() &&
                task.status !== "COMPLETED"
                  ? "var(--danger)"
                  : "var(--text-muted)",
            }}
          >
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        )}
      </div>
    </div>
  );
}
