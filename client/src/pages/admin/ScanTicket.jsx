import React, { useState } from "react";
import { useZxing } from "react-zxing";
import { api } from "../../api";
import { Link } from "react-router-dom";

export default function ScanTicket() {
  const [lastText, setLastText] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const { ref } = useZxing({
    onDecodeResult: async (res) => {
      const bookingId = res.getText ? res.getText() : String(res);
      if (!bookingId || bookingId === lastText) return;
      setLastText(bookingId);
      setErr("");
      setMsg("Validating...");

      try {
        const { data } = await api.post("/api/admin/scan", { bookingId });
        setMsg(
          `${data.alreadyCheckedIn ? "ALREADY CHECKED-IN ⚠️" : "VALID ✅"}\n` +
          `${data.user.email}\n${data.movie} · ${new Date(data.startsAt).toLocaleString()}\n` +
          `Seat: R${data.seat.row} #${data.seat.number} · ${data.auditorium}`
        );
      } catch (e) {
        setMsg("");
        setErr(e?.response?.data?.error || "Invalid / unknown ticket");
      }
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Scan Tickets</h1>
        <Link to="/admin/showtimes" className="text-indigo-300 hover:text-white">Back</Link>
      </div>

      <video ref={ref} className="w-full rounded border" />

      {lastText && (
        <div className="text-xs text-gray-400">
          Last read: <span className="font-mono">{lastText}</span>
        </div>
      )}
      {msg && <pre className="bg-emerald-900/30 text-emerald-300 p-3 rounded text-sm whitespace-pre-wrap">{msg}</pre>}
      {err && <div className="text-red-500 text-sm">{err}</div>}
    </div>
  );
}