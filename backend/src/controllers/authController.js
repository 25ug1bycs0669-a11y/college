import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../models/db.js";

export async function login(req, res, next) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const [users] = await pool.execute(
      "SELECT user_id, email, password_hash, role, display_name FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    if (!users.length || !(await bcrypt.compare(password, users[0].password_hash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "Authentication is not configured. Set JWT_SECRET in backend/.env." });
    }
    const user = users[0];
    const token = jwt.sign(
      { id: user.user_id, email: user.email, role: user.role, name: user.display_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
    );
    res.json({
      token,
      user: { id: user.user_id, email: user.email, role: user.role, name: user.display_name },
    });
  } catch (error) {
    next(error);
  }
}

export function currentUser(req, res) {
  res.json({ user: req.user });
}

export async function createUser(req, res, next) {
  try {
    const { email, password, role, display_name: displayName } = req.body || {};
    if (!email || !password || !displayName || !["admin", "faculty", "student"].includes(role)) {
      return res.status(400).json({ error: "A name, email, password, and valid role are required." });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: "Passwords must contain at least 8 characters." });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (role === "student" || role === "faculty") {
      const table = role === "student" ? "students" : "faculty";
      const [profiles] = await pool.execute(`SELECT 1 FROM \`${table}\` WHERE email = ? LIMIT 1`, [normalizedEmail]);
      if (!profiles.length) {
        return res.status(400).json({ error: `Create a matching ${role} profile with this email before creating the account.` });
      }
    }
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      "INSERT INTO users (email, password_hash, role, display_name) VALUES (?, ?, ?, ?)",
      [normalizedEmail, hash, role, String(displayName).trim()],
    );
    res.status(201).json({ id: result.insertId, email: normalizedEmail, role });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "That email address is already registered." });
    next(error);
  }
}
