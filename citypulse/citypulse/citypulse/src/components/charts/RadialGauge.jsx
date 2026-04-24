import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

export default function RadialGauge({ value = 0, max = 100, color = '#3b82f6', label = 'Score', size = 220 }) {
  const data = [{ name: label, value }]
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart data={data} innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0}>
          <RadialBar dataKey="value" cornerRadius={8} fill={color} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-2xl font-bold">{value}/{max}</p>
      </div>
    </div>
  )
}
