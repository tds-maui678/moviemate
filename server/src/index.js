import http from "http";
import { Server as IOServer } from "socket.io";
import app from "./app.js";
import { sequelize } from "./config/db.js";

import {
  User,
  Auditorium,
  Movie,
  Showtime,
  ensureSeatsForAuditorium,
  seedDefaultAuditoriums,
} from "./models/index.js";

import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

async function ensureAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  const [admin, created] = await User.findOrCreate({
    where: { email: ADMIN_EMAIL.toLowerCase() },
    defaults: {
      name: ADMIN_NAME || "Admin",
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: "ADMIN",
    },
  });

  if (!created && admin.role !== "ADMIN") {
    admin.role = "ADMIN";
    await admin.save();
  }
}

async function start() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    await sequelize.sync({ alter: true });

    // normalize all emails to lowercase
    await User.update(
      { email: sequelize.fn("lower", sequelize.col("email")) },
      { where: {} }
    );

    await ensureAdmin();
    await seedDefaultAuditoriums();

    // seed demo movie & showtime if missing
    const [movie] = await Movie.findOrCreate({
      where: { title: "The Sample Movie" },
      defaults: {
        description: "Demo movie",
        durationMinutes: 120,
        rating: "PG",
        posterUrl: "",
      },
    });

    const hall1 = await Auditorium.findOne({ where: { name: "Hall 1" } });
    if (hall1) {
      const in1h = new Date(Date.now() + 60 * 60 * 1000);
      await Showtime.findOrCreate({
        where: {
          MovieId: movie.id,
          AuditoriumId: hall1.id,
          startsAt: in1h,
        },
        defaults: { priceCents: 1299 },
      });
    }

    // HTTP + Socket.io server
    const server = http.createServer(app);

    const io = new IOServer(server, {
      cors: {
        origin: CLIENT_ORIGIN,
        methods: ["GET", "POST"],
        credentials: false, // ⚡ disable cookies for sockets to avoid CORS error
      },
    });

    io.on("connection", (socket) => {
      console.log("🔌 Client connected:", socket.id);

      socket.on("join_showtime", (showtimeId) => {
        socket.join(`showtime:${showtimeId}`);
        console.log(`Client ${socket.id} joined showtime:${showtimeId}`);
      });

      socket.on("disconnect", () => {
        console.log("🔌 Client disconnected:", socket.id);
      });
    });

    // make io available in routes via req.app.get("io")
    app.set("io", io);

    server.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();