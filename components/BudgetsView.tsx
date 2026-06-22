'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { BudgetItem, Project } from '@/lib/types'
import { Search } from 'lucide-react'

const fmtUSD = (n: number | null) =>
  n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
const fmtNum = (n: number | null) =>
  n != null ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

const TYPE_ORDER = ['Material','Labor','Install','Install - Primed','Equip-Material','Equipment','Financial']
const TYPE_COLORS: Record<string, string> = {
  'Material':         'bg-blue-50 text-blue-700 border-blue-200',
  'Labor':            'bg-green-50 text-green-700 border-green-200',
  'Install':          'bg-purple-50 text-purple-700 border-purple-200',
  'Install - Primed': 'bg-violet-50 text-violet-700 border-violet-200',
  'Equip-Material':   'bg-amber-50 text-amber-700 border-amber-200',
  'Equipment':        'bg-orange-50 text-orange-700 border-orange-200',
  'Financial':        'bg-slate-50 text-slate-600 border-slate-200',
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-black text-slate-900">{value}</p>
    </div>
  )
}

export default function BudgetsView({
  projects
}: {
  projects: { id: string; project_name: string }[]
}) {
  const [selectedId, setSelectedId]       = useState<string>('')
  const [search, setSearch]               = useState('')
  const [items, setItems]                 = useState<BudgetItem[]>([])
  const [project, setProject]             = useState<Partial<Project> | null>(null)
  const [loading, setLoading]             = useState(false)

  const filtered = useMemo(() =>
    projects.filter(p => p.project_name.toLowerCase().includes(search.toLowerCase())),
    [projects, search]
  )

  useEffect(() => {
    if (!selectedId) { setItems([]); setProject(null); return }
    setLoading(true)
    Promise.all([
      supabase.from('budget_items').select('*').eq('project_id', selectedId).order('sort_order'),
      supabase.from('projects').select('*').eq('id', selectedId).single(),
    ]).then(([itemsRes, projRes]) => {
      setItems(itemsRes.data ?? [])
      setProject(projRes.data)
      setLoading(false)
    })
  }, [selectedId])

  // Group items by type
  const grouped = useMemo(() => {
    const map: Record<string, BudgetItem[]> = {}
    items.forEach(item => {
      const key = item.type ?? 'Other'
      if (!map[key]) map[key] = []
      map[key].push(item)
    })
    return map
  }, [items])

  const sortedTypes = Object.keys(grouped).sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a), bi = TYPE_ORDER.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const grandTotal = items.reduce((s, i) => s + (i.total ?? 0), 0)

  const selected = projects.find(p => p.id === selectedId)

  return (
    <div className="space-y-5">
      {/* Project selector */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="form-input pl-8 py-1.5"
              placeholder="Search project…"
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedId('') }} />
          </div>
          <select className="form-select flex-1 min-w-64 py-1.5"
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setSearch('') }}>
            <option value="">— Select a project —</option>
            {filtered.map(p => (
              <option key={p.id} value={p.id}>{p.project_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty state */}
      {!selectedId && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 text-center">
          <p className="text-slate-400 text-sm">Select a project to view its budget</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      )}

      {/* Content */}
      {!loading && selectedId && project && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900">{selected?.project_name}</h2>
            <span className={
              project.client_response === 'Won'  ? 'badge-won' :
              project.client_response === 'Lost' ? 'badge-lost' : 'badge-pending'
            }>{project.client_response ?? 'Pending'}</span>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <SummaryCard label="Floor SF"              value={fmtNum(project.floor_sf ?? null)} />
            <SummaryCard label="Siding SF"             value={fmtNum(project.siding_sf ?? null)} />
            <SummaryCard label="Windows"               value={project.windows?.toLocaleString() ?? '—'} />
            <SummaryCard label="Patio Doors"           value={project.patio_doors?.toLocaleString() ?? '—'} />
            <SummaryCard label="Shaftwall LF/Level"    value={fmtNum(project.shaftwall_lf_per_level ?? null)} />
            <SummaryCard label="Frame L,N,E Price"     value={fmtUSD(project.frame_lne_price ?? null)} />
            <SummaryCard label="Frame Material"        value={fmtUSD(project.frame_material ?? null)} />
            <SummaryCard label="Truss Price"           value={fmtUSD(project.truss_price ?? null)} />
            <SummaryCard label="Siding L&M"            value={fmtUSD(project.siding_lm ?? null)} />
            <SummaryCard label="Total Contract"        value={fmtUSD(project.total_contract_price ?? null)} />
          </div>

          {/* No budget items */}
          {items.length === 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-10 text-center text-slate-400 text-sm">
              No budget line items found for this project.<br/>
              Import a budget file to populate this section.
            </div>
          )}

          {/* Budget lines grouped by type */}
          {items.length > 0 && (
            <div className="space-y-4">
              {sortedTypes.map(type => {
                const typeItems = grouped[type]
                const typeTotal = typeItems.reduce((s, i) => s + (i.total ?? 0), 0)
                const badge = TYPE_COLORS[type] ?? 'bg-slate-50 text-slate-600 border-slate-200'
                return (
                  <div key={type} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded border ${badge}`}>{type}</span>
                      <span className="text-sm font-bold text-slate-700">{fmtUSD(typeTotal)}</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-5 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Description</th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Price/Unit</th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Qty</th>
                          <th className="text-right px-5 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {typeItems.map(item => (
                          <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="px-5 py-2.5 text-slate-700">{item.description}</td>
                            <td className="px-4 py-2.5 text-right text-slate-500">
                              {item.price_per != null ? `$${item.price_per.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-500">
                              {item.qty != null ? item.qty.toLocaleString('en-US') : '—'}
                            </td>
                            <td className="px-5 py-2.5 text-right font-semibold text-slate-800">
                              {fmtUSD(item.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}

              {/* Grand total */}
              <div className="bg-slate-900 rounded-lg px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">Grand Total</span>
                <span className="text-xl font-black text-orange-400">{fmtUSD(grandTotal)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
