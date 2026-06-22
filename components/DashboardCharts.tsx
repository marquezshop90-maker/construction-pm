'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

const BAR_COLORS = ['#F97316','#EA580C','#C2410C','#FB923C','#FDBA74','#FED7AA','#7C3AED','#6D28D9']
const PIE_COLORS = ['#10B981','#EF4444','#F59E0B']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DashboardCharts({ projects }: { projects: any[] }) {
  const byState: Record<string, number> = {}
  projects.forEach(p => { if (p.state) byState[p.state] = (byState[p.state] ?? 0) + 1 })
  const stateData = Object.entries(byState)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count).slice(0, 8)

  const won     = projects.filter(p => p.client_response === 'Won').length
  const lost    = projects.filter(p => p.client_response === 'Lost').length
  const pending = projects.filter(p => !p.client_response || p.client_response === 'Pending').length
  const pieData = [
    { name: 'Won', value: won }, { name: 'Lost', value: lost }, { name: 'Pending', value: pending }
  ].filter(d => d.value > 0)

  const byCmplx: Record<string, number> = {}
  projects.forEach(p => { if (p.complexity) byCmplx[p.complexity] = (byCmplx[p.complexity] ?? 0) + 1 })
  const cmplxData = Object.entries(byCmplx).map(([name, count]) => ({ name, count }))

  const tick = { fontSize: 11, fill: '#94A3B8' }
  const grid = { strokeDasharray: '3 3', stroke: '#F1F5F9' }
  const tooltip = { contentStyle: { fontSize: 12, borderRadius: 6, border: '1px solid #E2E8F0' } }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Projects by state */}
      <div className="lg:col-span-2 stat-card">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Projects by State</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stateData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
            <CartesianGrid {...grid} />
            <XAxis dataKey="state" tick={tick} axisLine={false} tickLine={false} />
            <YAxis tick={tick} axisLine={false} tickLine={false} />
            <Tooltip {...tooltip} />
            <Bar dataKey="count" name="Projects" radius={[3,3,0,0]}>
              {stateData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bid results pie */}
      <div className="stat-card">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Bid Results</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="45%" innerRadius={52} outerRadius={80}
              dataKey="value" paddingAngle={4}>
              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip {...tooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Complexity */}
      <div className="lg:col-span-3 stat-card">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">By Complexity</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={cmplxData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
            <CartesianGrid {...grid} />
            <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
            <YAxis tick={tick} axisLine={false} tickLine={false} />
            <Tooltip {...tooltip} />
            <Bar dataKey="count" name="Projects" fill="#F97316" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
