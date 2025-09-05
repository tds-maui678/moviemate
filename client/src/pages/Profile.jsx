import React, { useEffect, useState } from "react";
import { api } from "../api";
import Page from "../components/Page.jsx";
import { useAuth } from "../auth.jsx";

export default function Profile() {
  const { user, logout } = useAuth();
  const [me, setMe] = useState(null);
  const [pErr, setPErr] = useState("");
  const [pMsg, setPMsg] = useState("");

  const [form, setForm] = useState({ name: "", email: "" });
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/user/me")
      .then(({ data }) => {
        setMe(data);
        setForm({ name: data.name, email: data.email });
      })
      .catch(e => setPErr(e?.response?.data?.error || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setPMsg(""); setPErr("");
    try {
      const { data } = await api.put("/api/user/profile", form);
      setMe(data);
      setPMsg("Profile updated.");
    } catch (e) {
      setPErr(e?.response?.data?.error || "Update failed");
    }
  }

  async function changePwd(e) {
    e.preventDefault();
    setPMsg(""); setPErr("");
    try {
      await api.put("/api/user/password", pwd);
      setPwd({ currentPassword: "", newPassword: "" });
      setPMsg("Password updated.");
    } catch (e) {
      setPErr(e?.response?.data?.error || "Password change failed");
    }
  }

  if (loading) return <Page title="Profile">Loading…</Page>;

  return (
    <Page title="Profile">
      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={saveProfile} className="border rounded p-4 space-y-3 bg-black/20">
          <div className="text-lg font-medium">Account</div>
          <input
            className="border p-2 w-full bg-black/40 text-white"
            placeholder="Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="border p-2 w-full bg-black/40 text-white"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          {pErr && <div className="text-red-400 text-sm">{pErr}</div>}
          {pMsg && <div className="text-emerald-400 text-sm">{pMsg}</div>}
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-white text-black">Save</button>
            <button type="button" onClick={logout} className="px-4 py-2 rounded border border-white/30">Logout</button>
          </div>
        </form>

        <form onSubmit={changePwd} className="border rounded p-4 space-y-3 bg-black/20">
          <div className="text-lg font-medium">Change Password</div>
          <input
            type="password"
            className="border p-2 w-full bg-black/40 text-white"
            placeholder="Current password"
            value={pwd.currentPassword}
            onChange={e => setPwd({ ...pwd, currentPassword: e.target.value })}
          />
          <input
            type="password"
            className="border p-2 w-full bg-black/40 text-white"
            placeholder="New password (8+ incl. Aa1!)"
            value={pwd.newPassword}
            onChange={e => setPwd({ ...pwd, newPassword: e.target.value })}
          />
          <button className="px-4 py-2 rounded bg-white text-black">Update Password</button>
        </form>
      </div>
    </Page>
  );
}