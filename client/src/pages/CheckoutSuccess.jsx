import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../api";


const LazyQR = React.lazy(async () => {
  try {
    const mod = await import("qrcode.react");
    return { default: mod.QRCodeCanvas };
  } catch (e) {
    console.warn("QR library missing; continuing without QR:", e);
    
    return { default: () => null };
  }
});

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");


  const [tickets, setTickets] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setErr("Missing session_id in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get("/api/pay/lookup", { params: { session_id: sessionId } })
      .then(({ data }) => {
        setTickets(data?.tickets || []);
        setErr("");
      })
      .catch((e) => {
        const msg = e?.response?.data?.error || "Lookup failed";
        setErr(msg);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-semibold mb-6">Payment Successful</h1>

      {loading && <div className="text-gray-300">Loading your tickets…</div>}

      {!loading && err && (
        <div className="text-red-500 mb-3">{err}</div>
      )}

      {!loading && !err && tickets.length === 0 && (
        <div className="text-gray-300">No tickets found for this session.</div>
      )}

      {!loading && !err && tickets.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {tickets.map((t) => (
            <div key={t.bookingId} className="border rounded p-4 flex gap-4 items-center bg-black/20">
              <Suspense fallback={<div className="w-[120px] h-[120px] bg-gray-800 rounded" />}>
                <LazyQR value={t.bookingId} size={120} />
              </Suspense>

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
      )}

      <div className="mt-6 flex gap-3">
        <Link to="/movies" className="text-indigo-300 hover:text-white">Back to Movies</Link>
        <Link to="/tickets" className="text-indigo-300 hover:text-white">View all my tickets</Link>
      </div>
    </div>
  );
}