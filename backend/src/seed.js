import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

dotenv.config();
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  await connection.execute(
    "INSERT IGNORE INTO departments (code, name, head) VALUES ('CSE', 'Computer Science', 'Dr. A. Sharma'), ('ECE', 'Electronics & Communication', 'Dr. R. Nair'), ('BUS', 'Business Administration', 'Dr. M. Kapoor')",
  );
  const [[cse]] = await connection.execute("SELECT department_id FROM departments WHERE code = 'CSE'");
  const [[ece]] = await connection.execute("SELECT department_id FROM departments WHERE code = 'ECE'");
  await connection.execute(
    "INSERT IGNORE INTO courses (code, name, department_id, duration, tuition_fee, description) VALUES ('BCA', 'Bachelor of Computer Applications', ?, '3 years', 48000, 'Undergraduate computing and applications program'), ('BTECH-ECE', 'B.Tech Electronics', ?, '4 years', 62000, 'Electronics and communication engineering')",
    [cse.department_id, ece.department_id],
  );
  const [[bca]] = await connection.execute("SELECT course_id FROM courses WHERE code = 'BCA'");
  const [[eceCourse]] = await connection.execute("SELECT course_id FROM courses WHERE code = 'BTECH-ECE'");
  await connection.execute(
    "INSERT IGNORE INTO students (student_code, name, email, phone, department_id, course_id, year, status, enrollment_date) VALUES ('STU-2026-001', 'Aarav Mehta', 'aarav.student@college.edu', '9876543210', ?, ?, 2, 'active', CURDATE()), ('STU-2026-002', 'Diya Shah', 'diya.student@college.edu', '9876543211', ?, ?, 1, 'active', CURDATE()), ('STU-2026-003', 'Rohan Iyer', 'rohan.student@college.edu', '9876543212', ?, ?, 3, 'active', CURDATE())",
    [cse.department_id, bca.course_id, cse.department_id, bca.course_id, ece.department_id, eceCourse.course_id],
  );
  await connection.execute(
    "INSERT IGNORE INTO faculty (faculty_code, name, email, phone, department_id, designation, hire_date) VALUES ('FAC-2026-001', 'Dr. Priya Menon', 'priya.faculty@college.edu', '9876500001', ?, 'Associate Professor', CURDATE()), ('FAC-2026-002', 'Prof. Karan Rao', 'karan.faculty@college.edu', '9876500002', ?, 'Assistant Professor', CURDATE())",
    [cse.department_id, ece.department_id],
  );
  const accounts = [
    ["admin@college.edu", "Admin@123", "admin", "Campus Administrator"],
    ["priya.faculty@college.edu", "Faculty@123", "faculty", "Dr. Priya Menon"],
    ["aarav.student@college.edu", "Student@123", "student", "Aarav Mehta"],
  ];
  for (const [email, password, role, name] of accounts) {
    await connection.execute(
      "INSERT INTO users (email, password_hash, role, display_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), display_name = VALUES(display_name)",
      [email, await bcrypt.hash(password, 12), role, name],
    );
  }
  await connection.execute(
    "INSERT IGNORE INTO fees (student_id, amount, due_date, description, status, paid_at) SELECT student_id, 12000, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Semester tuition', 'paid', NOW() FROM students WHERE student_code = 'STU-2026-001'",
  );
  await connection.execute(
    "INSERT IGNORE INTO fees (student_id, amount, due_date, description, status) SELECT student_id, 12000, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Semester tuition', 'pending' FROM students WHERE student_code = 'STU-2026-002'",
  );
  await connection.commit();
  console.log("Seed complete. Demo admin: admin@college.edu / Admin@123");
} catch (error) {
  await connection.rollback();
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
} finally {
  connection.release();
  await pool.end();
}
