"use client";

import { useState, useEffect, FormEvent } from "react";
import toast from "react-hot-toast";
import { Task, TaskStatus, Priority } from "@/types";
import { taskService } from "@/services/taskService";
import { X, Loader2, Sparkles } from "lucide-react";
import api from "@/lib/api";

interface TaskModalProps {
  task?: Task | null;
  profileId: string;
  defaultDueDate?: string;
  onClose: () => void;
  onSaved: (task: Task) => void;
}

const STATUS_OPTS: { value: TaskStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
];

const PRIORITY_OPTS: { value: Priority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

export default function TaskModal({
  task,
  profileId,
  defaultDueDate,
  onClose,
  onSaved,
}: TaskModalProps) {
  const isEdit = !!task;
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<TaskStatus>(task?.status || "PENDING");
  const [priority, setPriority] = useState<Priority>(
    task?.priority || "MEDIUM",
  );
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? task.dueDate.split("T")[0] : defaultDueDate || "",
  );
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);
  const [progress, setProgress] = useState(task?.progress ?? 0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleImproveWithAI = async () => {
    if (!title.trim()) {
      toast.error("Enter a title first");
      return;
    }
    setImproving(true);
    try {
      const { data } = await api.post("/ai/improve-task", {
        title,
        description,
      });
      setTitle(data.title);
      setDescription(data.description);
      setAiApplied(true);
      toast.success("✨ Improved with AI!");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "AI error";
      // Show helpful message for cold start
      if (msg.includes("loading")) {
        toast.error(
          "🔄 AI model is warming up — please try again in 20 seconds",
          { duration: 5000 },
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setImproving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        progress, // ✅ ADD THIS
        dueDate: dueDate || null,
        profileId,
      };
      const saved = isEdit
        ? await taskService.update(task!.id, payload)
        : await taskService.create(payload);
      toast.success(isEdit ? "Task updated!" : "Task created!");
      onSaved(saved);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg card p-6 animate-scale-in"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {isEdit ? "Edit task" : "New task"}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-md">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title + AI button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Title *</label>
              <button
                type="button"
                onClick={handleImproveWithAI}
                disabled={improving || !title.trim()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: aiApplied
                    ? "rgba(16,185,129,0.12)"
                    : "rgba(99,102,241,0.12)",
                  color: aiApplied ? "#10b981" : "var(--accent)",
                  border: `1px solid ${aiApplied ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)"}`,
                  opacity: !title.trim() ? 0.4 : 1,
                }}
                onMouseEnter={(e) => {
                  if (title.trim())
                    (e.currentTarget as HTMLElement).style.background =
                      aiApplied
                        ? "rgba(16,185,129,0.22)"
                        : "rgba(99,102,241,0.22)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = aiApplied
                    ? "rgba(16,185,129,0.12)"
                    : "rgba(99,102,241,0.12)";
                }}
              >
                {improving ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Sparkles size={11} />
                )}
                {improving
                  ? "Improving…"
                  : aiApplied
                    ? "✓ AI Applied"
                    : "Edit with AI"}
              </button>
            </div>
            <input
              type="text"
              className="input"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setAiApplied(false);
              }}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              placeholder="Optional details…"
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setAiApplied(false);
              }}
            />
          </div>

          {/* AI suggestion banner */}
          {aiApplied && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
                color: "#10b981",
              }}
            >
              <Sparkles size={12} />
              Title and description have been improved by AI. You can still edit
              them.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {STATUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                className="input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                {PRIORITY_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Progress ({progress}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="label">Due date</label>
            <input
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading || !title.trim()}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? "Saving…" : isEdit ? "Save changes" : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
