import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function FeeChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4277ef" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#4277ef" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="var(--line)" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
        <Tooltip formatter={(value) => currency.format(value)} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--text)" }} />
        <Area type="monotone" dataKey="amount" stroke="#4277ef" strokeWidth={2.5} fill="url(#feeGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
