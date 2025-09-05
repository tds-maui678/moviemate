import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErr("");

    try {
      // Call API
      const { data } = await api.post("/api/auth/login", { email, password });
      // data = { token, user: { id, name, email, role } }

      // Save to auth context (this also sets the Authorization header if you used my auth.jsx)
      // If your AuthProvider.login signature is different, adapt here:
      // - If it expects (email, password) -> move the API call into auth.jsx
      // - If it expects the whole { token, user } object (my recommended), pass data directly
      if (typeof login === "function" && login.length === 2) {
        // (email, password) signature — uncommon in our setup
        await login(email, password);
      } else {
        // our recommended signature: login returns user after saving session
        // If your login expects the server data, do this:
        // await login(data);  // uncomment this and remove next two lines if your login takes (data)
        // const user = data.user;
        // Navigate based on role

        // If your login(email,password) is already implemented and sets storage+header internally,
        // then use the server response to navigate:
        const user = data.user;

        // persist session if your AuthProvider expects you to do it here:
        // localStorage.setItem("mm_user", JSON.stringify(data));

        // If your AuthProvider.login expects (data), use it:
        // await login(data);

        // If your AuthProvider.login expects (email, password), comment above and uncomment this:
        // await login(email, password);

        // Decide where to go
        const from = loc.state?.from?.pathname;
        if (from) {
          nav(from, { replace: true });
        } else if (user?.role === "ADMIN") {
          nav("/admin", { replace: true });
        } else {
          nav("/movies", { replace: true });
        }
      }
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        (e?.message?.includes("Network") ? "Network error — check the server" : "Invalid credentials");
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm text-gray-600">Email</label>
          <input
            type="email"
            className="border rounded w-full p-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-600">Password</label>
          <input
            type="password"
            className="border rounded w-full p-2"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        <button
          disabled={submitting}
          className={`w-full py-2 rounded text-white ${submitting ? "bg-gray-400" : "bg-black"}`}
          type="submit"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="text-sm">
        Don’t have an account?{" "}
        <Link to="/register" className="underline">Register</Link>
      </div>
    </div>
  );
}