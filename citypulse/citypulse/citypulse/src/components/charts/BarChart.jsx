import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function BarChart({ data = [], bars = [{ key: 'value', color: '#3b82f6' }], height = 260 }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data}>
          <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff' }} />
          {bars.map((b) => (
            <Bar key={b.key} dataKey={b.key} fill={b.color} radius={[4, 4, 0, 0]} />
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </div>
  )
}
