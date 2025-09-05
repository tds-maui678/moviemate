import { DataTypes, Op } from "sequelize";
import { sequelize } from "../config/db.js";


export const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM("USER", "ADMIN"),
      allowNull: false,
      defaultValue: "USER",
    },
  },
  { tableName: "users" }
);

export const Movie = sequelize.define(
  "Movie",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    durationMinutes: DataTypes.INTEGER,
    rating: DataTypes.STRING,
    posterUrl: DataTypes.STRING,
  },
  { tableName: "movies" }
);

export const Auditorium = sequelize.define(
  "Auditorium",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true }, // e.g. "Hall 1"
    rows: { type: DataTypes.INTEGER, allowNull: false },
    cols: { type: DataTypes.INTEGER, allowNull: false },
  },
  { tableName: "auditoriums" }
);

export const Seat = sequelize.define(
  "Seat",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    row: { type: DataTypes.INTEGER, allowNull: false },
    number: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "seats",
    indexes: [
      // prevent duplicate seat coordinates within the same auditorium
      { unique: true, fields: ["AuditoriumId", "row", "number"] },
    ],
  }
);

export const Showtime = sequelize.define(
  "Showtime",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    startsAt: { type: DataTypes.DATE, allowNull: false }, // store UTC; format on read
    priceCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1200 },
  },
  {
    tableName: "showtimes",
    indexes: [
      // helps lookups / clash checks
      { fields: ["AuditoriumId", "startsAt"] },
      { fields: ["MovieId", "startsAt"] },
    ],
  }
);

export const Booking = sequelize.define(
  "Booking",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    status: {
      type: DataTypes.ENUM("HELD", "CONFIRMED", "CANCELLED"),
      allowNull: false,
      defaultValue: "HELD",
    },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
    paymentIntentId: { type: DataTypes.STRING, allowNull: true },
    scannedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "bookings",
    indexes: [
      { fields: ["ShowtimeId", "SeatId"] },
      { fields: ["status"] },
      { fields: ["expiresAt"] },
      { fields: ["scannedAt"] }, 
    ],
  }
);


Movie.hasMany(Showtime, {
  foreignKey: { name: "MovieId", allowNull: false },
  onDelete: "CASCADE",
});
Showtime.belongsTo(Movie, { foreignKey: { name: "MovieId", allowNull: false } });


Auditorium.hasMany(Seat, {
  foreignKey: { name: "AuditoriumId", allowNull: false },
  onDelete: "CASCADE",
});
Seat.belongsTo(Auditorium, { foreignKey: { name: "AuditoriumId", allowNull: false } });


Auditorium.hasMany(Showtime, {
  foreignKey: { name: "AuditoriumId", allowNull: false },
  onDelete: "CASCADE",
});
Showtime.belongsTo(Auditorium, {
  foreignKey: { name: "AuditoriumId", allowNull: false },
});


User.hasMany(Booking, {
  foreignKey: { name: "UserId", allowNull: false },
  onDelete: "CASCADE",
});
Booking.belongsTo(User, { foreignKey: { name: "UserId", allowNull: false } });


Showtime.hasMany(Booking, {
  foreignKey: { name: "ShowtimeId", allowNull: false },
  onDelete: "CASCADE",
});
Booking.belongsTo(Showtime, { foreignKey: { name: "ShowtimeId", allowNull: false } });


Seat.hasMany(Booking, {
  foreignKey: { name: "SeatId", allowNull: false },
  onDelete: "CASCADE",
});
Booking.belongsTo(Seat, { foreignKey: { name: "SeatId", allowNull: false } });

export async function ensureSeatsForAuditorium(auditorium) {
  const count = await Seat.count({ where: { AuditoriumId: auditorium.id } });
  if (count > 0) return;

  const seats = [];
  for (let r = 1; r <= auditorium.rows; r++) {
    for (let c = 1; c <= auditorium.cols; c++) {
      seats.push({ row: r, number: c, AuditoriumId: auditorium.id });
    }
  }
  await Seat.bulkCreate(seats);
}


export async function seedDefaultAuditoriums() {
  const existing = await Auditorium.count();
  if (existing > 0) return;

  const halls = await Auditorium.bulkCreate(
    [
      { name: "Hall 1", rows: 10, cols: 12 },
      { name: "Hall 2", rows: 10, cols: 12 },
      { name: "Hall 3", rows: 12, cols: 14 },
      { name: "Hall 4", rows: 12, cols: 14 },
      { name: "Hall 5", rows: 14, cols: 16 },
    ],
    { returning: true }
  );

  // generate seats for each hall
  for (const hall of halls) {
    await ensureSeatsForAuditorium(hall);
  }
}


export { Op };
export default {
  sequelize,
  User,
  Movie,
  Auditorium,
  Seat,
  Showtime,
  Booking,
  ensureSeatsForAuditorium,
  seedDefaultAuditoriums,
  Op,
};