// client/src/pages/admin/ShowtimeBooked.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api";

export default function ShowtimeBooked() {
  const { id } = useParams();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get(`/api/admin/showtimes/${id}/booked`)
      .then(({ data }) => setRows(data || []))
      .catch(e => setErr(e?.response?.data?.error || "Failed to load booked seats"));
  }, [id]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Booked Seats</h1>
        <Link to="/admin/showtimes" className="text-indigo-300 hover:text-white">Back</Link>
      </div>

      {err && <div className="text-red-500 text-sm">{err}</div>}

      <div className="grid md:grid-cols-2 gap-3">
        {rows.map(r => (
          <div key={r.bookingId} className="border rounded p-3">
            <div className="text-xs text-gray-400">Booking</div>
            <div className="font-mono text-sm break-all">{r.bookingId}</div>
            <div className="mt-2 font-medium">{r.movie}</div>
            <div className="text-sm text-gray-300">
              {new Date(r.startsAt).toLocaleString()} · {r.auditorium}
            </div>
            <div className="text-sm">Seat: Row {r.seat.row} · #{r.seat.number}</div>
            <div className="text-sm">Buyer: {r.user?.email || "?"}</div>
            {r.checkedInAt && (
              <div className="text-xs text-emerald-400">Checked-in: {new Date(r.checkedInAt).toLocaleTimeString()}</div>
            )}
          </div>
        ))}
      </div>

      {rows.length === 0 && <div className="text-gray-400 text-sm">No confirmed bookings yet.</div>}
    </div>
  );
}