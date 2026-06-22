import { createSupabaseServer } from '@/lib/supabase-server'
import { Building2, CheckCircle2, XCircle, DollarSign, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import DashboardCharts from '@/components/DashboardCharts'

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default async function DashboardPage() {
  const supabase = await createSupabaseServer()
  const { data: projects = [] } = await supabase.from('projects').select('*')

  const won     = projects.filter(p => p.client_response === 'Won')
  const lost    = projects.filter(p => p.client_response === 'Lost')
  const pending = projects.filter(p => !p.client_response || p.client_response === 'Pending')
  const withVal = projects.filter(p => (p.total_contract_price ?? 0) > 0)
  const totalVal = withVal.reduce((s: number, p: { total_contract_price: number }) => s + (p.total_contract_price ?? 0), 0)
  const winRate  = projects.length ? Math.round((won.length / projects.length) * 100) : 0

  const recent = [...projects]
    .filter((p: { date_of_bid: string }) => p.date_of_bid)
    .sort((a: { date_of_bid: string }, b: { date_of_bid: string }) =>
      new Date(b.date_of_bid).getTime() - new Date(a.date_of_bid).getTime())
    .slice(0, 6)

  const stats = [
    { label: 'Total Projects', value: projects.length,   Icon: Building2,   accent: 'border-l-slate-500',   text: 'text-slate-700'   },
    { label: 'Won',            value: won.length,         Icon: CheckCircle2, accent: 'border-l-emerald-500', text: 'text-emerald-600' },
    { label: 'Lost',           value: lost.length,        Icon: XCircle,      accent: 'border-l-red-500',     text: 'text-red-600'     },
    { label: 'In Progress',    value: pending.length,     Icon: Clock,        accent: 'border-l-amber-500',   text: 'text-amber-600'   },
    { label: 'Total Value',    value: fmtUSD(totalVal),   Icon: DollarSign,   accent: 'border-l-orange-500',  text: 'text-orange-600'  },
    { label: 'Win Rate',       value: `${winRate}%`,      Icon: TrendingUp,   accent: 'border-l-violet-500',  text: 'text-violet-600'  },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">Overview</p>
          <h1 className="text-3xl font-black text-slate-900">Dashboard</h1>
        </div>
        <p className="text-sm text-slate-400">{projects.length} total projects in database</p>
      </div>

      {/* KPIs — rendered server-side, instant */}
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

      {/* Charts — client component (needs browser for recharts) */}
      <DashboardCharts projects={projects} />

      {/* Recent projects — server rendered */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Recent Projects</p>
          <Link href="/projects" className="text-xs text-orange-500 font-semibold hover:underline">View all →</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recent.map((p: { id: string; project_name: string; city: string; state: string; date_of_bid: string; client_response: string; total_contract_price: number }) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between py-2.5 group">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-orange-500 transition truncate">
                  {p.project_name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {[p.city, p.state].filter(Boolean).join(', ')}
                  {p.date_of_bid
                    ? ` · ${new Date(p.date_of_bid).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : ''}
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
  )
}
