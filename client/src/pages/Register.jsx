import React, { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth.jsx";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();
  const { login } = useAuth(); // login(email, password)
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      // 1) Create the user (server returns { token, user } but we'll reuse login())
      await api.post("/api/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      // 2) Auto-login using the same flow as the normal Sign In
      await login(form.email.trim(), form.password);

      // 3) Redirect
      nav("/movies", { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.error || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create an account</h1>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <input
          className="border w-full p-2 rounded"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="border w-full p-2 rounded"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="border w-full p-2 rounded"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <ul className="text-xs text-gray-600 list-disc pl-5">
          <li>At least 8 characters</li>
          <li>One uppercase, one lowercase, one number, one symbol</li>
        </ul>
        {err && (
          <div className="text-red-600 text-sm" role="alert">
            {err}
          </div>
        )}
        <button
          disabled={submitting || !form.email || !form.password || !form.name}
          className={`w-full px-4 py-2 rounded text-white ${
            submitting ? "bg-gray-400" : "bg-black"
          }`}
        >
          {submitting ? "Creating…" : "Register"}
        </button>
      </form>
      <p className="mt-3 text-sm">
        Already have an account?{" "}
        <Link className="text-blue-600" to="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}