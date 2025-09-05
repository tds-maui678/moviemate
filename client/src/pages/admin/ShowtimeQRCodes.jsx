import React, { useEffect, useState, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api";

const LazyQR = React.lazy(async () => {
  const mod = await import("qrcode.react");
  return { default: mod.QRCodeCanvas };
});

export default function ShowtimeQRCodes() {
  const { id } = useParams();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get(`/api/admin/showtimes/${id}/tickets`)
      .then(({ data }) => setRows(data || []))
      .catch(e => setErr(e?.response?.data?.error || "Failed to load tickets"));
  }, [id]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Showtime QR Codes</h1>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="border px-3 py-1 rounded hover:bg-gray-50/10">Print</button>
          <Link to="/admin/showtimes" className="text-indigo-300 hover:text-white">Back</Link>
        </div>
      </div>

      {err && <div className="text-red-500 text-sm">{err}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map(t => (
          <div key={t.bookingId} className="border rounded p-3 flex gap-3 items-center">
            <Suspense fallback={<div className="w-[120px] h-[120px] bg-gray-800 rounded" />}>
              <LazyQR value={t.bookingId} size={120} />
            </Suspense>
            <div className="space-y-1">
              <div className="text-xs text-gray-400">Booking</div>
              <div className="font-mono text-xs break-all">{t.bookingId}</div>
              <div className="font-medium">{t.movie}</div>
              <div className="text-sm text-gray-300">
                {new Date(t.startsAt).toLocaleString()} · {t.auditorium}
              </div>
              <div className="text-sm">Seat: R{t.seat.row} · #{t.seat.number}</div>
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 && <div className="text-gray-400 text-sm">No tickets yet.</div>}
    </div>
  );
}