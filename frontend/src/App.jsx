import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, BookOpen, CalendarDays, Check, ChevronDown,
  CircleHelp, ClipboardCheck, CreditCard, GraduationCap, LayoutDashboard, LogOut, Menu,
  Moon, Plus, Search, Settings2, ShieldCheck, Sun, Users, X,
} from "lucide-react";
import { api, downloadCsv } from "./api.js";
import brandMark from "./assets/brand-mark.svg";
import Login from "./pages/Login.jsx";
import SupportPage from "./pages/SupportPage.jsx";
import { FormField, Modal, PageTitle, Toast } from "./components/Common.jsx";

const FeeChart = lazy(() => import("./FeeChart.jsx"));
const navigation = [
  { label: "Overview", icon: LayoutDashboard, key: "dashboard", roles: ["admin", "faculty", "student"] },
  { label: "Students", icon: GraduationCap, key: "students", roles: ["admin", "faculty"] },
  { label: "Faculty", icon: Users, key: "faculty", roles: ["admin"] },
  { label: "Courses", icon: BookOpen, key: "courses", roles: ["admin", "faculty", "student"] },
  { label: "Departments", icon: Settings2, key: "departments", roles: ["admin"] },
  { label: "Attendance", icon: ClipboardCheck, key: "attendance", roles: ["admin", "faculty"] },
  { label: "Fees", icon: CreditCard, key: "fees", roles: ["admin", "student"] },
  { label: "Examinations", icon: Activity, key: "exams", roles: ["admin", "faculty", "student"] },
  { label: "Timetable", icon: CalendarDays, key: "timetable", roles: ["admin", "faculty", "student"] },
];

const configurations = {
  students: {
    title: "Students", singular: "student", endpoint: "students", icon: GraduationCap,
    description: "Manage student records, enrollment, and academic profiles.",
    columns: [["student_code", "Student ID"], ["name", "Student"], ["email", "Email"], ["department_id", "Department"], ["course_id", "Course"], ["status", "Status"]],
    fields: [
      { name: "name", label: "Full name", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      { name: "phone", label: "Phone number" },
      { name: "department_id", label: "Department", type: "select", source: "departments", required: true },
      { name: "course_id", label: "Course", type: "select", source: "courses" },
      { name: "year", label: "Year of study", type: "number", min: 1, max: 8 },
      { name: "status", label: "Enrollment status", type: "select", options: [["active", "Active"], ["inactive", "Inactive"], ["graduated", "Graduated"]], defaultValue: "active" },
      { name: "enrollment_date", label: "Enrollment date", type: "date" },
      { name: "address", label: "Address", type: "textarea" },
    ],
  },
  faculty: {
    title: "Faculty", singular: "faculty member", endpoint: "faculty", icon: Users,
    description: "Maintain faculty profiles and department assignments.",
    columns: [["faculty_code", "Faculty ID"], ["name", "Faculty member"], ["email", "Email"], ["department_id", "Department"], ["designation", "Designation"]],
    fields: [
      { name: "name", label: "Full name", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      { name: "phone", label: "Phone number" },
      { name: "department_id", label: "Department", type: "select", source: "departments", required: true },
      { name: "designation", label: "Designation" },
      { name: "hire_date", label: "Hire date", type: "date" },
    ],
  },
  courses: {
    title: "Courses", singular: "course", endpoint: "courses", icon: BookOpen,
    description: "Organize programs, course duration, and tuition details.",
    columns: [["code", "Course code"], ["name", "Course"], ["department_id", "Department"], ["duration", "Duration"], ["tuition_fee", "Tuition"]],
    fields: [
      { name: "code", label: "Course code", required: true },
      { name: "name", label: "Course name", required: true },
      { name: "department_id", label: "Department", type: "select", source: "departments", required: true },
      { name: "duration", label: "Duration", placeholder: "e.g. 3 years" },
      { name: "tuition_fee", label: "Tuition fee", type: "number", min: 0 },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  departments: {
    title: "Departments", singular: "department", endpoint: "departments", icon: Settings2,
    description: "Manage academic departments and department heads.",
    columns: [["code", "Code"], ["name", "Department"], ["head", "Department head"]],
    fields: [
      { name: "code", label: "Department code", required: true },
      { name: "name", label: "Department name", required: true },
      { name: "head", label: "Department head" },
    ],
  },
  exams: {
    title: "Examinations", singular: "examination", endpoint: "exams", icon: Activity,
    description: "Schedule assessments and record student results.",
    columns: [["title", "Examination"], ["course_id", "Course"], ["exam_date", "Date"], ["total_marks", "Total marks"], ["venue", "Venue"]],
    fields: [
      { name: "title", label: "Examination title", required: true },
      { name: "course_id", label: "Course", type: "select", source: "courses", required: true },
      { name: "exam_date", label: "Exam date", type: "date", required: true },
      { name: "total_marks", label: "Maximum marks", type: "number", min: 1, required: true },
      { name: "venue", label: "Venue" },
    ],
  },
};

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);
const displayValue = (value) => value === null || value === undefined || value === "" ? "—" : value;
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

function ManagementView({ config, lookups, role, notify, query }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await api(`/${config.endpoint}?limit=500`)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [config.endpoint]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSearch(query || ""); }, [query]);
  const filtered = useMemo(() => rows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(search.toLowerCase()))), [rows, search]);
  const canEdit = role === "admin";
  const getCell = (row, key) => {
    if (key === "department_id") return lookups.departments?.find((item) => item.department_id === row[key])?.name || "—";
    if (key === "course_id") return lookups.courses?.find((item) => item.course_id === row[key])?.name || "—";
    if (key === "status") return <span className={`status-pill ${row[key]}`}>{row[key]}</span>;
    if (key === "tuition_fee") return currency.format(Number(row[key]));
    if (key.endsWith("_date")) return String(row[key] || "—").slice(0, 10);
    return displayValue(row[key]);
  };
  const openForm = (row = null) => {
    const values = {};
    for (const field of config.fields) values[field.name] = row?.[field.name] ?? field.defaultValue ?? "";
    setError("");
    setModal({ row, values });
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const method = modal.row ? "PUT" : "POST";
      const id = modal.row?.[`${config.endpoint === "students" ? "student" : config.endpoint === "faculty" ? "faculty" : config.endpoint === "courses" ? "course" : config.endpoint === "departments" ? "department" : "exam"}_id`];
      await api(`/${config.endpoint}${modal.row ? `/${id}` : ""}`, { method, body: modal.values });
      setModal(null);
      notify(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} ${modal.row ? "updated" : "created"} successfully.`);
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  const remove = async (row) => {
    const idKey = `${config.endpoint === "students" ? "student" : config.endpoint === "faculty" ? "faculty" : config.endpoint === "courses" ? "course" : config.endpoint === "departments" ? "department" : "exam"}_id`;
    if (!window.confirm(`Delete ${row.name || row.title || row.code}? This cannot be undone.`)) return;
    try { await api(`/${config.endpoint}/${row[idKey]}`, { method: "DELETE" }); notify("Record deleted."); await load(); }
    catch (err) { notify(err.message, "error"); }
  };
  const exportRows = filtered.map((row) => Object.fromEntries(config.columns.map(([key, label]) => [label, key === "department_id" || key === "course_id" ? getCell(row, key) : row[key]])));

  return <section>
    <PageTitle eyebrow="ACADEMIC MANAGEMENT" title={config.title} description={config.description}>
      <div className="title-actions"><button className="button button-secondary" onClick={() => downloadCsv(`${config.endpoint}-report.csv`, exportRows)}>Download report</button>{canEdit && <button className="button button-primary" onClick={() => openForm()}><Plus size={17} /> Add {config.singular}</button>}</div>
    </PageTitle>
    <div className="panel data-panel"><div className="table-toolbar"><div className="search-box"><Search size={16} /><input placeholder={`Search ${config.title.toLowerCase()}...`} value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></div><span className="record-count">{filtered.length} records</span></div>
      {error && !modal && <div className="inline-error">{error}</div>}
      <div className="table-scroll"><table><thead><tr>{config.columns.map(([, label]) => <th key={label}>{label}</th>)}{canEdit && <th className="action-heading">Actions</th>}</tr></thead>
        <tbody>{loading ? <tr><td colSpan={config.columns.length + Number(canEdit)} className="empty-cell">Loading records…</td></tr> : filtered.length ? filtered.map((row) => <tr key={row[`${config.endpoint === "students" ? "student" : config.endpoint === "faculty" ? "faculty" : config.endpoint === "courses" ? "course" : config.endpoint === "departments" ? "department" : "exam"}_id`]}>{config.columns.map(([key]) => <td key={key}>{getCell(row, key)}</td>)}{canEdit && <td><div className="row-actions"><button className="icon-button" onClick={() => openForm(row)} aria-label="Edit record"><Settings2 size={16} /></button><button className="icon-button danger-hover" onClick={() => remove(row)} aria-label="Delete record"><X size={16} /></button></div></td>}</tr>) : <tr><td colSpan={config.columns.length + Number(canEdit)} className="empty-cell">No records found. {canEdit && "Add your first record to get started."}</td></tr>}</tbody>
      </table></div>
    </div>
    {modal && <Modal title={`${modal.row ? "Edit" : "Add"} ${config.singular}`} onClose={() => setModal(null)}><form className="record-form" onSubmit={save}><div className="form-grid">{config.fields.map((field) => <FormField key={field.name} field={field} value={modal.values[field.name]} lookups={lookups} onChange={(value) => setModal((current) => ({ ...current, values: { ...current.values, [field.name]: value } }))} />)}</div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : modal.row ? "Save changes" : `Create ${config.singular}`}</button></div></form></Modal>}
  </section>;
}

function StatCard({ icon: Icon, label, value, note, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>;
}

function Dashboard({ role }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("/dashboard").then(setData).catch((err) => setError(err.message)); }, []);
  const totals = data?.totals || {};
  const attendanceRate = data?.attendance?.total ? Math.round((data.attendance.present / data.attendance.total) * 100) : 0;
  const chartData = data?.monthlyFees?.length ? data.monthlyFees : [{ month: "No data", amount: 0 }];
  const trend = data?.attendanceTrend?.length ? data.attendanceTrend : [{ day: "No data", rate: 0 }];
  const currentDate = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()).toUpperCase();
  return <section><PageTitle eyebrow={currentDate} title="Good morning" description="Here’s what’s happening across your campus today." /><div className="stat-grid">
    {role === "student" ? <>
      <StatCard icon={ClipboardCheck} label="Attendance today" value={data?.attendance?.total ? `${attendanceRate}%` : "—"} note={data?.attendance?.total ? `${data.attendance.present} marked present` : "Not marked yet"} tone="blue" />
      <StatCard icon={BookOpen} label="My enrolled courses" value={totals.courses ?? "—"} note="Current course enrollment" tone="green" />
      <StatCard icon={CreditCard} label="Fees paid" value={currency.format(data?.fees?.collected || 0)} note="Payments on your account" tone="violet" />
      <StatCard icon={CreditCard} label="Fees due" value={currency.format(data?.fees?.pending || 0)} note="Outstanding on your account" tone="orange" />
    </> : <>
      <StatCard icon={GraduationCap} label="Total students" value={totals.students ?? "—"} note="Enrolled student records" tone="blue" />
      <StatCard icon={Users} label="Faculty members" value={totals.faculty ?? "—"} note="Academic faculty" tone="violet" />
      <StatCard icon={BookOpen} label="Active courses" value={totals.courses ?? "—"} note="Available programs" tone="green" />
      <StatCard icon={Settings2} label="Departments" value={totals.departments ?? "—"} note="Academic departments" tone="orange" />
    </>}
  </div>
  {error && <div className="inline-error">{error}</div>}
  <div className="dashboard-grid"><div className="panel chart-panel"><div className="panel-heading"><div><h2>Fee collection</h2><p>Paid tuition over the last 6 months</p></div><span className="chart-legend"><i /> Collected</span></div><div className="chart-wrap">{data ? <Suspense fallback={<div className="chart-loading">Loading chart…</div>}><FeeChart data={chartData} /></Suspense> : <div className="chart-loading">Loading performance…</div>}</div><div className="chart-footer"><span>Total collected</span><strong>{currency.format(data?.fees?.collected || 0)}</strong><span className="footer-divider" /><span>Outstanding</span><strong>{currency.format(data?.fees?.pending || 0)}</strong></div></div>
    <div className="panel attendance-panel"><div className="panel-heading"><div><h2>Attendance today</h2><p>Student attendance overview</p></div><span className="icon-chip"><ClipboardCheck size={17} /></span></div><div className="attendance-number">{attendanceRate}<span>%</span></div><p className="attendance-caption">{data?.attendance?.present ?? 0} present out of {data?.attendance?.total ?? 0} marked</p><div className="progress-track"><div style={{ width: `${attendanceRate}%` }} /></div><div className="mini-chart">{trend.map((item, index) => <div key={`${item.day}-${index}`} title={`${item.day}: ${item.rate}%`}><i style={{ height: `${Math.max(8, Number(item.rate) || 8)}%` }} /></div>)}</div><div className="mini-chart-label"><span>Last 7 days</span><span>Attendance trend</span></div></div>
  </div>
  <div className="panel recent-panel"><div className="panel-heading"><div><h2>Recent registrations</h2><p>Latest students added to the system</p></div><span className="record-count">Latest 5</span></div><div className="table-scroll"><table><thead><tr><th>Student</th><th>Student ID</th><th>Email</th><th>Enrollment date</th><th>Status</th></tr></thead><tbody>{data?.recentStudents?.length ? data.recentStudents.map((student) => <tr key={student.student_id}><td><div className="student-cell"><span className="avatar small">{student.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><strong>{student.name}</strong></div></td><td className="muted-cell">{student.student_code}</td><td>{student.email}</td><td>{String(student.enrollment_date).slice(0, 10)}</td><td><span className={`status-pill ${student.status}`}>{student.status}</span></td></tr>) : <tr><td colSpan="5" className="empty-cell">{data ? "No student registrations yet." : "Loading registrations…"}</td></tr>}</tbody></table></div></div>
  {role === "student" && <div className="student-welcome"><ShieldCheck size={18} /> Your student portal is ready. Use the sidebar to explore your courses, fees, examination schedule, and timetable.</div>}
  </section>;
}

function AttendancePage({ lookups, role, notify }) {
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ date: today(), department_id: "", student_id: "" });
  const [entry, setEntry] = useState({ student_id: "", attendance_date: today(), status: "present" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      setRows(await api(`/attendance?${params}`));
      setError("");
    } catch (err) { setError(err.message); }
  }, [filters]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api("/students?limit=500").then(setStudents).catch((err) => setError(err.message));
    api("/departments").then(setDepartments).catch((err) => setError(err.message));
  }, []);
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await api("/attendance", { method: "POST", body: entry });
      notify("Attendance saved successfully.");
      setFilters((value) => ({ ...value, date: entry.attendance_date }));
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  return <section><PageTitle eyebrow="ACADEMIC MANAGEMENT" title="Attendance" description="Record daily attendance and review student participation."><button className="button button-secondary" onClick={() => downloadCsv("attendance-report.csv", rows)}>Download report</button></PageTitle>
    <div className="panel attendance-form-panel"><div><h2>Mark attendance</h2><p>Recording a student again updates that day’s attendance.</p></div><form className="attendance-form" onSubmit={save}><label className="form-field"><span>Student *</span><select required value={entry.student_id} onChange={(event) => setEntry({ ...entry, student_id: event.target.value })}><option value="">Choose student</option>{students.map((student) => <option key={student.student_id} value={student.student_id}>{student.student_code} · {student.name}</option>)}</select></label><label className="form-field"><span>Date *</span><input type="date" required value={entry.attendance_date} onChange={(event) => setEntry({ ...entry, attendance_date: event.target.value })} /></label><label className="form-field"><span>Status *</span><select value={entry.status} onChange={(event) => setEntry({ ...entry, status: event.target.value })}>{["present", "absent", "late", "excused"].map((status) => <option key={status}>{status}</option>)}</select></label><button className="button button-primary" disabled={saving}><Check size={16} /> {saving ? "Saving…" : "Save attendance"}</button></form>{error && <p className="form-error">{error}</p>}</div>
    <div className="panel data-panel"><div className="table-toolbar"><div><h2>Attendance records</h2><p className="toolbar-subtitle">Filter records by date, department, or student.</p></div><div className="filter-group"><input type="date" aria-label="Filter by date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} /><select aria-label="Filter by department" value={filters.department_id} onChange={(event) => setFilters({ ...filters, department_id: event.target.value })}><option value="">All departments</option>{departments.map((dept) => <option key={dept.department_id} value={dept.department_id}>{dept.name}</option>)}</select><select aria-label="Filter by student" value={filters.student_id} onChange={(event) => setFilters({ ...filters, student_id: event.target.value })}><option value="">All students</option>{students.map((student) => <option key={student.student_id} value={student.student_id}>{student.name}</option>)}</select></div></div><div className="table-scroll"><table><thead><tr><th>Student</th><th>Student ID</th><th>Department</th><th>Date</th><th>Status</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.attendance_id}><td><strong>{row.student_name}</strong></td><td>{row.student_code}</td><td>{row.department}</td><td>{String(row.attendance_date).slice(0, 10)}</td><td><span className={`status-pill ${row.status}`}>{row.status}</span></td></tr>) : <tr><td colSpan="5" className="empty-cell">No attendance records match these filters.</td></tr>}</tbody></table></div></div>
  </section>;
}

function FeesPage({ notify, role }) {
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ student_id: "", amount: "", due_date: today(), description: "Semester tuition" });
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setRows(await api("/fees")); } catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); api("/students?limit=500").then(setStudents).catch((err) => setError(err.message)); }, [load]);
  const paid = rows.filter((row) => row.status === "paid").reduce((sum, row) => sum + Number(row.amount), 0);
  const pending = rows.filter((row) => row.status === "pending").reduce((sum, row) => sum + Number(row.amount), 0);
  const addFee = async (event) => {
    event.preventDefault(); setError("");
    try { await api("/fees", { method: "POST", body: form }); notify("Fee record added."); setForm({ ...form, student_id: "", amount: "" }); await load(); }
    catch (err) { setError(err.message); }
  };
  const markPaid = async (row) => {
    try { await api(`/fees/${row.fee_id}/pay`, { method: "PATCH" }); notify("Payment recorded."); await load(); }
    catch (err) { notify(err.message, "error"); }
  };
  const receipt = (row) => {
    const popup = window.open("", "_blank", "width=620,height=720");
    if (!popup) return notify("Allow pop-ups to generate a receipt.", "error");
    popup.document.write(`<html><head><title>Fee receipt</title><style>body{font:16px Arial;color:#18263f;padding:48px}h1{color:#315fcb}.row{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:14px 0}.tag{color:#16835d}</style></head><body><h1>CampusFlow</h1><p>Official fee receipt</p><div class="row"><span>Receipt</span><strong>CF-${String(row.fee_id).padStart(6, "0")}</strong></div><div class="row"><span>Student</span><strong>${escapeHtml(row.student_name)} (${escapeHtml(row.student_code)})</strong></div><div class="row"><span>Description</span><strong>${escapeHtml(row.description || "College fees")}</strong></div><div class="row"><span>Amount paid</span><strong>${currency.format(Number(row.amount))}</strong></div><div class="row"><span>Payment date</span><strong>${row.paid_at ? String(row.paid_at).slice(0, 10) : today()}</strong></div><div class="row"><span>Status</span><strong class="tag">PAID</strong></div><p style="margin-top:42px">Thank you. This is a computer-generated receipt.</p><script>window.print()</script></body></html>`);
    popup.document.close();
  };
  return <section><PageTitle eyebrow="FINANCE & ACCOUNTS" title="Fee management" description="Track tuition payments, outstanding balances, and student receipts." /><div className="fee-summary"><div className="fee-summary-card"><span className="summary-icon green"><ArrowUpRight size={17} /></span><span>Total collected</span><strong>{currency.format(paid)}</strong><small>Across {rows.filter((row) => row.status === "paid").length} paid invoices</small></div><div className="fee-summary-card"><span className="summary-icon orange"><ArrowDownRight size={17} /></span><span>Pending payments</span><strong>{currency.format(pending)}</strong><small>{rows.filter((row) => row.status === "pending").length} outstanding invoices</small></div><div className="fee-summary-card"><span className="summary-icon blue"><CreditCard size={17} /></span><span>Total invoices</span><strong>{rows.length}</strong><small>All student fee records</small></div></div>
    {role === "admin" && <div className="panel attendance-form-panel"><div><h2>Create a fee record</h2><p>Record a student payment obligation.</p></div><form className="attendance-form fee-form" onSubmit={addFee}><label className="form-field"><span>Student *</span><select required value={form.student_id} onChange={(event) => setForm({ ...form, student_id: event.target.value })}><option value="">Choose student</option>{students.map((student) => <option key={student.student_id} value={student.student_id}>{student.student_code} · {student.name}</option>)}</select></label><label className="form-field"><span>Amount (₹) *</span><input type="number" min="1" step="0.01" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label className="form-field"><span>Due date *</span><input type="date" required value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} /></label><label className="form-field"><span>Description</span><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><button className="button button-primary"><Plus size={16} /> Add fee</button></form>{error && <p className="form-error">{error}</p>}</div>}
    <div className="panel data-panel"><div className="table-toolbar"><div><h2>Payment history</h2><p className="toolbar-subtitle">Record payments and generate printable receipts.</p></div><button className="button button-secondary" onClick={() => downloadCsv("fee-report.csv", rows)}>Download report</button></div><div className="table-scroll"><table><thead><tr><th>Student</th><th>Description</th><th>Amount</th><th>Due date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.fee_id}><td><div className="student-cell"><span className="avatar small">{row.student_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{row.student_name}</strong><small>{row.student_code}</small></div></div></td><td>{row.description || "College fees"}</td><td><strong>{currency.format(Number(row.amount))}</strong></td><td>{String(row.due_date).slice(0, 10)}</td><td><span className={`status-pill ${row.status}`}>{row.status}</span></td><td><div className="row-actions">{row.status === "pending" && <button className="button button-small button-secondary" onClick={() => markPaid(row)}>Mark paid</button>}{row.status === "paid" && <button className="button button-small button-secondary" onClick={() => receipt(row)}>Receipt</button>}</div></td></tr>) : <tr><td colSpan="6" className="empty-cell">No fee records yet.</td></tr>}</tbody></table></div></div>
  </section>;
}

function ExamsPage({ role, lookups, notify }) {
  const config = configurations.exams;
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState("");
  const [results, setResults] = useState([]);
  const [resultForm, setResultForm] = useState({ student_id: "", marks: "" });
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { const data = await api("/exams"); setRows(data); setSelected((value) => value || String(data[0]?.exam_id || "")); }
    catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); api("/students?limit=500").then(setStudents).catch((err) => setError(err.message)); }, [load]);
  useEffect(() => {
    if (selected) api(`/exams/${selected}/results`).then(setResults).catch((err) => setError(err.message));
    else setResults([]);
  }, [selected]);
  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.title}?`)) return;
    try { await api(`/exams/${row.exam_id}`, { method: "DELETE" }); notify("Examination deleted."); setSelected(""); await load(); }
    catch (err) { notify(err.message, "error"); }
  };
  const saveResult = async (event) => {
    event.preventDefault();
    try { const response = await api(`/exams/${selected}/results`, { method: "POST", body: resultForm }); notify(`Result saved${response.grade ? ` · Grade ${response.grade}` : ""}.`); setResultForm({ student_id: "", marks: "" }); setResults(await api(`/exams/${selected}/results`)); }
    catch (err) { setError(err.message); }
  };
  return <section><ManagementView config={config} lookups={lookups} role={role} notify={notify} query="" /><div className="panel data-panel results-panel"><div className="panel-heading"><div><h2>Student results</h2><p>Enter marks and review examination grades.</p></div><select aria-label="Select examination" value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Select an examination</option>{rows.map((row) => <option key={row.exam_id} value={row.exam_id}>{row.title}</option>)}</select></div>{role !== "student" && selected && <form className="result-entry" onSubmit={saveResult}><label className="form-field"><span>Student</span><select required value={resultForm.student_id} onChange={(event) => setResultForm({ ...resultForm, student_id: event.target.value })}><option value="">Choose student</option>{students.map((student) => <option key={student.student_id} value={student.student_id}>{student.name}</option>)}</select></label><label className="form-field"><span>Marks (max {rows.find((row) => String(row.exam_id) === String(selected))?.total_marks || "—"})</span><input type="number" min="0" step="0.5" required value={resultForm.marks} onChange={(event) => setResultForm({ ...resultForm, marks: event.target.value })} /></label><button className="button button-primary"><Plus size={16} /> Save result</button></form>}{error && <p className="form-error">{error}</p>}<div className="table-scroll"><table><thead><tr><th>Student</th><th>Student ID</th><th>Marks</th><th>Grade</th></tr></thead><tbody>{results.length ? results.map((item) => <tr key={item.mark_id}><td><strong>{item.student_name}</strong></td><td>{item.student_code}</td><td>{item.marks}</td><td><span className={`grade-badge grade-${item.grade?.[0]?.toLowerCase()}`}>{item.grade}</span></td></tr>) : <tr><td colSpan="4" className="empty-cell">{selected ? "No results entered for this examination." : "Add an examination to enter results."}</td></tr>}</tbody></table></div></div></section>;
}

function TimetablePage({ lookups, notify, role }) {
  const [rows, setRows] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [form, setForm] = useState({ course_id: "", faculty_id: "", day_of_week: "Monday", start_time: "09:00", end_time: "10:00", room: "" });
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setRows(await api("/timetable")); } catch (err) { setError(err.message); }
  }, []);
  useEffect(() => {
    load();
    if (role === "admin") api("/faculty?limit=500").then(setFaculty).catch((err) => setError(err.message));
  }, [load, role]);
  const submit = async (event) => {
    event.preventDefault(); setError("");
    try { await api("/timetable", { method: "POST", body: form }); notify("Class added to the timetable."); await load(); }
    catch (err) { setError(err.message); }
  };
  const remove = async (row) => {
    if (!window.confirm("Remove this class from the timetable?")) return;
    try { await api(`/timetable/${row.timetable_id}`, { method: "DELETE" }); notify("Class removed."); await load(); }
    catch (err) { notify(err.message, "error"); }
  };
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return <section><PageTitle eyebrow="ACADEMIC PLANNING" title="Class timetable" description="Plan weekly classes with automatic room and faculty conflict checks." />{role === "admin" && <div className="panel attendance-form-panel"><div><h2>Schedule a class</h2><p>Overlapping rooms and faculty schedules are blocked automatically.</p></div><form className="attendance-form timetable-form" onSubmit={submit}><label className="form-field"><span>Course *</span><select required value={form.course_id} onChange={(event) => setForm({ ...form, course_id: event.target.value })}><option value="">Select course</option>{lookups.courses?.map((row) => <option key={row.course_id} value={row.course_id}>{row.code} · {row.name}</option>)}</select></label><label className="form-field"><span>Faculty *</span><select required value={form.faculty_id} onChange={(event) => setForm({ ...form, faculty_id: event.target.value })}><option value="">Select faculty</option>{faculty.map((row) => <option key={row.faculty_id} value={row.faculty_id}>{row.name}</option>)}</select></label><label className="form-field"><span>Day *</span><select value={form.day_of_week} onChange={(event) => setForm({ ...form, day_of_week: event.target.value })}>{days.map((day) => <option key={day}>{day}</option>)}</select></label><label className="form-field"><span>Start time *</span><input type="time" required value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} /></label><label className="form-field"><span>End time *</span><input type="time" required value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} /></label><label className="form-field"><span>Room *</span><input required value={form.room} placeholder="e.g. Room 204" onChange={(event) => setForm({ ...form, room: event.target.value })} /></label><button className="button button-primary"><Plus size={16} /> Add to timetable</button></form>{error && <p className="form-error">{error}</p>}</div>}
    <div className="timetable-days">{days.slice(0, 5).map((day) => <div className="panel day-card" key={day}><h3>{day}</h3>{rows.filter((row) => row.day_of_week === day).length ? rows.filter((row) => row.day_of_week === day).map((row) => <div className="class-item" key={row.timetable_id}><div className="class-time">{String(row.start_time).slice(0, 5)} – {String(row.end_time).slice(0, 5)}</div><strong>{row.course_name}</strong><span>{row.faculty_name}</span><span>{row.room}</span>{role === "admin" && <button className="icon-button danger-hover class-remove" onClick={() => remove(row)} aria-label="Remove class"><X size={15} /></button>}</div>) : <p className="empty-day">No classes scheduled</p>}</div>)}</div>
  </section>;
}

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("campusflow_user") || "null"); } catch { return null; } });
  const [page, setPage] = useState("dashboard");
  const [lookups, setLookups] = useState({});
  const [toast, setToast] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem("campusflow_theme") === "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const notify = useCallback((message, type = "success") => { setToast({ message, type }); window.setTimeout(() => setToast(null), 4200); }, []);
  const logout = useCallback(() => { localStorage.removeItem("campusflow_token"); localStorage.removeItem("campusflow_user"); setUser(null); setPage("dashboard"); }, []);
  useEffect(() => { window.addEventListener("campusflow:unauthorized", logout); return () => window.removeEventListener("campusflow:unauthorized", logout); }, [logout]);
  useEffect(() => {
    if (!user) return;
    Promise.all([api("/departments?limit=500"), api("/courses?limit=500")]).then(([departments, courses]) => setLookups({ departments, courses })).catch((err) => notify(err.message, "error"));
  }, [user, notify]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; localStorage.setItem("campusflow_theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => {
    const shortcut = (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.querySelector(".global-search input")?.focus(); } };
    window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const allowedNavigation = navigation.filter((item) => item.roles.includes(user?.role));
  const currentPage = allowedNavigation.some((item) => item.key === page) || page === "support" ? page : "dashboard";
  const currentNav = allowedNavigation.find((item) => item.key === currentPage);
  if (!user) return <Login onLogin={setUser} />;
  const pageTitle = currentPage === "dashboard" ? "Overview" : currentNav?.label || "Support";
  const notifications = [
    { title: "Fee collection update", detail: "Review pending student balances.", icon: CreditCard },
    { title: "Attendance overview", detail: "Today's attendance records are ready.", icon: ClipboardCheck },
    { title: "Campus is up to date", detail: "Your academic records are synced.", icon: Check },
  ];

  return <div className={`app-shell ${sidebarOpen ? "sidebar-open" : ""}`}><aside className="sidebar"><div className="brand"><span className="brand-mark"><img src={brandMark} alt="" /></span><span>campus<span>flow</span></span><button className="mobile-close icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button></div><div className="workspace-label">WORKSPACE</div><nav className="side-nav">{allowedNavigation.map(({ label, icon: Icon, key }) => <button key={key} className={`nav-item ${currentPage === key ? "active" : ""}`} onClick={() => { setPage(key); setSidebarOpen(false); }}><Icon size={18} /><span>{label}</span>{key === "attendance" && <i className="nav-indicator" />}</button>)}</nav><div className="sidebar-bottom"><button className={`nav-item ${currentPage === "support" ? "active" : ""}`} onClick={() => { setPage("support"); setSidebarOpen(false); }}><CircleHelp size={18} /><span>Help & support</span></button><div className="sidebar-profile"><span className="avatar">{(user.name || "User").split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className="profile-copy"><strong>{user.name}</strong><small>{user.role} account</small></span><button className="icon-button logout-button" title="Sign out" onClick={logout}><LogOut size={17} /></button></div></div></aside><div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />
    <main className="main-area"><header className="topbar"><div className="topbar-left"><button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20} /></button><span className="breadcrumb">Campus <span>/</span> {pageTitle}</span></div><div className="topbar-right"><label className="global-search"><Search size={16} /><input placeholder="Search anything..." value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} /><kbd>⌘ K</kbd></label><div className="notification-wrap"><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={18} /><i /></button>{notificationsOpen && <div className="notification-popover"><div className="popover-heading"><strong>Notifications</strong><button onClick={() => setNotificationsOpen(false)}><X size={15} /></button></div>{notifications.map(({ title, detail, icon: Icon }) => <div className="notification-item" key={title}><span><Icon size={16} /></span><div><strong>{title}</strong><small>{detail}</small></div></div>)}</div>}</div><button className="icon-button theme-toggle" onClick={() => setDark(!dark)} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button><span className="topbar-divider" /><button className="topbar-user" onClick={() => setPage("support")}><span className="avatar small">{(user.name || "User").split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{user.name}</strong><small>{user.role === "admin" ? "Administrator" : user.role}</small></span><ChevronDown size={15} /></button></div></header>
      <div className="page-content">{currentPage === "dashboard" ? <Dashboard role={user.role} /> : configurations[currentPage] ? <ManagementView config={configurations[currentPage]} lookups={lookups} role={user.role} notify={notify} query={globalSearch} /> : currentPage === "attendance" ? <AttendancePage lookups={lookups} role={user.role} notify={notify} /> : currentPage === "fees" ? <FeesPage notify={notify} role={user.role} /> : currentPage === "exams" ? <ExamsPage role={user.role} lookups={lookups} notify={notify} /> : currentPage === "timetable" ? <TimetablePage lookups={lookups} notify={notify} role={user.role} /> : <SupportPage />}</div>
    </main><Toast toast={toast} dismiss={() => setToast(null)} /></div>;
}
