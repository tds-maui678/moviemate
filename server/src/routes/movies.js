import { Router } from "express";
import { Auditorium, Movie, Showtime } from "../models/index.js";

const r = Router();

r.get("/", async (_req, res) => {
  const rows = await Movie.findAll({ order: [["createdAt", "DESC"]] });
  res.json(rows);
});

r.get("/:id/showtimes", async (req, res) => {
  const rows = await Showtime.findAll({
    where: { MovieId: req.params.id },        
    include: [Auditorium],
    order: [["startsAt", "ASC"]],
  });
  res.json(
    rows.map((s) => ({
      id: s.id,
      startsAt: s.startsAt,
      auditorium: s.Auditorium?.name ?? null,
      auditoriumId: s.AuditoriumId,
      priceCents: s.priceCents ?? 1200,
    }))
  );
});


export default r;