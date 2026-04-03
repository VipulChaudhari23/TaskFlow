"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Task, TaskStatus, Priority, TaskFilters } from "@/types";
import { taskService } from "@/services/taskService";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import TaskCard from "@/components/TaskCard";
import TaskModal from "@/components/TaskModal";
import {
  Plus,
  Search,
  Loader2,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

const STATUS_OPTS = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
];

const PRIORITY_OPTS = [
  { value: "", label: "All priorities" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<TaskFilters>({
    page: 1,
    limit: 10,
    status: "",
    priority: "",
    search: "",
  });

  const [searchInput, setSearchInput] = useState("");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taskService.getAll(filters);
      setTasks(res.tasks);
      setTotalPages(res.pagination.totalPages);

      // Only update the header total when no filters are active
      if (!filters.status && !filters.priority && !filters.search) {
        setTotal(res.pagination.total);
      }

      // Always fetch unfiltered counts for the stats bar
      const [pendingRes, inProgressRes, completedRes] = await Promise.all([
        taskService.getAll({ status: "PENDING", limit: 1 }),
        taskService.getAll({ status: "IN_PROGRESS", limit: 1 }),
        taskService.getAll({ status: "COMPLETED", limit: 1 }),
      ]);
      setStats({
        pending: pendingRes.pagination.total,
        inProgress: inProgressRes.pagination.total,
        completed: completedRes.pagination.total,
      });
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput, page: 1 }));
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const setFilter = (key: keyof TaskFilters, value: string | number) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  };

  const handleSaved = (saved: Task) => {
    if (editingTask) {
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    } else {
      setTasks((prev) => [saved, ...prev]);
      setTotal((n) => n + 1);
    }
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleDeleted = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setTotal((n) => Math.max(0, n - 1));
  };

  // const handleToggled = (updated: Task) => {
  //   setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  // };
  const handleToggled = async (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    // Refresh stats
    try {
      const [pendingRes, inProgressRes, completedRes] = await Promise.all([
        taskService.getAll({ status: "PENDING", limit: 1 }),
        taskService.getAll({ status: "IN_PROGRESS", limit: 1 }),
        taskService.getAll({ status: "COMPLETED", limit: 1 }),
      ]);
      setStats({
        pending: pendingRes.pagination.total,
        inProgress: inProgressRes.pagination.total,
        completed: completedRes.pagination.total,
      });
    } catch {
      // silent
    }
  };

  const openCreate = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  return (
    <>
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              className="text-3xl font-bold mb-1"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
              }}
            >
              My Tasks
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Welcome back, {user?.name?.split(" ")[0]} — {total} task
              {total !== 1 ? "s" : ""} total
            </p>
          </div>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} />
            <span className="hidden sm:inline">New task</span>
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: "Pending",
              count: stats.pending,
              color: "var(--accent)",
              bg: "rgba(99,102,241,0.08)",
            },
            {
              label: "In Progress",
              count: stats.inProgress,
              color: "#f59e0b",
              bg: "rgba(245,158,11,0.08)",
            },
            {
              label: "Completed",
              count: stats.completed,
              color: "#10b981",
              bg: "rgba(16,185,129,0.08)",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="card p-4 text-center cursor-pointer transition-all duration-150"
              style={{
                background: s.bg,
                border:
                  filters.status ===
                  (s.label === "In Progress"
                    ? "IN_PROGRESS"
                    : s.label.toUpperCase())
                    ? "2px solid #38bdf8" // light blue border
                    : "2px solid transparent",
              }}
              onClick={() => {
                const statusMap: Record<string, string> = {
                  Pending: "PENDING",
                  "In Progress": "IN_PROGRESS",
                  Completed: "COMPLETED",
                };
                const newStatus = statusMap[s.label];
                // Toggle off if already selected
                if (filters.status === newStatus) {
                  setFilter("status", "");
                } else {
                  setFilter("status", newStatus);
                }
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

        {/* Search + Filters */}
        <div className="space-y-3 mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                type="text"
                className="input pl-9"
                placeholder="Search tasks…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-ghost px-3 gap-1.5 ${
                showFilters ? "text-accent" : ""
              }`}
              style={{ color: showFilters ? "var(--accent)" : undefined }}
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline text-xs">Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="flex gap-2 flex-wrap animate-slide-up">
              <select
                className="input py-2 text-xs w-auto"
                value={filters.status}
                onChange={(e) =>
                  setFilter("status", e.target.value as TaskStatus | "")
                }
              >
                {STATUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                className="input py-2 text-xs w-auto"
                value={filters.priority}
                onChange={(e) =>
                  setFilter("priority", e.target.value as Priority | "")
                }
              >
                {PRIORITY_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {(filters.status || filters.priority || filters.search) && (
                <button
                  onClick={() => {
                    setFilters({
                      page: 1,
                      limit: 10,
                      status: "",
                      priority: "",
                      search: "",
                    });
                    setSearchInput("");
                  }}
                  className="btn-ghost px-3 py-2 text-xs"
                  style={{ color: "var(--danger)" }}
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {/* Task list */}
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
            className="card flex flex-col items-center justify-center py-20 text-center"
            style={{ borderStyle: "dashed" }}
          >
            <ListTodo
              size={40}
              style={{ color: "var(--text-muted)" }}
              className="mb-3"
            />
            <p
              className="font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              No tasks yet
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {filters.search || filters.status || filters.priority
                ? "No tasks match your filters"
                : "Create your first task to get started"}
            </p>
            {!filters.search && !filters.status && !filters.priority && (
              <button onClick={openCreate} className="btn-primary mt-4">
                <Plus size={15} /> New task
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
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
      </main>

      {/* Modal */}
      {modalOpen && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
