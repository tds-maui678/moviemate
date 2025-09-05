import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { Booking, Seat, Auditorium, Showtime, Movie, User } from "../models/index.js";
import { z } from "zod";

const router = Router();


router.get("/showtimes/:id/summary", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const st = await Showtime.findByPk(id, {
    include: [{ model: Movie }, { model: Auditorium }],
  });
  if (!st) return res.status(404).json({ error: "Showtime not found" });


  const seats = await Seat.findAll({
    where: { AuditoriumId: st.AuditoriumId },
    order: [["row", "ASC"], ["number", "ASC"]],
  });

  
  const bookings = await Booking.findAll({
    where: { ShowtimeId: st.id },
    include: [
      { model: Seat, include: [Auditorium] },
      { model: User, attributes: ["id", "name", "email"] },
    ],
    order: [["createdAt", "ASC"]],
  });


  const bySeat = new Map();
  for (const b of bookings) {
    bySeat.set(b.SeatId, {
      bookingId: b.id,
      status: b.status,
      user: b.User ? { id: b.User.id, name: b.User.name, email: b.User.email } : null,
      scannedAt: b.scannedAt,
    });
  }

  const seatGrid = seats.map((s) => ({
    id: s.id,
    row: s.row,
    number: s.number,
    status: bySeat.get(s.id)?.status || "AVAILABLE",
    bookingId: bySeat.get(s.id)?.bookingId || null,
    user: bySeat.get(s.id)?.user || null,
    scannedAt: bySeat.get(s.id)?.scannedAt || null,
  }));

  res.json({
    showtime: {
      id: st.id,
      startsAt: st.startsAt,
      priceCents: st.priceCents,
      auditorium: st.Auditorium?.name || null,
      movie: { id: st.Movie?.id, title: st.Movie?.title },
    },
    seats: seatGrid,
  });
});


router.get("/showtimes/:id/tickets", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const st = await Showtime.findByPk(id, {
    include: [{ model: Movie }, { model: Auditorium }],
  });
  if (!st) return res.status(404).json({ error: "Showtime not found" });

  const rows = await Booking.findAll({
    where: { ShowtimeId: id, status: "CONFIRMED" },
    order: [["createdAt", "ASC"]],
    include: [
      { model: Seat, attributes: ["row", "number"], include: [Auditorium] },
      { model: User, attributes: ["id", "name", "email"] },
    ],
  });

  const tickets = rows.map((b) => ({
    bookingId: b.id,
    user: b.User ? { id: b.User.id, name: b.User.name, email: b.User.email } : null,
    seat: { row: b.Seat.row, number: b.Seat.number },
    scannedAt: b.scannedAt,
  }));

  res.json({
    showtime: {
      id: st.id,
      startsAt: st.startsAt,
      auditorium: st.Auditorium?.name || null,
      movie: { id: st.Movie?.id, title: st.Movie?.title },
    },
    tickets,
  });
});


router.post("/scan", requireAuth, requireAdmin, async (req, res) => {
  const schema = z.object({ bookingId: z.string().min(1) });
  const { bookingId } = schema.parse(req.body);

  const b = await Booking.findByPk(bookingId, {
    include: [
      { model: User, attributes: ["id", "name", "email"] },
      { model: Seat, attributes: ["row", "number"], include: [Auditorium] },
      { model: Showtime, include: [Movie, Auditorium] },
    ],
  });
  if (!b) return res.status(404).json({ ok: false, reason: "NOT_FOUND" });

  if (b.status !== "CONFIRMED") {
    return res.status(400).json({ ok: false, reason: "NOT_CONFIRMED", status: b.status });
  }


  if (!b.scannedAt) {
    b.scannedAt = new Date();
    await b.save();
  }

  res.json({
    ok: true,
    booking: {
      id: b.id,
      user: b.User ? { id: b.User.id, name: b.User.name, email: b.User.email } : null,
      seat: { row: b.Seat.row, number: b.Seat.number },
      scannedAt: b.scannedAt,
      showtime: {
        id: b.Showtime.id,
        startsAt: b.Showtime.startsAt,
        movie: b.Showtime.Movie?.title,
        auditorium: b.Showtime.Auditorium?.name,
      },
    },
  });
});

export default router;