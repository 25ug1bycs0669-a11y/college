import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRouter from "./routes/auth.js";
import apiRouter from "./routes/api.js";
import { authenticate } from "./middleware/auth.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api", authenticate, apiRouter);

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.code === "ER_BAD_FIELD_ERROR") return res.status(400).json({ error: "One or more submitted fields are invalid." });
  if (error.code === "ER_DATA_TOO_LONG" || error.code === "ER_TRUNCATED_WRONG_VALUE") {
    return res.status(400).json({ error: "One or more submitted values are invalid." });
  }
  res.status(500).json({ error: "An unexpected server error occurred." });
});

export default app;
