import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { requireAuth } from "../middleware/requireAuth.js";
import { User } from "../models/index.js";
import { sequelize } from "../config/db.js";

const router = Router();

// GET /api/user/me
router.get("/me", requireAuth, async (req, res) => {
  const u = await User.findByPk(req.user.id);
  res.json({ id: u.id, name: u.name, email: u.email, role: u.role });
});

// PUT /api/user/profile  (name/email)
router.put("/profile", requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email().transform((e) => e.toLowerCase().trim()),
  });
  const { name, email } = schema.parse(req.body);

  // check unique email (case-insensitive)
  const exists = await User.findOne({
    where: sequelize.where(sequelize.fn("lower", sequelize.col("email")), email),
  });
  if (exists && exists.id !== req.user.id) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const u = await User.findByPk(req.user.id);
  u.name = name;
  u.email = email;
  await u.save();

  res.json({ id: u.id, name: u.name, email: u.email, role: u.role });
});

// PUT /api/user/password
router.put("/password", requireAuth, async (req, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string()
      .min(8).max(72)
      .regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/).regex(/[^A-Za-z0-9]/),
  });
  const { currentPassword, newPassword } = schema.parse(req.body);

  const u = await User.findByPk(req.user.id);
  const ok = await bcrypt.compare(currentPassword, u.passwordHash);
  if (!ok) return res.status(400).json({ error: "Current password is incorrect" });

  u.passwordHash = await bcrypt.hash(newPassword, 12);
  await u.save();

  res.json({ ok: true });
});

export default router;