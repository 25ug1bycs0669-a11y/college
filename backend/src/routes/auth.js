import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, requireRole } from "../middleware/auth.js";
import { createUser, currentUser, login } from "../controllers/authController.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in 15 minutes." },
});

router.post("/login", loginLimiter, login);
router.get("/me", authenticate, currentUser);
router.post("/users", authenticate, requireRole("admin"), createUser);

export default router;
