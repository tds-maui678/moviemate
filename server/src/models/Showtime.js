import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Showtime = sequelize.define("Showtime", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  startsAt: { type: DataTypes.DATE, allowNull: false }, 
});