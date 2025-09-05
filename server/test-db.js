import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB,
  ssl: { rejectUnauthorized: false }
});

client.connect((err) => {
  if (err) { console.error('PG connect error:', err); process.exit(1); }
  console.log('PG connected!');
  client.end();
});
