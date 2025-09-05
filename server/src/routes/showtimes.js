import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { Auditorium, Booking, Seat, Showtime } from "../models/index.js";
import { Op } from "sequelize";

const r = Router();

// Normalize booking statuses on read (expire holds)
async function expireHolds() {
  await Booking.update(
    { status: "CANCELLED" },
    { where: { status: "HELD", expiresAt: { [Op.lt]: new Date() } } }
  );
}

// GET seat map + status for a showtime
r.get("/:id/seats", requireAuth, async (req, res) => {
  await expireHolds();

  const st = await Showtime.findByPk(req.params.id, { include: [Auditorium] });
  if (!st) return res.status(404).json({ error: "Showtime not found" });

  const seats = await Seat.findAll({ where: { AuditoriumId: st.AuditoriumId }, order: [["row","ASC"],["number","ASC"]] });

  // Find existing seat bookings for this showtime
  const bookings = await Booking.findAll({
    where: { ShowtimeId: st.id, status: { [Op.in]: ["HELD","CONFIRMED"] } },
    attributes: ["SeatId", "status", "expiresAt"]
  });

  const statusBySeat = new Map();
  for (const b of bookings) {
    statusBySeat.set(b.SeatId, {
      status: b.status,
      expiresAt: b.expiresAt,
    });
  }

  res.json({
    showtime: { id: st.id, startsAt: st.startsAt, auditoriumId: st.AuditoriumId },
    seats: seats.map(s => ({
      id: s.id,
      row: s.row,
      number: s.number,
      status: statusBySeat.get(s.id)?.status || "AVAILABLE",
      expiresAt: statusBySeat.get(s.id)?.expiresAt || null,
    }))
  });
});

// POST hold seats: { seatIds: string[] }
r.post("/:id/hold", requireAuth, async (req, res) => {
  try {
    const { seatIds } = req.body;
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ error: "seatIds required" });
    }
    await expireHolds();

    const st = await Showtime.findByPk(req.params.id);
    if (!st) return res.status(404).json({ error: "Showtime not found" });

    // seat conflict check
    const conflicts = await Booking.findAll({
      where: {
        ShowtimeId: st.id,
        SeatId: seatIds,
        status: { [Op.in]: ["HELD","CONFIRMED"] },
      },
    });
    if (conflicts.length) {
      return res.status(409).json({ error: "Some seats are no longer available" });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min hold
    const rows = await Booking.bulkCreate(
      seatIds.map(SeatId => ({
        status: "HELD",
        expiresAt,
        ShowtimeId: st.id,
        SeatId,
        UserId: req.user.id,
      })),
      { returning: true }
    );

    // Notify others
    const io = req.app.get("io");
    io.to(`showtime:${st.id}`).emit("seats_update");

    res.status(201).json({ bookingIds: rows.map(r => r.id), expiresAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to hold seats" });
  }
});

// POST confirm booking: { bookingIds: string[] }
r.post("/bookings/confirm", requireAuth, async (req, res) => {
  const { bookingIds } = req.body;
  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    return res.status(400).json({ error: "bookingIds required" });
  }

  // Only confirm the user's own held bookings
  const rows = await Booking.findAll({ where: { id: bookingIds, UserId: req.user.id, status: "HELD" } });
  if (rows.length === 0) return res.status(404).json({ error: "No held bookings found" });

  // optional: check payment here (Stripe, etc.)
  await Booking.update({ status: "CONFIRMED", expiresAt: null }, { where: { id: bookingIds } });

  const showtimeId = rows[0].ShowtimeId;
  const io = req.app.get("io");
  io.to(`showtime:${showtimeId}`).emit("seats_update");

  res.json({ ok: true });
});

// DELETE cancel booking: { bookingIds: string[] }
r.delete("/bookings/cancel", requireAuth, async (req, res) => {
  const { bookingIds } = req.body;
  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    return res.status(400).json({ error: "bookingIds required" });
  }
  const rows = await Booking.findAll({ where: { id: bookingIds, UserId: req.user.id, status: "HELD" } });
  if (rows.length === 0) return res.json({ ok: true });

  await Booking.update({ status: "CANCELLED" }, { where: { id: bookingIds } });

  const showtimeId = rows[0].ShowtimeId;
  const io = req.app.get("io");
  io.to(`showtime:${showtimeId}`).emit("seats_update");

  res.json({ ok: true });
});

export default r;