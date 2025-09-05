import React, { useEffect, useState } from "react";
import { api } from "../api";
import { QRCodeCanvas } from "qrcode.react";

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/api/me/tickets")
      .then(({ data }) => setTickets(data?.tickets || []))
      .catch(e => setErr(e?.response?.data?.error || "Failed to load tickets"));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-4">My Tickets</h1>
      {err && <div className="text-red-500 text-sm mb-4">{err}</div>}
      {tickets.length === 0 && (
        <div className="text-gray-300">No tickets yet.</div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {tickets.map((t) => (
          <div key={t.bookingId} className="border rounded p-4 flex gap-4 items-center bg-black/20">
            <QRCodeCanvas value={t.bookingId} size={120} />
            <div className="space-y-1">
              <div className="text-xs uppercase text-gray-300">Booking ID</div>
              <div className="font-mono text-sm break-all">{t.bookingId}</div>

              <div className="font-medium mt-2">{t.movie.title}</div>
              <div className="text-sm text-gray-300">
                {new Date(t.startsAt).toLocaleString()} · {t.auditorium || "Auditorium"}
              </div>
              <div className="text-sm text-gray-200">
                Seat: Row {t.seat.row} · #{t.seat.number}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}