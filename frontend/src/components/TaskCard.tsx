"use client";

import { useEffect, useState } from "react";
import { Task } from "@/types";
import { taskService } from "@/services/taskService";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  Calendar,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDeleted: (id: string) => void;
  onToggled: (task: Task) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

export default function TaskCard({
  task,
  onEdit,
  onDeleted,
  onToggled,
}: TaskCardProps) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isCompleted = task.status === "COMPLETED";
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const loadComments = async () => {
    const data = await taskService.getComments(task.id);
    setComments(data);
  };

  const loadHistory = async () => {
    const data = await taskService.getHistory(task.id);
    setHistory(data);
  };

  useEffect(() => {
    if (expanded) loadComments();
  }, [expanded]);

  useEffect(() => {
    if (expanded) {
      loadComments();
      loadHistory(); // ✅ ADD
    }
  }, [expanded]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const updated = await taskService.toggle(task.id);
      onToggled(updated);
    } catch {
      toast.error("Failed to update task");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return;
    setDeleting(true);
    try {
      await taskService.delete(task.id);
      toast.success("Task deleted");
      onDeleted(task.id);
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="card p-4 transition-all duration-200 group animate-fade-in"
      style={{
        opacity: isCompleted ? 0.7 : 1,
        borderColor: isCompleted ? "transparent" : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="mt-0.5 shrink-0 transition-transform duration-150 hover:scale-110"
          style={{
            color: isCompleted ? "var(--success)" : "var(--text-muted)",
          }}
          aria-label={isCompleted ? "Mark as pending" : "Mark as complete"}
        >
          {isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="font-medium text-sm truncate"
              style={{
                color: "var(--text-primary)",
                textDecoration: isCompleted ? "line-through" : "none",
              }}
            >
              {task.title}
            </h3>

            {/* Priority dot */}
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: PRIORITY_COLORS[task.priority] }}
              title={`${task.priority} priority`}
            />

            {/* Status badge */}
            <span
              className="badge text-xs shrink-0"
              style={{
                background:
                  task.status === "COMPLETED"
                    ? "rgba(16,185,129,0.12)"
                    : task.status === "IN_PROGRESS"
                      ? "rgba(245,158,11,0.12)"
                      : "rgba(99,102,241,0.12)",
                color:
                  task.status === "COMPLETED"
                    ? "#10b981"
                    : task.status === "IN_PROGRESS"
                      ? "#f59e0b"
                      : "var(--accent)",
              }}
            >
              {STATUS_LABELS[task.status]}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2">
            <div
              className="w-full h-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${task.progress}%`,
                  background:
                    task.progress === 100
                      ? "#10b981"
                      : task.progress > 0
                        ? "#6366f1"
                        : "transparent",
                }}
              />
            </div>
            <span
              className="text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              {task.progress}%
            </span>
          </div>

          {/* Description expand */}
          {task.description && (
            <div className="mt-1">
              <p
                className="text-xs leading-relaxed"
                style={{
                  color: "var(--text-secondary)",
                  display: expanded ? "block" : "-webkit-box",
                  WebkitLineClamp: expanded ? undefined : 2,
                  WebkitBoxOrient: "vertical",
                  overflow: expanded ? "visible" : "hidden",
                }}
              >
                {task.description}
              </p>
              {task.description.length > 80 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs mt-0.5 flex items-center gap-0.5"
                  style={{ color: "var(--accent)" }}
                >
                  {expanded ? (
                    <>
                      <ChevronUp size={12} /> Less
                    </>
                  ) : (
                    <>
                      <ChevronDown size={12} /> More
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {expanded && (
            <div className="mt-3">
              <div className="space-y-1 mb-2">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="text-xs p-2 rounded-md bg-black/20"
                  >
                    <div>{c.message}</div>
                    <div className="text-[10px] opacity-60">
                      {c.status} •{" "}
                      {format(new Date(c.createdAt), "MMM d, HH:mm")}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  className="input text-xs"
                  placeholder="Add update..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button
                  className="btn-primary text-xs px-2"
                  onClick={async () => {
                    if (!newComment.trim()) return;
                    await taskService.addComment({
                      taskId: task.id,
                      message: newComment,
                      status: task.status,
                    });
                    setNewComment("");
                    loadComments();
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {expanded && history.length > 0 && (
            <div className="mt-4">
              <h4
                className="text-xs font-semibold mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Activity
              </h4>

              <div
                className="space-y-2 border-l pl-3"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                {history.map((h) => {
                  const changes = JSON.parse(h.changes || "{}");

                  return (
                    <div key={h.id} className="relative text-xs">
                      {/* Dot */}
                      <div
                        className="absolute -left-[7px] top-1 w-2 h-2 rounded-full"
                        style={{ background: "#6366f1" }}
                      />

                      <div className="bg-black/20 rounded-md p-2">
                        {/* Action */}
                        <div
                          className="font-medium text-[11px]"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {h.action === "UPDATED"
                            ? "Task updated"
                            : h.action === "COMMENT_ADDED"
                              ? "Comment added"
                              : h.action}
                        </div>

                        {/* Changes */}
                        <div className="mt-1 space-y-1">
                          {Object.entries(changes).map(([key, value]: any) => (
                            <div key={key} className="text-[10px]">
                              <span style={{ color: "var(--text-muted)" }}>
                                {key}:
                              </span>{" "}
                              <span style={{ color: "#ef4444" }}>
                                {String(value.old)}
                              </span>{" "}
                              →{" "}
                              <span style={{ color: "#10b981" }}>
                                {String(value.new)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Timestamp */}
                        <div className="text-[10px] mt-1 opacity-60">
                          {format(new Date(h.createdAt), "MMM d, HH:mm")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 mt-2">
            {task.dueDate && (
              <span
                className="flex items-center gap-1 text-xs"
                style={{
                  color:
                    new Date(task.dueDate) < new Date() && !isCompleted
                      ? "var(--danger)"
                      : "var(--text-muted)",
                }}
              >
                <Calendar size={11} />
                {format(new Date(task.dueDate), "MMM d, yyyy")}
              </span>
            )}
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <Clock size={11} />
              {format(new Date(task.createdAt), "MMM d")}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
            aria-label="Edit task"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--danger)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
            aria-label="Delete task"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
