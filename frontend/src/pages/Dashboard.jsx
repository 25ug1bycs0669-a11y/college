import { lazy, Suspense, useEffect, useState } from "react";
import { BookOpen, ClipboardCheck, CreditCard, GraduationCap, Settings2, ShieldCheck, Users } from "lucide-react";
import { api } from "../api.js";
import { PageTitle, StatCard } from "../components/Common.jsx";

const FeeChart = lazy(() => import("../FeeChart.jsx"));
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function Dashboard({ role }) {
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
  <div className="panel recent-panel"><div className="panel-heading"><div><h2>{role === "student" ? "My student profile" : "Recent registrations"}</h2><p>{role === "student" ? "Your academic profile" : "Latest students added to the system"}</p></div><span className="record-count">{role === "student" ? "My account" : "Latest 5"}</span></div><div className="table-scroll"><table><thead><tr><th>Student</th><th>Student ID</th><th>Email</th><th>Enrollment date</th><th>Status</th></tr></thead><tbody>{data?.recentStudents?.length ? data.recentStudents.map((student) => <tr key={student.student_id}><td><div className="student-cell"><span className="avatar small">{student.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><strong>{student.name}</strong></div></td><td className="muted-cell">{student.student_code}</td><td>{student.email}</td><td>{String(student.enrollment_date).slice(0, 10)}</td><td><span className={`status-pill ${student.status}`}>{student.status}</span></td></tr>) : <tr><td colSpan="5" className="empty-cell">{data ? "No student registrations yet." : "Loading registrations…"}</td></tr>}</tbody></table></div></div>
  {role === "student" && <div className="student-welcome"><ShieldCheck size={18} /> Your student portal is ready. Use the sidebar to explore your courses, fees, examination schedule, and timetable.</div>}
  </section>;
}
