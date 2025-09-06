import express from "express";
import Stripe from "stripe";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { Booking, Seat, Auditorium, Showtime, Movie } from "../models/index.js";

export const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

/** ---------- CHECKOUT ---------- */
router.post("/checkout", requireAuth, async (req, res) => {
  try {
    const schema = z.object({ bookingIds: z.array(z.string().min(1)).min(1) });
    const { bookingIds } = schema.parse(req.body);

    const rows = await Booking.findAll({
      where: { id: bookingIds, UserId: req.user.id, status: "HELD" },
      include: [{ model: Seat, include: [Auditorium] }, { model: Showtime, include: [Movie, Auditorium] }],
    });

    if (rows.length !== bookingIds.length) return res.status(400).json({ error: "Some bookings are invalid" });

    const movie = rows[0].Showtime.Movie;
    const quantity = rows.length;
    const priceCents = rows[0].Showtime.priceCents ?? 1200;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${process.env.CLIENT_ORIGIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_ORIGIN}/checkout/cancel`,
      metadata: {
        bookingIds: bookingIds.join(","),
        userId: req.user.id,
      },
      line_items: [
        {
          quantity,
          price_data: {
            currency: "usd",
            unit_amount: priceCents,
            product_data: { name: `Tickets · ${movie.title}` },
          },
        },
      ],
    });

    res.json({ sessionId: session.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to start checkout" });
    const msg = e?.raw?.message || e?.message || "Failed to start checkout";
    res.status(400).json({ error: msg });
  }
});

/** ---------- LOOKUP (used by success page) ---------- */
router.get("/lookup", requireAuth, async (req, res) => {
  try {
    const schema = z.object({ session_id: z.string().min(1) });
    const { session_id } = schema.parse(req.query);

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const bookingIds = String(session.metadata?.bookingIds || "").split(",").filter(Boolean);
    if (!bookingIds.length) return res.status(404).json({ error: "No tickets for this session" });

    const tickets = await Booking.findAll({
      where: { id: bookingIds, UserId: req.user.id, status: "CONFIRMED" },
      order: [["createdAt", "ASC"]],
      include: [
        { model: Seat, attributes: ["row", "number"], include: [Auditorium] },
        { model: Showtime, attributes: ["startsAt"], include: [{ model: Movie, attributes: ["title", "rating", "durationMinutes"] }, { model: Auditorium, attributes: ["name"] }] },
      ],
    });

    if (tickets.length === 0) return res.status(404).json({ error: "Not found" });

    const payload = tickets.map((b) => ({
      bookingId: b.id,
      movie: {
        title: b.Showtime.Movie.title,
        rating: b.Showtime.Movie.rating,
        durationMinutes: b.Showtime.Movie.durationMinutes,
      },
      auditorium: b.Showtime.Auditorium?.name || b.Seat?.Auditorium?.name || null,
      seat: { row: b.Seat.row, number: b.Seat.number },
      startsAt: b.Showtime.startsAt,
    }));

    res.json({ sessionId: session_id, tickets: payload });
  } catch (e) {
    console.error(e);
    if (e.name === "ZodError") return res.status(400).json({ error: e.errors[0]?.message || "Bad request" });
    res.status(500).json({ error: "Lookup failed" });
  }
});

/** ---------- WEBHOOK HANDLER (named export) ---------- */
export async function webhookHandler(req, res) {
  try {
    const sig = req.headers["stripe-signature"];
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    console.log("[webhook] type:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const ids = String(session.metadata?.bookingIds || "").split(",").filter(Boolean);

      if (ids.length) {
        await Booking.update({ status: "CONFIRMED", expiresAt: null }, { where: { id: ids } });
        console.log("[webhook] confirmed bookings:", ids);
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}

export default router;