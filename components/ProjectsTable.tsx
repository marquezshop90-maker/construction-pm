'use client'
import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import type { Project } from '@/lib/types'
import { Plus, Search, SlidersHorizontal, ArrowUpRight } from 'lucide-react'

const fmtUSD = (n: number | null) =>
  n ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : '—'
const fmtNum = (n: number | null) =>
  n ? n.toLocaleString('en-US') : '—'
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export default function ProjectsTable({ initialProjects }: { initialProjects: Project[] }) {
  const [search, setSearch]     = useState('')
  const [filterRes, setRes]     = useState('')
  const [filterState, setFState]= useState('')
  const [filterType, setFType]  = useState('')

  const states = useMemo(
    () => [...new Set(initialProjects.map(p => p.state).filter(Boolean))].sort() as string[],
    [initialProjects]
  )

  const filtered = useMemo(() => {
    let r = initialProjects
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(p =>
        p.project_name?.toLowerCase().includes(q) ||
        p.gc?.toLowerCase().includes(q) ||
        p.architect?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q)
      )
    }
    if (filterRes)   r = r.filter(p => p.client_response === filterRes)
    if (filterState) r = r.filter(p => p.state === filterState)
    if (filterType)  r = r.filter(p => p.contract_type === filterType)
    return r
  }, [initialProjects, search, filterRes, filterState, filterType])

  const totalVal = useMemo(
    () => filtered.filter(p => (p.total_contract_price ?? 0) > 0)
          .reduce((s, p) => s + (p.total_contract_price ?? 0), 0),
    [filtered]
  )

  const clearFilters = useCallback(() => {
    setSearch(''); setRes(''); setFState(''); setFType('')
  }, [])

  const hasFilters = search || filterRes || filterState || filterType

  return (
    <>
      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="form-input pl-8 py-1.5" placeholder="Search name, GC, architect, city…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <select className="form-select w-36 py-1.5" value={filterRes} onChange={e => setRes(e.target.value)}>
            <option value="">All Results</option>
            <option>Won</option><option>Lost</option><option>Pending</option>
          </select>
          <select className="form-select w-32 py-1.5" value={filterState} onChange={e => setFState(e.target.value)}>
            <option value="">All States</option>
            {states.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="form-select w-32 py-1.5" value={filterType} onChange={e => setFType(e.target.value)}>
            <option value="">All Types</option>
            <option>Turn-Key</option><option>Labor</option>
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-slate-600 underline">
              Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-500">
              <span className="font-bold text-slate-900">{filtered.length}</span> of {initialProjects.length}
            </span>
            {totalVal > 0 && (
              <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                {fmtUSD(totalVal)} total
              </span>
            )}
            <Link href="/projects/new" className="btn-primary text-xs px-3 py-1.5">
              <Plus className="w-3.5 h-3.5" /> New Project
            </Link>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Project Name','General Contractor','City / State','Bid Date','Contract','Floor SF','Total Contract','Result',''].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${h==='Total Contract'?'text-right':'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-16 text-slate-400 text-sm">No projects found</td></tr>
              )}
              {filtered.map((p, i) => (
                <tr key={p.id} className={`border-b border-slate-100 hover:bg-orange-50/30 transition-colors ${i%2===1?'bg-slate-50/40':''}`}>
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}`} className="font-semibold text-slate-800 hover:text-orange-500 transition-colors">
                      {p.project_name}
                    </Link>
                    {p.building_type && <p className="text-xs text-slate-400 mt-0.5">{p.building_type}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{p.gc ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{[p.city, p.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(p.date_of_bid)}</td>
                  <td className="px-4 py-3">
                    {p.contract_type
                      ? <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{p.contract_type}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{fmtNum(p.floor_sf)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800 text-xs">{fmtUSD(p.total_contract_price)}</td>
                  <td className="px-4 py-3">
                    {p.client_response === 'Won'  && <span className="badge-won">Won</span>}
                    {p.client_response === 'Lost' && <span className="badge-lost">Lost</span>}
                    {(!p.client_response || p.client_response==='Pending') && <span className="badge-pending">Pending</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}`} className="text-slate-300 hover:text-orange-500 transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
