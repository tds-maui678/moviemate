import 'dotenv/config';               // <-- ensures .env is loaded here
import { Sequelize } from 'sequelize';



const URL =
  `postgres://${process.env.PG_USER}:${encodeURIComponent(process.env.PG_PASSWORD)}@` +
  `${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DB}`;

export const sequelize = new Sequelize(URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
});
