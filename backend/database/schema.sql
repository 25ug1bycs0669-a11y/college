CREATE DATABASE IF NOT EXISTS college_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE college_management;

CREATE TABLE IF NOT EXISTS departments (
  department_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  head VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  course_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  department_id INT UNSIGNED NOT NULL,
  duration VARCHAR(50) NULL,
  tuition_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_courses_department FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE IF NOT EXISTS students (
  student_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  department_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NULL,
  year TINYINT UNSIGNED NULL,
  status ENUM('active','inactive','graduated') NOT NULL DEFAULT 'active',
  address VARCHAR(255) NULL,
  enrollment_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_department FOREIGN KEY (department_id) REFERENCES departments(department_id),
  CONSTRAINT fk_students_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS faculty (
  faculty_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  faculty_code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  department_id INT UNSIGNED NOT NULL,
  designation VARCHAR(120) NULL,
  hire_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_faculty_department FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE IF NOT EXISTS student_courses (
  student_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, course_id),
  CONSTRAINT fk_student_courses_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  CONSTRAINT fk_student_courses_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','faculty','student') NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  attendance_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('present','absent','late','excused') NOT NULL,
  marked_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_student_date (student_id, attendance_date),
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_user FOREIGN KEY (marked_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fees (
  fee_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  description VARCHAR(255) NULL,
  status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fees_student FOREIGN KEY (student_id) REFERENCES students(student_id)
);

CREATE TABLE IF NOT EXISTS exams (
  exam_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  exam_date DATE NOT NULL,
  total_marks DECIMAL(7,2) NOT NULL,
  venue VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_exams_course FOREIGN KEY (course_id) REFERENCES courses(course_id)
);

CREATE TABLE IF NOT EXISTS marks (
  mark_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  exam_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  marks DECIMAL(7,2) NOT NULL,
  grade VARCHAR(3) NOT NULL,
  UNIQUE KEY uq_marks_exam_student (exam_id, student_id),
  CONSTRAINT fk_marks_exam FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE,
  CONSTRAINT fk_marks_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS timetable (
  timetable_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  faculty_id INT UNSIGNED NOT NULL,
  day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(40) NOT NULL,
  CONSTRAINT fk_timetable_course FOREIGN KEY (course_id) REFERENCES courses(course_id),
  CONSTRAINT fk_timetable_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
);
