import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";

export default function ShowtimesManage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/api/admin/showtimes/manage")
      .then(({ data }) => setRows(data || []))
      .catch(e => setErr(e?.response?.data?.error || "Failed to load showtimes"));
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Manage Showtimes</h1>
      {err && <div className="text-red-500 text-sm">{err}</div>}

      <div className="grid gap-3">
        {rows.map(s => (
          <div key={s.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{s.movie}</div>
              <div className="text-sm text-gray-300">
                {new Date(s.startsAt).toLocaleString()} · {s.auditorium}
                {"  "}· Confirmed {s.confirmed} · Held {s.held}
              </div>
            </div>
            <div className="flex gap-2">
              <Link className="border px-3 py-1 rounded hover:bg-gray-50/10" to={`/admin/showtimes/${s.id}/booked`}>
                Booked seats
              </Link>
              <Link className="border px-3 py-1 rounded hover:bg-gray-50/10" to={`/admin/showtimes/${s.id}/tickets`}>
                QR codes
              </Link>
              <Link className="border px-3 py-1 rounded hover:bg-gray-50/10" to={`/admin/scan`}>
                Scan tickets
              </Link>
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 && <div className="text-gray-400 text-sm">No showtimes yet.</div>}
    </div>
  );
}