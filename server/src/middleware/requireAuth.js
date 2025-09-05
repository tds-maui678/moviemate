import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token =
      header.startsWith("Bearer ") ? header.slice(7) : (req.cookies?.token || "");

    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.sub);

    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}