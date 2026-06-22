'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/lib/types'
import { Building2, CheckCircle2, XCircle, DollarSign, Clock, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import Link from 'next/link'

const PIE_COLORS  = ['#10B981', '#EF4444', '#F59E0B']
const BAR_COLORS  = ['#F97316', '#EA580C', '#C2410C', '#FB923C', '#FDBA74', '#FED7AA', '#FFF7ED', '#7C3AED']

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.from('projects').select('*').then(({ data }) => {
      setProjects(data ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
    </div>
  )

  const won     = projects.filter(p => p.client_response === 'Won')
  const lost    = projects.filter(p => p.client_response === 'Lost')
  const pending = projects.filter(p => !p.client_response || p.client_response === 'Pending')
  const withVal = projects.filter(p => (p.total_contract_price ?? 0) > 0)
  const totalVal = withVal.reduce((s, p) => s + (p.total_contract_price ?? 0), 0)
  const winRate  = projects.length ? Math.round((won.length / projects.length) * 100) : 0

  // By state
  const byState: Record<string, number> = {}
  projects.forEach(p => { if (p.state) byState[p.state] = (byState[p.state] ?? 0) + 1 })
  const stateData = Object.entries(byState).map(([state, count]) => ({ state, count })).sort((a,b) => b.count - a.count).slice(0,8)

  // Pie
  const pieData = [
    { name: 'Won', value: won.length },
    { name: 'Lost', value: lost.length },
    { name: 'Pending', value: pending.length },
  ].filter(d => d.value > 0)

  // Complexity
  const byCmplx: Record<string, number> = {}
  projects.forEach(p => { if (p.complexity) byCmplx[p.complexity] = (byCmplx[p.complexity] ?? 0) + 1 })
  const cmplxData = Object.entries(byCmplx).map(([name, count]) => ({ name, count }))

  // Recent
  const recent = [...projects]
    .filter(p => p.date_of_bid)
    .sort((a, b) => new Date(b.date_of_bid!).getTime() - new Date(a.date_of_bid!).getTime())
    .slice(0, 6)

  const stats = [
    { label: 'Total Projects', value: projects.length, Icon: Building2, accent: 'border-l-slate-500',  text: 'text-slate-700' },
    { label: 'Won',            value: won.length,      Icon: CheckCircle2, accent: 'border-l-emerald-500', text: 'text-emerald-600' },
    { label: 'Lost',           value: lost.length,     Icon: XCircle,     accent: 'border-l-red-500',    text: 'text-red-600' },
    { label: 'In Progress',    value: pending.length,  Icon: Clock,        accent: 'border-l-amber-500',  text: 'text-amber-600' },
    { label: 'Total Value',    value: fmtUSD(totalVal),Icon: DollarSign,  accent: 'border-l-orange-500', text: 'text-orange-600' },
    { label: 'Win Rate',       value: `${winRate}%`,   Icon: TrendingUp,  accent: 'border-l-violet-500', text: 'text-violet-600' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">Overview</p>
          <h1 className="text-3xl font-black text-slate-900">Dashboard</h1>
        </div>
        <p className="text-sm text-slate-400">{projects.length} total projects in database</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map(({ label, value, Icon, accent, text }) => (
          <div key={label} className={`stat-card border-l-4 ${accent}`}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-2xl font-black text-slate-900">{value}</p>
              <Icon className={`w-5 h-5 ${text} opacity-70 mt-0.5`} />
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 stat-card">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Projects by State</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stateData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="state" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E2E8F0' }} />
              <Bar dataKey="count" name="Projects" radius={[3, 3, 0, 0]}>
                {stateData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Bid Results</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="45%" innerRadius={52} outerRadius={80} dataKey="value" paddingAngle={4}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="stat-card">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">By Complexity</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={cmplxData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Bar dataKey="count" name="Projects" fill="#F97316" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Recent Projects</p>
            <Link href="/projects" className="text-xs text-orange-500 font-semibold hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recent.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between py-2.5 group">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-orange-500 transition truncate">
                    {p.project_name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {[p.city, p.state].filter(Boolean).join(', ')}
                    {p.date_of_bid ? ` · ${fmtDate(p.date_of_bid)}` : ''}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-3 text-right">
                  <span className={
                    p.client_response === 'Won'  ? 'badge-won' :
                    p.client_response === 'Lost' ? 'badge-lost' : 'badge-pending'
                  }>
                    {p.client_response ?? 'Pending'}
                  </span>
                  {p.total_contract_price ? (
                    <p className="text-xs text-slate-400 mt-0.5">{fmtUSD(p.total_contract_price)}</p>
                  ) : null}
                </div>
              </Link>
            ))}
            {recent.length === 0 && (
              <p className="text-sm text-slate-400 py-8 text-center">No projects yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
