// server/src/config/db.js
import { Sequelize } from "sequelize";

// helper: build a postgres URL from PG_* pieces
function buildUrlFromPieces() {
  const host = process.env.PG_HOST;
  const port = process.env.PG_PORT || "5432";
  const user = process.env.PG_USER;
  const password = process.env.PG_PASSWORD || "";
  const db = process.env.PG_DB || process.env.PGDATABASE || "postgres";

  if (!host || !user || !db) {
    return null; // not enough info
  }
  // important: encode password in case it has special chars
  const pw = encodeURIComponent(password);
  return `postgresql://${user}:${pw}@${host}:${port}/${db}`;
}

const url =
  process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ""
    ? process.env.DATABASE_URL
    : buildUrlFromPieces();

if (!url) {
  // Give a clear error instead of crashing deep in pg-connection-string
  throw new Error(
    "Database connection string not found. Provide DATABASE_URL or PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DB."
  );
}

export const sequelize = new Sequelize(url, {
  dialect: "postgres",
  // Render/Supabase need SSL
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
});

export default sequelize;