import dotenv from "dotenv";
import app from "./app.js";
import { pool } from "./db.js";

dotenv.config();
const port = Number(process.env.PORT || 4000);

try {
  await pool.query("SELECT 1");
  app.listen(port, () => console.log(`CampusFlow API listening on http://localhost:${port}`));
} catch (error) {
  console.error("Could not connect to MySQL. Check backend/.env and ensure the database schema has been imported.", error.message);
  process.exitCode = 1;
}
