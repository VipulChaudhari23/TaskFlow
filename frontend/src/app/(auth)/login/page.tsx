"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // const handleSubmit = async (e: FormEvent) => {
  //   e.preventDefault();
  //   if (!email || !password) return;
  //   setLoading(true);
  //   try {
  //     await login(email, password);
  //     toast.success('Welcome back!');
  //     router.push('/dashboard');
  //   } catch (err: unknown) {
  //     const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
  //     toast.error(msg);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string }; status?: number };
      };
      const msg =
        axiosErr?.response?.data?.message ||
        (axiosErr?.response?.status === 401
          ? "Invalid email or password"
          : "Login failed. Please try again.");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-8 animate-scale-in">
      <h1
        className="text-2xl font-bold mb-1"
        style={{
          color: "var(--text-primary)",
          fontFamily: "var(--font-display)",
        }}
      >
        Sign in
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Welcome back — your tasks await.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              className="input pr-10"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary w-full mt-2"
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p
        className="text-center text-sm mt-6"
        style={{ color: "var(--text-secondary)" }}
      >
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          style={{ color: "var(--accent)" }}
          className="font-medium hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
