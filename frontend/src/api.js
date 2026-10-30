const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export async function api(path, options = {}) {
  const token = localStorage.getItem("campusflow_token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      localStorage.removeItem("campusflow_token");
      localStorage.removeItem("campusflow_user");
      window.dispatchEvent(new Event("campusflow:unauthorized"));
    }
    throw new Error(data.error || "The request could not be completed.");
  }
  return data;
}

export function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [keys.map(quote).join(","), ...rows.map((row) => keys.map((key) => quote(row[key])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
