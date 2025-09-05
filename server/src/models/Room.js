import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Room = sequelize.define("Room", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true }, 
  capacity: { type: DataTypes.INTEGER, allowNull: true },           
});