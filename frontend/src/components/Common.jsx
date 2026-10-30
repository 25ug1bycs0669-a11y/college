import { useEffect } from "react";
import { Check, X } from "lucide-react";

export function PageTitle({ eyebrow, title, description, children }) {
  return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{children}</div>;
}

export function Toast({ toast, dismiss }) {
  if (!toast) return null;
  return <div className={`toast ${toast.type || "success"}`} role="status"><span>{toast.type === "error" ? "!" : <Check size={17} />}</span>{toast.message}<button onClick={dismiss} aria-label="Dismiss"><X size={15} /></button></div>;
}

export function Modal({ title, children, onClose }) {
  useEffect(() => {
    const close = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><p className="eyebrow">CampusFlow</p><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</section></div>;
}

export function FormField({ field, value, onChange, lookups = {} }) {
  const options = field.options || lookups[field.source]?.map((row) => [String(row[field.source === "departments" ? "department_id" : "course_id"]), `${row.code ? `${row.code} · ` : ""}${row.name}`]) || [];
  return <label className={`form-field ${field.type === "textarea" ? "wide" : ""}`}><span>{field.label}{field.required && <b> *</b>}</span>
    {field.type === "select" ? <select required={field.required} value={value ?? ""} onChange={(event) => onChange(event.target.value)}><option value="">Select {field.label.toLowerCase()}</option>{options.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select>
      : field.type === "textarea" ? <textarea value={value ?? ""} rows="3" onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder || ""} />
        : <input type={field.type || "text"} value={value ?? ""} required={field.required} min={field.min} max={field.max} placeholder={field.placeholder || ""} onChange={(event) => onChange(event.target.value)} />}
  </label>;
}

export function StatCard({ icon: Icon, label, value, note, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>;
}
