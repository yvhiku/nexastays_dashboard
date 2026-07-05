"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@nexastays.ma");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Login failed. Check credentials.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-nexa-bg px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="font-display text-2xl font-semibold text-nexa-ink">
          Nexa Stays Admin
        </h1>
        <p className="mt-1 text-sm text-nexa-ink-3">
          Sign in with your Identity admin account.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="text-nexa-ink-3">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-nexa-line px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-nexa-ink-3">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-nexa-line px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-sm text-nexa-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
