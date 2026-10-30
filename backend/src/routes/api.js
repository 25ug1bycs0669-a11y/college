import { Router } from "express";
import { randomUUID } from "node:crypto";
import { pool } from "../db.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();

const resources = {
  students: {
    table: "students",
    id: "student_id",
    fields: ["student_code", "name", "email", "phone", "department_id", "course_id", "year", "status", "address", "enrollment_date"],
    required: ["name", "email", "department_id"],
    search: ["student_code", "name", "email", "phone"],
    orderBy: "created_at",
  },
  faculty: {
    table: "faculty",
    id: "faculty_id",
    fields: ["faculty_code", "name", "email", "phone", "department_id", "designation", "hire_date"],
    required: ["name", "email", "department_id"],
    search: ["faculty_code", "name", "email", "designation"],
    orderBy: "created_at",
  },
  courses: {
    table: "courses",
    id: "course_id",
    fields: ["code", "name", "department_id", "duration", "tuition_fee", "description"],
    required: ["code", "name", "department_id"],
    search: ["code", "name", "description"],
    orderBy: "name",
  },
  departments: {
    table: "departments",
    id: "department_id",
    fields: ["code", "name", "head"],
    required: ["code", "name"],
    search: ["code", "name", "head"],
    orderBy: "name",
  },
  exams: {
    table: "exams",
    id: "exam_id",
    fields: ["title", "course_id", "exam_date", "total_marks", "venue"],
    required: ["title", "course_id", "exam_date", "total_marks"],
    search: ["title", "venue"],
    orderBy: "exam_date",
  },
};

const writes = requireRole("admin");
const teachingStaff = requireRole("admin", "faculty");

function cleanInput(body, fields) {
  body ||= {};
  return Object.fromEntries(
    fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field] === "" ? null : body[field]]),
  );
}

function validateInput(input, required) {
  const missing = required.filter((field) => input[field] === undefined || input[field] === null || input[field] === "");
  return missing.length ? `Required fields: ${missing.join(", ")}.` : null;
}

for (const [resourceName, config] of Object.entries(resources)) {
  const base = `/${resourceName}`;
  router.get(base, async (req, res, next) => {
    try {
      const { q = "", limit = "200" } = req.query;
      const safeLimit = Math.min(500, Math.max(1, Number.parseInt(limit, 10) || 200));
      const clauses = [];
      const values = [];
      if (resourceName === "students" && req.user.role === "student") {
        clauses.push("email = ?");
        values.push(req.user.email);
      }
      if (resourceName === "faculty" && req.user.role === "student") {
        return res.status(403).json({ error: "You do not have permission to view faculty records." });
      }
      if (q && config.search.length) {
        clauses.push(`(${config.search.map((field) => `\`${field}\` LIKE ?`).join(" OR ")})`);
        config.search.forEach(() => values.push(`%${String(q).slice(0, 100)}%`));
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const [rows] = await pool.execute(
        `SELECT * FROM \`${config.table}\` ${where} ORDER BY \`${config.orderBy}\` DESC LIMIT ${safeLimit}`,
        values,
      );
      res.json(rows);
    } catch (error) {
      next(error);
    }
  });

  router.post(base, writes, async (req, res, next) => {
    try {
      const input = cleanInput(req.body, config.fields.filter((field) => field !== "student_code" && field !== "faculty_code"));
      const invalid = validateInput(input, config.required);
      if (invalid) return res.status(400).json({ error: invalid });
      if (resourceName === "students") {
        input.student_code = `STU-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
        if (!input.enrollment_date) input.enrollment_date = new Date().toISOString().slice(0, 10);
        if (!input.status) input.status = "active";
      }
      if (resourceName === "faculty") {
        input.faculty_code = `FAC-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
        if (!input.hire_date) input.hire_date = new Date().toISOString().slice(0, 10);
      }
      const fields = Object.keys(input);
      const [result] = await pool.execute(
        `INSERT INTO \`${config.table}\` (${fields.map((field) => `\`${field}\``).join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`,
        fields.map((field) => input[field]),
      );
      const [rows] = await pool.execute(`SELECT * FROM \`${config.table}\` WHERE \`${config.id}\` = ?`, [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "A record with that email or code already exists." });
      if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "Choose an existing department, course, or student." });
      next(error);
    }
  });

  router.put(`${base}/:id`, writes, async (req, res, next) => {
    try {
      const input = cleanInput(req.body, config.fields.filter((field) => field !== "student_code" && field !== "faculty_code"));
      const invalid = validateInput(input, config.required);
      if (invalid) return res.status(400).json({ error: invalid });
      const fields = Object.keys(input);
      if (!fields.length) return res.status(400).json({ error: "Provide at least one field to update." });
      const [result] = await pool.execute(
        `UPDATE \`${config.table}\` SET ${fields.map((field) => `\`${field}\` = ?`).join(", ")} WHERE \`${config.id}\` = ?`,
        [...fields.map((field) => input[field]), req.params.id],
      );
      if (!result.affectedRows) return res.status(404).json({ error: "Record not found." });
      const [rows] = await pool.execute(`SELECT * FROM \`${config.table}\` WHERE \`${config.id}\` = ?`, [req.params.id]);
      res.json(rows[0]);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "A record with that email or code already exists." });
      if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "Choose an existing department or course." });
      next(error);
    }
  });

  router.delete(`${base}/:id`, writes, async (req, res, next) => {
    try {
      const [result] = await pool.execute(`DELETE FROM \`${config.table}\` WHERE \`${config.id}\` = ?`, [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ error: "Record not found." });
      res.status(204).end();
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") return res.status(409).json({ error: "This record is in use and cannot be deleted." });
      next(error);
    }
  });
}

router.get("/dashboard", async (req, res, next) => {
  try {
    if (req.user.role === "student") {
      const [[student]] = await pool.execute(
        "SELECT student_id, student_code, name, email, enrollment_date, status, course_id, department_id FROM students WHERE email = ? LIMIT 1",
        [req.user.email],
      );
      if (!student) return res.status(404).json({ error: "No student profile is linked to this account." });
      const [[attendance]] = await pool.execute(
        "SELECT COUNT(*) AS total, SUM(status = 'present') AS present FROM attendance WHERE student_id = ? AND attendance_date = CURDATE()",
        [student.student_id],
      );
      const [[fees]] = await pool.execute(
        "SELECT COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS collected, COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending FROM fees WHERE student_id = ?",
        [student.student_id],
      );
      const [monthlyFees] = await pool.execute(
        "SELECT DATE_FORMAT(paid_at, '%b') AS month, SUM(amount) AS amount FROM fees WHERE student_id = ? AND status = 'paid' AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY YEAR(paid_at), MONTH(paid_at), DATE_FORMAT(paid_at, '%b') ORDER BY YEAR(paid_at), MONTH(paid_at)",
        [student.student_id],
      );
      const [attendanceTrend] = await pool.execute(
        "SELECT DATE_FORMAT(attendance_date, '%b %e') AS day, ROUND(100 * SUM(status = 'present') / COUNT(*)) AS rate FROM attendance WHERE student_id = ? AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY attendance_date ORDER BY attendance_date",
        [student.student_id],
      );
      return res.json({
        totals: { students: 1, faculty: 0, courses: student.course_id ? 1 : 0, departments: 1 },
        attendance: { present: attendance.present || 0, total: attendance.total || 0 },
        fees,
        recentStudents: [student],
        monthlyFees,
        attendanceTrend,
      });
    }
    const [[students]] = await pool.query("SELECT COUNT(*) AS total FROM students");
    const [[faculty]] = await pool.query("SELECT COUNT(*) AS total FROM faculty");
    const [[courses]] = await pool.query("SELECT COUNT(*) AS total FROM courses");
    const [[departments]] = await pool.query("SELECT COUNT(*) AS total FROM departments");
    const [[attendance]] = await pool.query(
      "SELECT COUNT(*) AS total, SUM(status = 'present') AS present FROM attendance WHERE attendance_date = CURDATE()",
    );
    const [[fees]] = await pool.query(
      "SELECT COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS collected, COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending FROM fees",
    );
    const [recentStudents] = await pool.query(
      "SELECT student_id, student_code, name, email, enrollment_date, status FROM students ORDER BY created_at DESC LIMIT 5",
    );
    const [monthlyFees] = await pool.query(
      "SELECT DATE_FORMAT(paid_at, '%b') AS month, SUM(amount) AS amount FROM fees WHERE status = 'paid' AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY YEAR(paid_at), MONTH(paid_at), DATE_FORMAT(paid_at, '%b') ORDER BY YEAR(paid_at), MONTH(paid_at)",
    );
    const [attendanceTrend] = await pool.query(
      "SELECT DATE_FORMAT(attendance_date, '%b %e') AS day, ROUND(100 * SUM(status = 'present') / COUNT(*)) AS rate FROM attendance WHERE attendance_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY attendance_date ORDER BY attendance_date",
    );
    res.json({
      totals: {
        students: students.total,
        faculty: faculty.total,
        courses: courses.total,
        departments: departments.total,
      },
      attendance: { present: attendance.present || 0, total: attendance.total || 0 },
      fees,
      recentStudents,
      monthlyFees,
      attendanceTrend,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/attendance", async (req, res, next) => {
  try {
    if (req.user.role === "student") return res.status(403).json({ error: "You do not have permission to view attendance records." });
    const conditions = [];
    const params = [];
    if (req.query.date) { conditions.push("a.attendance_date = ?"); params.push(req.query.date); }
    if (req.query.department_id) { conditions.push("s.department_id = ?"); params.push(req.query.department_id); }
    if (req.query.student_id) { conditions.push("a.student_id = ?"); params.push(req.query.student_id); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await pool.execute(
      `SELECT a.attendance_id, a.student_id, s.student_code, s.name AS student_name, d.name AS department, a.attendance_date, a.status FROM attendance a JOIN students s ON s.student_id = a.student_id JOIN departments d ON d.department_id = s.department_id ${where} ORDER BY a.attendance_date DESC, s.name LIMIT 500`,
      params,
    );
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/attendance", teachingStaff, async (req, res, next) => {
  try {
    const { student_id: studentId, attendance_date: date, status } = req.body || {};
    if (!studentId || !date || !["present", "absent", "late", "excused"].includes(status)) {
      return res.status(400).json({ error: "Choose a student, date, and valid attendance status." });
    }
    await pool.execute(
      "INSERT INTO attendance (student_id, attendance_date, status, marked_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)",
      [studentId, date, status, req.user.id],
    );
    res.status(201).json({ message: "Attendance saved." });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "Choose an existing student." });
    next(error);
  }
});

router.get("/fees", async (req, res, next) => {
  try {
    const user = req.user;
    if (user.role === "faculty") return res.status(403).json({ error: "You do not have permission to view fee records." });
    const where = user.role === "student" ? "WHERE s.email = ?" : "";
    const values = user.role === "student" ? [user.email] : [];
    const [rows] = await pool.query(
      `SELECT f.fee_id, f.student_id, s.student_code, s.name AS student_name, f.amount, f.due_date, f.status, f.description, f.paid_at, f.created_at FROM fees f JOIN students s ON s.student_id = f.student_id ${where} ORDER BY f.created_at DESC LIMIT 500`,
      values,
    );
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/fees", writes, async (req, res, next) => {
  try {
    const { student_id: studentId, amount, due_date: dueDate, description } = req.body || {};
    if (!studentId || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !dueDate) {
      return res.status(400).json({ error: "Choose a student, a positive amount, and a due date." });
    }
    const [result] = await pool.execute(
      "INSERT INTO fees (student_id, amount, due_date, description, status) VALUES (?, ?, ?, ?, 'pending')",
      [studentId, Number(amount), dueDate, description || null],
    );
    res.status(201).json({ fee_id: result.insertId, status: "pending" });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "Choose an existing student." });
    next(error);
  }
});

router.patch("/fees/:id/pay", writes, async (req, res, next) => {
  try {
    const [result] = await pool.execute(
      "UPDATE fees SET status = 'paid', paid_at = NOW() WHERE fee_id = ? AND status = 'pending'",
      [req.params.id],
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Pending fee record not found." });
    res.json({ message: "Payment recorded." });
  } catch (error) { next(error); }
});

router.get("/exams/:id/results", async (req, res, next) => {
  try {
    const studentFilter = req.user.role === "student" ? "AND s.email = ?" : "";
    const values = req.user.role === "student" ? [req.params.id, req.user.email] : [req.params.id];
    const [rows] = await pool.execute(
      `SELECT m.mark_id, m.student_id, s.student_code, s.name AS student_name, m.marks, m.grade FROM marks m JOIN students s ON s.student_id = m.student_id WHERE m.exam_id = ? ${studentFilter} ORDER BY s.name`,
      values,
    );
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/exams/:id/results", teachingStaff, async (req, res, next) => {
  try {
    const { student_id: studentId, marks: score } = req.body || {};
    const marks = Number(score);
    if (!studentId || !Number.isFinite(marks) || marks < 0) {
      return res.status(400).json({ error: "Choose a student and enter a valid mark." });
    }
    const [exams] = await pool.execute("SELECT total_marks FROM exams WHERE exam_id = ?", [req.params.id]);
    if (!exams.length) return res.status(404).json({ error: "Examination not found." });
    if (marks > exams[0].total_marks) return res.status(400).json({ error: `Marks cannot exceed ${exams[0].total_marks}.` });
    const percent = marks / exams[0].total_marks;
    const grade = percent >= 0.9 ? "A+" : percent >= 0.8 ? "A" : percent >= 0.7 ? "B" : percent >= 0.6 ? "C" : percent >= 0.4 ? "D" : "F";
    await pool.execute(
      "INSERT INTO marks (exam_id, student_id, marks, grade) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE marks = VALUES(marks), grade = VALUES(grade)",
      [req.params.id, studentId, marks, grade],
    );
    res.status(201).json({ message: "Result saved.", grade });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "Choose an existing student." });
    next(error);
  }
});

router.get("/timetable", async (req, res, next) => {
  try {
    const params = [];
    let where = "";
    if (req.user.role === "student") {
      where = "JOIN students st ON st.course_id = t.course_id WHERE st.email = ?";
      params.push(req.user.email);
    } else if (req.user.role === "faculty") {
      where = "JOIN faculty af ON af.faculty_id = t.faculty_id WHERE af.email = ?";
      params.push(req.user.email);
    } else if (req.query.faculty_id) {
      where = "WHERE t.faculty_id = ?";
      params.push(req.query.faculty_id);
    }
    const [rows] = await pool.execute(
      `SELECT t.timetable_id, t.course_id, c.name AS course_name, t.faculty_id, f.name AS faculty_name, t.day_of_week, t.start_time, t.end_time, t.room FROM timetable t JOIN courses c ON c.course_id = t.course_id JOIN faculty f ON f.faculty_id = t.faculty_id ${where} ORDER BY FIELD(t.day_of_week, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), t.start_time LIMIT 500`,
      params,
    );
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/timetable", writes, async (req, res, next) => {
  let connection;
  let lockAcquired = false;
  const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  try {
    const { course_id: courseId, faculty_id: facultyId, day_of_week: day, start_time: start, end_time: end, room } = req.body || {};
    if (!courseId || !facultyId || !dayOptions.includes(day) || !start || !end || !room) {
      return res.status(400).json({ error: "Course, faculty, day, start/end time, and room are required." });
    }
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(start) || !timePattern.test(end) || start >= end) {
      return res.status(400).json({ error: "Enter valid 24-hour times and ensure the end time is after the start time." });
    }
    if (String(room).trim().length > 40) return res.status(400).json({ error: "Room names must be 40 characters or fewer." });
    connection = await pool.getConnection();
    const lockName = `campusflow_timetable_${day}`;
    const [locks] = await connection.execute("SELECT GET_LOCK(?, 10) AS acquired", [lockName]);
    lockAcquired = locks[0]?.acquired === 1;
    if (!lockAcquired) return res.status(503).json({ error: "Timetable is busy. Please try again." });
    const [conflicts] = await connection.execute(
      "SELECT timetable_id FROM timetable WHERE day_of_week = ? AND start_time < ? AND end_time > ? AND (faculty_id = ? OR room = ?) LIMIT 1",
      [day, end, start, facultyId, String(room).trim()],
    );
    if (conflicts.length) return res.status(409).json({ error: "Schedule conflict: this faculty member or room is already booked." });
    const [result] = await connection.execute(
      "INSERT INTO timetable (course_id, faculty_id, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?)",
      [courseId, facultyId, day, start, end, String(room).trim()],
    );
    res.status(201).json({ timetable_id: result.insertId });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "Choose an existing course and faculty member." });
    next(error);
  } finally {
    if (connection) {
      if (lockAcquired) {
        try {
          await connection.execute("SELECT RELEASE_LOCK(?)", [`campusflow_timetable_${req.body.day_of_week}`]);
        } catch (error) {
          console.error("Could not release timetable lock:", error.message);
        }
      }
      connection.release();
    }
  }
});

router.delete("/timetable/:id", writes, async (req, res, next) => {
  try {
    const [result] = await pool.execute("DELETE FROM timetable WHERE timetable_id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Class not found." });
    res.status(204).end();
  } catch (error) { next(error); }
});

export default router;
