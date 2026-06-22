'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { BudgetItem, Project } from '@/lib/types'
import { Search, Pencil, Trash2, Plus, Check, X } from 'lucide-react'

const fmtUSD = (n: number | null) =>
  n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

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
const ALL_TYPES = [...TYPE_ORDER, 'Other']

// ─── Inline edit row ──────────────────────────────────────────────────────────
function EditRow({ item, onSave, onCancel }: { item: BudgetItem; onSave: (u: BudgetItem) => void; onCancel: () => void }) {
  const [desc,  setDesc]  = useState(item.description ?? '')
  const [type,  setType]  = useState(item.type ?? 'Material')
  const [price, setPrice] = useState(item.price_per != null ? String(item.price_per) : '')
  const [qty,   setQty]   = useState(item.qty   != null ? String(item.qty)   : '')
  const [total, setTotal] = useState(item.total != null ? String(item.total) : '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const { data, error } = await supabase
      .from('budget_items')
      .update({ description: desc || null, type: type || null,
        price_per: price !== '' ? parseFloat(price) : null,
        qty:       qty   !== '' ? parseFloat(qty)   : null,
        total:     total !== '' ? parseFloat(total) : null })
      .eq('id', item.id).select().single()
    setSaving(false)
    if (!error && data) onSave(data as BudgetItem)
  }

  const inp = 'w-full bg-white border border-orange-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400'
  return (
    <tr className="bg-orange-50/60 border-b border-orange-100">
      <td className="px-5 py-2"><input className={inp} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description" /></td>
      <td className="px-3 py-2">
        <select className={inp} value={type} onChange={e=>setType(e.target.value)}>
          {ALL_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
      </td>
      <td className="px-3 py-2"><input className={`${inp} text-right`} value={price} onChange={e=>setPrice(e.target.value)} type="number" step="0.01" placeholder="0.00" /></td>
      <td className="px-3 py-2"><input className={`${inp} text-right`} value={qty}   onChange={e=>setQty(e.target.value)}   type="number" placeholder="0" /></td>
      <td className="px-5 py-2"><input className={`${inp} text-right`} value={total} onChange={e=>setTotal(e.target.value)} type="number" step="0.01" placeholder="0.00" /></td>
      <td className="px-3 py-2">
        <div className="flex gap-1 justify-end">
          <button onClick={handleSave} disabled={saving} className="p-1.5 rounded bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={onCancel} className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-600"><X className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  )
}

// ─── Add new row (standalone, always at bottom) ────────────────────────────────
function AddRow({ projectId, defaultType, nextOrder, onAdded, onCancel }: {
  projectId: string; defaultType: string; nextOrder: number
  onAdded: (item: BudgetItem) => void; onCancel: () => void
}) {
  const [desc,  setDesc]  = useState('')
  const [type,  setType]  = useState(defaultType)
  const [price, setPrice] = useState('')
  const [qty,   setQty]   = useState('')
  const [total, setTotal] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!desc.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('budget_items').insert({
      project_id: projectId, description: desc.trim(), type: type || null,
      price_per: price !== '' ? parseFloat(price) : null,
      qty:       qty   !== '' ? parseFloat(qty)   : null,
      total:     total !== '' ? parseFloat(total) : null,
      sort_order: nextOrder,
    }).select().single()
    setSaving(false)
    if (!error && data) onAdded(data as BudgetItem)
  }

  const inp = 'bg-white border border-green-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400 w-full'
  return (
    <div className="bg-white rounded-lg border-2 border-green-300 shadow-sm p-4">
      <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-3">New Line Item</p>
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-4">
          <label className="block text-xs text-slate-500 mb-1">Description *</label>
          <input className={inp} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="e.g. Rough Frame" autoFocus />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Type</label>
          <select className={inp} value={type} onChange={e=>setType(e.target.value)}>
            {ALL_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Price/Unit</label>
          <input className={`${inp} text-right`} value={price} onChange={e=>setPrice(e.target.value)} type="number" step="0.01" placeholder="0.00" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Qty</label>
          <input className={`${inp} text-right`} value={qty} onChange={e=>setQty(e.target.value)} type="number" placeholder="0" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Total</label>
          <input className={`${inp} text-right`} value={total} onChange={e=>setTotal(e.target.value)} type="number" step="0.01" placeholder="0.00" />
        </div>
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 rounded text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving || !desc.trim()}
          className="px-4 py-1.5 rounded text-sm bg-green-500 hover:bg-green-600 text-white font-bold disabled:opacity-50 transition-colors flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Line Item'}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BudgetsView({ projects }: { projects: { id: string; project_name: string }[] }) {
  const [selectedId, setSelectedId] = useState<string>('')
  const [search,     setSearch]     = useState('')
  const [items,      setItems]      = useState<BudgetItem[]>([])
  const [project,    setProject]    = useState<Partial<Project> | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)

  const filtered = useMemo(() =>
    projects.filter(p => p.project_name.toLowerCase().includes(search.toLowerCase())),
    [projects, search])

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
  const selected   = projects.find(p => p.id === selectedId)

  function handleSaved(updated: BudgetItem) { setItems(prev => prev.map(i => i.id === updated.id ? updated : i)); setEditingId(null) }
  function handleAdded(newItem: BudgetItem) { setItems(prev => [...prev, newItem]); setShowAdd(false) }
  async function handleDelete(id: string) {
    await supabase.from('budget_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setDeleteId(null)
  }

  return (
    <div className="space-y-5">
      {/* Selector */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="form-input pl-8 py-1.5" placeholder="Search project…" value={search}
              onChange={e => { setSearch(e.target.value); setSelectedId('') }} />
          </div>
          <select className="form-select flex-1 min-w-64 py-1.5" value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setSearch(''); setEditingId(null); setShowAdd(false) }}>
            <option value="">— Select a project —</option>
            {filtered.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </div>
      </div>

      {!selectedId && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 text-center">
          <p className="text-slate-400 text-sm">Select a project to view its budget</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      )}

      {!loading && selectedId && project && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900">{selected?.project_name}</h2>
            <div className="flex items-center gap-3">
              <button onClick={() => { setShowAdd(true); setEditingId(null) }}
                className="flex items-center gap-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1.5 rounded transition-colors">
                <Plus className="w-4 h-4" /> Add Line Item
              </button>
              <span className={project.client_response === 'Won' ? 'badge-won' : project.client_response === 'Lost' ? 'badge-lost' : 'badge-pending'}>
                {project.client_response ?? 'Pending'}
              </span>
            </div>
          </div>

          {/* Empty state */}
          {items.length === 0 && !showAdd && (
            <div className="bg-white rounded-lg border border-slate-200 p-10 text-center text-slate-400 text-sm">
              No budget line items yet.{' '}
              <button onClick={() => setShowAdd(true)} className="text-orange-500 hover:text-orange-600 font-semibold underline">
                Add the first one
              </button>
            </div>
          )}

          {/* Add new line form — always at top when open */}
          {showAdd && (
            <AddRow
              projectId={selectedId}
              defaultType="Material"
              nextOrder={items.length}
              onAdded={handleAdded}
              onCancel={() => setShowAdd(false)}
            />
          )}

          {/* Budget tables grouped by type */}
          {items.length > 0 && (
            <div className="space-y-4">
              {sortedTypes.map(type => {
                const typeItems = grouped[type]
                const typeTotal = typeItems.reduce((s, i) => s + (i.total ?? 0), 0)
                const badge     = TYPE_COLORS[type] ?? 'bg-slate-50 text-slate-600 border-slate-200'
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
                          <th className="text-left px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Type</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Price/Unit</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Qty</th>
                          <th className="text-right px-5 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Total</th>
                          <th className="w-20 px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {typeItems.map(item =>
                          editingId === item.id
                            ? <EditRow key={item.id} item={item} onSave={handleSaved} onCancel={() => setEditingId(null)} />
                            : (
                              <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 group">
                                <td className="px-5 py-2.5 text-slate-700">{item.description}</td>
                                <td className="px-3 py-2.5 text-slate-500 text-xs">{item.type}</td>
                                <td className="px-3 py-2.5 text-right text-slate-500">
                                  {item.price_per != null ? `$${item.price_per.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                                </td>
                                <td className="px-3 py-2.5 text-right text-slate-500">
                                  {item.qty != null ? item.qty.toLocaleString('en-US') : '—'}
                                </td>
                                <td className="px-5 py-2.5 text-right font-semibold text-slate-800">{fmtUSD(item.total)}</td>
                                <td className="px-3 py-2.5">
                                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingId(item.id); setShowAdd(false) }}
                                      className="p-1.5 rounded hover:bg-blue-100 text-blue-500 transition-colors" title="Edit">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    {deleteId === item.id ? (
                                      <span className="flex items-center gap-1">
                                        <button onClick={() => handleDelete(item.id)}
                                          className="p-1.5 rounded bg-red-500 hover:bg-red-600 text-white"><Check className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => setDeleteId(null)}
                                          className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-600"><X className="w-3.5 h-3.5" /></button>
                                      </span>
                                    ) : (
                                      <button onClick={() => setDeleteId(item.id)}
                                        className="p-1.5 rounded hover:bg-red-100 text-red-400 transition-colors" title="Delete">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                        )}
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
