import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import auth from "./routes/auth.js";
import admin from "./routes/admin.js";
import movies from "./routes/movies.js";
import showtimes from "./routes/showtimes.js";
import pay, { webhookHandler } from "./routes/pay.js";
import me from"./routes/me.js";
import adminShowtimes from "./routes/adminShowtimes.js";
import userRoutes from "./routes/user.js";


const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));


console.log("Mounting Stripe webhook route…");
app.post("/api/pay/webhook", express.raw({ type: "application/json" }), webhookHandler);
console.log("Webhook route mounted at POST /api/pay/webhook");


app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Basic routes
app.use("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", auth);
app.use("/api/admin", admin);
app.use("/api/movies", movies);
app.use("/api/showtimes", showtimes);
app.use("/api/pay", pay);
app.use("/api/me",me);
app.use("/api/admin",adminShowtimes);
app.use("/api/user", userRoutes);

// 404 and error
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

export default app;