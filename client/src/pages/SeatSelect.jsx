// src/pages/SeatSelect.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { api } from "../api";
import { loadStripe } from "@stripe/stripe-js";

// Make sure VITE_STRIPE_PUBLISHABLE_KEY is set in client/.env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function SeatSelect() {
  const { id } = useParams(); // showtime id
  const [payload, setPayload] = useState({ showtime: null, seats: [] });
  const [selected, setSelected] = useState([]);          // seatId[] (strings)
  const [myBookingIds, setMyBookingIds] = useState([]);  // bookingId[] (strings)
  const [err, setErr] = useState("");
  const [hint, setHint] = useState("");

  // -------- data load --------
  async function load() {
    try {
      const { data } = await api.get(`/api/showtimes/${id}/seats`);
      const seats = (data?.seats || []).map((s) => ({
        ...s,
        id: String(s.id),
        status: String(s.status || "AVAILABLE").toUpperCase(), // AVAILABLE | HELD | CONFIRMED
      }));
      setPayload({ showtime: data?.showtime || null, seats });
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load seats");
    }
  }

  useEffect(() => {
    load();

    // Live updates
    const s = io(api.defaults.baseURL || "http://localhost:4000", {
      transports: ["websocket","polling"],
    });
    s.emit("join_showtime", id);
    s.on("seats_update", load);
    return () => s.disconnect();
  }, [id]);

  // -------- computed helpers --------
  const rows = useMemo(() => {
    const byRow = new Map();
    for (const s of payload.seats) {
      if (!byRow.has(s.row)) byRow.set(s.row, []);
      byRow.get(s.row).push(s);
    }
    for (const arr of byRow.values()) arr.sort((a, b) => a.number - b.number);
    return [...byRow.entries()].sort((a, b) => a[0] - b[0]);
  }, [payload.seats]);

  const counts = useMemo(() => {
    const total = payload.seats.length;
    const available = payload.seats.filter((s) => s.status === "AVAILABLE").length;
    const held = payload.seats.filter((s) => s.status === "HELD").length;
    const confirmed = payload.seats.filter((s) => s.status === "CONFIRMED").length;
    return { total, available, held, confirmed };
  }, [payload.seats]);

  function flashHint(text) {
    setHint(text);
    setTimeout(() => setHint(""), 1500);
  }

  // -------- interactions --------
  function toggle(seat) {
    const { status } = seat;
    if (status !== "AVAILABLE") {
      flashHint(status === "HELD" ? "Seat temporarily held" : "Seat already sold");
      return;
    }
    const seatId = String(seat.id);
    setSelected((prev) =>
      prev.includes(seatId) ? prev.filter((x) => x !== seatId) : [...prev, seatId]
    );
  }

  async function hold() {
    if (selected.length === 0) return;
    try {
      setErr("");
      const { data } = await api.post(`/api/showtimes/${id}/hold`, {
        seatIds: selected,
      });
      setMyBookingIds((data?.bookingIds || []).map(String));
      setSelected([]);
      await load();
      if (data?.expiresAt) {
        flashHint(`Seats held until ${new Date(data.expiresAt).toLocaleTimeString()}`);
      } else {
        flashHint("Seats held");
      }
    } catch (e) {
      setErr(e?.response?.data?.error || "Hold failed");
    }
  }

  // ✅ Stripe checkout
  async function payAndConfirm() {
    if (myBookingIds.length === 0) return;
    try {
      setErr("");
      // This calls your server's /api/pay/checkout which should create a Stripe Checkout session
      const { data } = await api.post("/api/pay/checkout", {
        bookingIds: myBookingIds,
      });
      // Redirect to Stripe-hosted checkout
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if (error) setErr(error.message || "Stripe redirect failed");
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Failed to start checkout";
      setErr(msg);
    }
  }

  async function cancel() {
    if (myBookingIds.length === 0) return;
    try {
      setErr("");
      await api.delete(`/api/showtimes/bookings/cancel`, {
        data: { bookingIds: myBookingIds },
      });
      setMyBookingIds([]);
      await load();
      flashHint("Hold cancelled");
    } catch (e) {
      setErr(e?.response?.data?.error || "Cancel failed");
    }
  }

  // -------- UI --------
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <h1 className="text-3xl font-semibold">Select Seats</h1>

      <div className="text-sm text-gray-400">
        Showtime: {payload.showtime?.id || "—"} · Total {counts.total} · Available {counts.available} · Held {counts.held} · Sold {counts.confirmed}
      </div>

      {(hint || err) && (
        <div className={`text-sm ${err ? "text-red-500" : "text-emerald-500"}`}>
          {err || hint}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="px-2 py-1 border rounded">Available</span>
        <span className="px-2 py-1 border rounded bg-blue-600 text-white border-blue-600">
          Selected
        </span>
        <span className="px-2 py-1 border rounded bg-yellow-200 border-yellow-400">
          Held (temp)
        </span>
        <span className="px-2 py-1 border rounded bg-gray-300 border-gray-400">Sold</span>
      </div>

      {/* Screen marker */}
      <div className="text-center text-xs text-gray-500 select-none">SCREEN</div>
      <div className="h-1 bg-gray-300 rounded" />

      {/* Seat grid */}
      <div className="space-y-3">
        {rows.map(([rowNum, seats]) => (
          <div key={rowNum} className="flex items-center gap-3">
            <div className="w-12 text-right text-xs text-gray-500 select-none">
              Row {rowNum}
            </div>
            <div className="flex gap-2 flex-wrap">
              {seats.map((seat) => {
                const seatId = String(seat.id);
                const isSelected = selected.includes(seatId);
                const status = seat.status;

                // Base look
                const base =
                  "relative px-3 py-2 rounded border text-sm transition-colors";

                let cls;
                if (status === "AVAILABLE") {
                  cls = isSelected
                    ? `${base} bg-blue-600 text-white border-blue-600`
                    : `${base} hover:bg-blue-50`;
                } else if (status === "HELD") {
                  cls = `${base} bg-yellow-200 border-yellow-400 text-gray-700 cursor-not-allowed`;
                } else {
                  // CONFIRMED
                  cls = `${base} bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed`;
                }

                return (
                  <button
                    key={seatId}
                    type="button"
                    onClick={() => toggle(seat)}
                    className={cls}
                    aria-disabled={status !== "AVAILABLE"}
                    title={
                      status === "AVAILABLE"
                        ? `Row ${seat.row}, Seat ${seat.number}`
                        : status === "HELD"
                        ? "Temporarily held"
                        : "Sold"
                    }
                    style={isSelected ? { outline: "3px solid #2563eb", outlineOffset: 1 } : undefined}
                  >
                    <span className="relative z-10">{seat.number}</span>

                    {status === "CONFIRMED" && (
                      <span
                        className="absolute inset-0 flex items-center justify-center text-gray-600 text-lg font-bold pointer-events-none select-none"
                        style={{ opacity: 0.6 }}
                      >
                        ×
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={hold}
          disabled={selected.length === 0}
          className="border px-3 py-1 rounded disabled:opacity-50"
          title={selected.length ? "" : "Select at least one seat"}
        >
          Hold seats
        </button>

        {/* Stripe Checkout button */}
        <button
          onClick={payAndConfirm}
          disabled={myBookingIds.length === 0}
          className="border px-3 py-1 rounded disabled:opacity-50"
          title={myBookingIds.length ? "" : "Hold seats first"}
        >
          Checkout
        </button>

        <button
          onClick={cancel}
          disabled={myBookingIds.length === 0}
          className="border px-3 py-1 rounded disabled:opacity-50"
        >
          Cancel holds
        </button>
      </div>
    </div>
  );
}