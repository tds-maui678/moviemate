import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  Auditorium,
  Movie,
  Showtime,
  Seat,
  Booking,
  User,
} from "../models/index.js";
import { uploadPoster } from "../utils/storage.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});


router.get("/movies", requireAuth, requireAdmin, async (_req, res) => {
  const movies = await Movie.findAll({ order: [["createdAt", "DESC"]] });
  res.json(movies);
});

router.post(
  "/movies",
  requireAuth,
  requireAdmin,
  upload.single("poster"),
  async (req, res) => {
    try {
      const { title, description, durationMinutes, rating } = req.body;
      if (!title) return res.status(400).json({ error: "Title is required" });

      let posterUrl = "";
      if (req.file) {
        posterUrl = await uploadPoster(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
      }

      const movie = await Movie.create({
        title: title.trim(),
        description: (description || "").trim(),
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        rating: (rating || "").trim(),
        posterUrl,
      });
      res.status(201).json(movie);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create movie" });
    }
  }
);

router.delete("/movies/:id", requireAuth, requireAdmin, async (req, res) => {
  const n = await Movie.destroy({ where: { id: req.params.id } });
  if (!n) return res.status(404).json({ error: "Movie not found" });
  res.json({ ok: true });
});


router.get("/rooms", requireAuth, requireAdmin, async (_req, res) => {
  const rooms = await Auditorium.findAll({ order: [["name", "ASC"]] });
  res.json(rooms);
});


router.post("/showtimes", requireAuth, requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      movieId: z.string().min(1),
      auditoriumId: z.string().min(1),
      startsAt: z.string().min(1), 
      priceCents: z.coerce.number().int().positive().optional(),
    });
    const { movieId, auditoriumId, startsAt, priceCents } = schema.parse(
      req.body
    );

    
    let utc;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsAt)) {
      const local = new Date(`${startsAt}:00`);
      utc = new Date(local.getTime() - local.getTimezoneOffset() * 60000);
    } else {
      const d = new Date(startsAt);
      if (isNaN(d)) return res.status(400).json({ error: "Invalid startsAt" });
      utc = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    }
    utc.setSeconds(0, 0);

    
    const exists = await Showtime.findOne({
      where: { AuditoriumId: auditoriumId, startsAt: utc },
    });
    if (exists) {
      return res
        .status(409)
        .json({ error: "This hall already has a show at that time." });
    }

    const st = await Showtime.create({
      MovieId: movieId,
      AuditoriumId: auditoriumId,
      startsAt: utc,
      ...(priceCents ? { priceCents } : {}),
    });

    const withJoins = await Showtime.findByPk(st.id, {
      include: [Movie, Auditorium],
    });
    res.status(201).json(withJoins);
  } catch (e) {
    if (e.name === "ZodError") {
      return res
        .status(400)
        .json({ error: e.errors?.[0]?.message || "Bad request" });
    }
    console.error("Create showtime error:", e);
    res.status(500).json({ error: "Failed to create showtime" });
  }
});

router.delete("/showtimes/:id", requireAuth, requireAdmin, async (req, res) => {
  await Showtime.destroy({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.get("/showtimes", requireAuth, requireAdmin, async (req, res) => {
  const where = req.query.movieId ? { MovieId: req.query.movieId } : {};
  const rows = await Showtime.findAll({
    where,
    include: [Movie, Auditorium],
    order: [["startsAt", "ASC"]],
  });
  res.json(rows);
});


router.get(
  "/showtimes/manage",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    const rows = await Showtime.findAll({
      include: [
        { model: Movie, attributes: ["id", "title", "rating"] },
        { model: Auditorium, attributes: ["id", "name"] },
      ],
      order: [["startsAt", "ASC"]],
    });

    
    const ids = rows.map((r) => r.id);
    const bookings = await Booking.findAll({
      attributes: ["ShowtimeId", "status"],
      where: { ShowtimeId: ids },
    });

    const tally = {};
    for (const b of bookings) {
      const k = String(b.ShowtimeId);
      if (!tally[k]) tally[k] = { HELD: 0, CONFIRMED: 0 };
      if (b.status === "HELD") tally[k].HELD++;
      if (b.status === "CONFIRMED") tally[k].CONFIRMED++;
    }

    res.json(
      rows.map((s) => ({
        id: s.id,
        startsAt: s.startsAt,
        priceCents: s.priceCents,
        movie: s.Movie?.title ?? "—",
        auditorium: s.Auditorium?.name ?? "—",
        held: tally[String(s.id)]?.HELD || 0,
        confirmed: tally[String(s.id)]?.CONFIRMED || 0,
      }))
    );
  }
);


router.get(
  "/showtimes/:id/booked",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const id = req.params.id;
    const rows = await Booking.findAll({
      where: { ShowtimeId: id, status: "CONFIRMED" },
      order: [["createdAt", "ASC"]],
      include: [
        { model: Seat, attributes: ["row", "number"], include: [Auditorium] },
        { model: User, attributes: ["id", "name", "email"] },
        {
          model: Showtime,
          attributes: ["startsAt"],
          include: [
            { model: Movie, attributes: ["title", "rating"] },
            { model: Auditorium, attributes: ["name"] },
          ],
        },
      ],
    });

    res.json(
      rows.map((b) => ({
        bookingId: b.id,
        user: { email: b.User?.email, name: b.User?.name },
        seat: { row: b.Seat.row, number: b.Seat.number },
        movie: b.Showtime?.Movie?.title,
        startsAt: b.Showtime?.startsAt,
        auditorium: b.Showtime?.Auditorium?.name,
        checkedInAt: b.checkedInAt || null,
      }))
    );
  }
);


router.get(
  "/showtimes/:id/tickets",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const id = req.params.id;
    const rows = await Booking.findAll({
      where: { ShowtimeId: id, status: "CONFIRMED" },
      order: [["createdAt", "ASC"]],
      include: [
        { model: Seat, attributes: ["row", "number"] },
        {
          model: Showtime,
          attributes: ["startsAt"],
          include: [
            { model: Movie, attributes: ["title"] },
            { model: Auditorium, attributes: ["name"] },
          ],
        },
      ],
    });

    res.json(
      rows.map((b) => ({
        bookingId: b.id,
        seat: { row: b.Seat.row, number: b.Seat.number },
        movie: b.Showtime?.Movie?.title,
        startsAt: b.Showtime?.startsAt,
        auditorium: b.Showtime?.Auditorium?.name,
      }))
    );
  }
);


router.post("/scan", requireAuth, requireAdmin, async (req, res) => {
  const schema = z.object({ bookingId: z.string().min(1) });
  const { bookingId } = schema.parse(req.body);

  const b = await Booking.findOne({
    where: { id: bookingId, status: "CONFIRMED" },
    include: [
      { model: Seat, include: [Auditorium] },
      { model: User, attributes: ["email", "name"] },
      {
        model: Showtime,
        include: [{ model: Movie }, { model: Auditorium }],
      },
    ],
  });

  if (!b) return res.status(404).json({ error: "Ticket not found" });

  const already = !!b.checkedInAt;
  if (!already) {
    b.checkedInAt = new Date();
    await b.save();
  }

  res.json({
    ok: true,
    alreadyCheckedIn: already,
    user: { email: b.User?.email, name: b.User?.name },
    movie: b.Showtime?.Movie?.title,
    startsAt: b.Showtime?.startsAt,
    seat: { row: b.Seat.row, number: b.Seat.number },
    auditorium: b.Showtime?.Auditorium?.name,
  });
});

export default router;