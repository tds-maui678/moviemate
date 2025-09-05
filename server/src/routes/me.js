import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  Booking,
  Seat,
  Showtime,
  Auditorium,
  Movie,
  User,
} from "../models/index.js";

const router = Router();


router.get("/", requireAuth, async (req, res) => {
  const u = await User.findByPk(req.user.id, {
    attributes: ["id", "name", "email", "role", "createdAt"],
  });
  res.json({ user: u });
});


router.get("/tickets", requireAuth, async (req, res) => {
  const rows = await Booking.findAll({
    where: { UserId: req.user.id, status: "CONFIRMED" },
    order: [["createdAt", "DESC"]],
    include: [
      { model: Seat, attributes: ["row", "number"], include: [Auditorium] },
      {
        model: Showtime,
        attributes: ["startsAt"],
        include: [
          { model: Movie, attributes: ["title", "rating", "durationMinutes"] },
          { model: Auditorium, attributes: ["name"] },
        ],
      },
    ],
  });

  const tickets = rows.map((b) => ({
    bookingId: b.id,
    movie: {
      title: b.Showtime.Movie.title,
      rating: b.Showtime.Movie.rating,
      durationMinutes: b.Showtime.Movie.durationMinutes,
    },
    auditorium: b.Showtime.Auditorium?.name || b.Seat?.Auditorium?.name || null,
    seat: { row: b.Seat.row, number: b.Seat.number },
    startsAt: b.Showtime.startsAt,
    createdAt: b.createdAt,
  }));

  res.json({ tickets });
});

export default router;