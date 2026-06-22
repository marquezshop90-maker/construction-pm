'use client'
import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createProject, updateProject } from '@/lib/supabase'
import type { Project, ProjectInsert } from '@/lib/types'
import { Save, ChevronDown, ChevronUp, Calculator } from 'lucide-react'

// ─── All helper components defined OUTSIDE ProjectForm ────────────────────────
// (if defined inside, React recreates them on every keystroke → inputs lose focus)

function NumericInput({ value, onChange, placeholder = '', decimals = 2 }: {
  value: number | null; onChange: (v: number | null) => void
  placeholder?: string; decimals?: number
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const display = value != null
    ? value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : ''
  return (
    <input type="text" inputMode="decimal" className="form-input"
      value={editing ? raw : display} placeholder={placeholder}
      onFocus={() => { setEditing(true); setRaw(value?.toString() ?? '') }}
      onChange={e => { if (editing) setRaw(e.target.value) }}
      onBlur={() => {
        setEditing(false)
        const n = parseFloat(raw.replace(/,/g, ''))
        onChange(isNaN(n) ? null : n)
      }} />
  )
}

function IntegerInput({ value, onChange, placeholder = '' }: {
  value: number | null; onChange: (v: number | null) => void; placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const display = value != null ? Math.round(value).toLocaleString('en-US') : ''
  return (
    <input type="text" inputMode="numeric" className="form-input"
      value={editing ? raw : display} placeholder={placeholder}
      onFocus={() => { setEditing(true); setRaw(value?.toString() ?? '') }}
      onChange={e => { if (editing) setRaw(e.target.value) }}
      onBlur={() => {
        setEditing(false)
        const n = parseInt(raw.replace(/,/g, ''), 10)
        onChange(isNaN(n) ? null : n)
      }} />
  )
}

function CalcField({ label, value, format = 'sf' }: {
  label: string; value: number; format?: 'sf' | 'usd'
}) {
  const display = format === 'usd'
    ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${value.toFixed(4)}`
  return (
    <div>
      <label className="form-label flex items-center gap-1.5">
        {label}
        <span className="calc-badge flex items-center gap-0.5">
          <Calculator className="w-2.5 h-2.5" /> Auto
        </span>
      </label>
      <div className="form-input-calc rounded">{display}</div>
    </div>
  )
}

function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const cls = cols === 3 ? 'grid grid-cols-1 md:grid-cols-3 gap-4'
            : cols === 4 ? 'grid grid-cols-2 md:grid-cols-4 gap-4'
            : 'grid grid-cols-1 md:grid-cols-2 gap-4'
  return <div className={cls}>{children}</div>
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

function Section({ id, num, title, children, isOpen, onToggle }: {
  id: string; num: number; title: string; children: React.ReactNode
  isOpen: boolean; onToggle: () => void
}) {
  return (
    <div className="form-section">
      <button type="button" onClick={onToggle} className="section-header w-full">
        <div className="section-title">
          <span className="section-num">{num}</span>
          <span className="text-sm font-bold text-slate-800">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {isOpen && <div className="section-body">{children}</div>}
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────
type Props = { project?: Project; mode: 'create' | 'edit' }

export default function ProjectForm({ project, mode }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const [open, setOpen] = useState({
    general: true, team: true, location: true,
    building: false, dimensions: false, pricing: false,
  })
  const toggle = useCallback((id: string) =>
    setOpen(o => ({ ...o, [id]: !o[id as keyof typeof o] })), [])

  const [form, setForm] = useState<Partial<ProjectInsert>>({
    project_name:           project?.project_name          ?? '',
    client_response:        project?.client_response       ?? null,
    year_completed:         project?.year_completed        ?? null,
    date_of_bid:            project?.date_of_bid           ?? null,
    idapac_index:           project?.idapac_index          ?? null,
    contract_type:          project?.contract_type         ?? null,
    architect:              project?.architect             ?? '',
    engineer:               project?.engineer              ?? '',
    gc:                     project?.gc                    ?? '',
    city:                   project?.city                  ?? '',
    state:                  project?.state                 ?? '',
    building_type:          project?.building_type         ?? '',
    style:                  project?.style                 ?? '',
    complexity:             project?.complexity            ?? null,
    wind_rating:            project?.wind_rating           ?? null,
    ibc_code_year:          project?.ibc_code_year         ?? null,
    levels:                 project?.levels                ?? null,
    wall_height:            project?.wall_height           ?? '',
    stair_shaft:            project?.stair_shaft           ?? '',
    stair_framing:          project?.stair_framing         ?? '',
    hardware_complexity:    project?.hardware_complexity   ?? '',
    clubhouse:              project?.clubhouse             ?? false,
    floor_sf:               project?.floor_sf              ?? null,
    siding_sf:              project?.siding_sf             ?? null,
    exterior_wall_sf:       project?.exterior_wall_sf      ?? null,
    windows:                project?.windows               ?? null,
    patio_doors:            project?.patio_doors           ?? null,
    entry_doors:            project?.entry_doors           ?? null,
    shaftwall_lf_per_level: project?.shaftwall_lf_per_level ?? null,
    truss_depth:            project?.truss_depth           ?? '',
    truss_spacing:          project?.truss_spacing         ?? '',
    frame_lne_price:        project?.frame_lne_price       ?? null,
    frame_material:         project?.frame_material        ?? null,
    truss_price:            project?.truss_price           ?? null,
    siding_lm:              project?.siding_lm             ?? null,
    change_orders:          project?.change_orders         ?? null,
  })

  const set = useCallback((key: keyof ProjectInsert, value: unknown) =>
    setForm(f => ({ ...f, [key]: value })), [])

  const calc = useMemo(() => {
    const fs   = form.floor_sf        ?? 0
    const flne = form.frame_lne_price ?? 0
    const fm   = form.frame_material  ?? 0
    const tp   = form.truss_price     ?? 0
    const slm  = form.siding_lm       ?? 0
    const co   = form.change_orders   ?? 0
    const frame_lne_price_sf  = fs > 0 ? flne / fs : 0
    const frame_material_sf   = fs > 0 ? fm   / fs : 0
    const truss_sf            = fs > 0 ? tp   / fs : 0
    const siding_lm_sf        = fs > 0 ? slm  / fs : 0
    const total_price_sf      = frame_lne_price_sf + frame_material_sf + truss_sf + siding_lm_sf
    const total_contract_price = total_price_sf * fs
    const contract_price_cos  = total_contract_price + co
    const pct_siding_vs_floor = fs > 0 ? (form.siding_sf ?? 0) / fs : 0
    return { frame_lne_price_sf, frame_material_sf, truss_sf, siding_lm_sf,
             total_price_sf, total_contract_price, contract_price_cos, pct_siding_vs_floor }
  }, [form.floor_sf, form.frame_lne_price, form.frame_material,
      form.truss_price, form.siding_lm, form.change_orders, form.siding_sf])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.project_name?.trim()) { setError('Project name is required.'); return }
    setSaving(true); setError(null)
    try {
      const payload = { ...(form as ProjectInsert), ...calc }
      if (mode === 'create') {
        const p = await createProject(payload)
        router.push(`/projects/${p.id}`)
      } else {
        await updateProject(project!.id, payload)
        router.push(`/projects/${project!.id}`)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save project')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Section id="general" num={1} title="Project Identification" isOpen={open.general} onToggle={() => toggle('general')}>
        <F label="Project Name *">
          <input className="form-input" required
            value={form.project_name ?? ''}
            onChange={e => set('project_name', e.target.value)}
            placeholder="e.g. Classen Curve Apartments" />
        </F>
        <Grid cols={3}>
          <F label="Bid Result">
            <select className="form-select" value={form.client_response ?? ''}
              onChange={e => set('client_response', e.target.value || null)}>
              <option value="">— Not set —</option>
              <option>Won</option><option>Lost</option><option>Pending</option>
            </select>
          </F>
          <F label="Year Completed">
            <input className="form-input" type="number" placeholder="2025"
              value={form.year_completed ?? ''}
              onChange={e => set('year_completed', e.target.value ? parseInt(e.target.value) : null)} />
          </F>
          <F label="Contract Type">
            <select className="form-select" value={form.contract_type ?? ''}
              onChange={e => set('contract_type', e.target.value || null)}>
              <option value="">— Select —</option>
              <option>Turn-Key</option><option>Labor</option>
            </select>
          </F>
        </Grid>
        <Grid>
          <F label="Date of Bid">
            <input className="form-input" type="date" value={form.date_of_bid ?? ''}
              onChange={e => set('date_of_bid', e.target.value || null)} />
          </F>
          <F label="IDAPAC Index @ Bid Time">
            <NumericInput value={form.idapac_index ?? null} decimals={0}
              onChange={v => set('idapac_index', v)} placeholder="537" />
          </F>
        </Grid>
      </Section>

      <Section id="team" num={2} title="Project Team" isOpen={open.team} onToggle={() => toggle('team')}>
        <Grid>
          <F label="Architect">
            <input className="form-input" placeholder="e.g. Dwell Design Studio"
              value={form.architect ?? ''}
              onChange={e => set('architect', e.target.value)} />
          </F>
          <F label="Engineer">
            <input className="form-input" placeholder="e.g. m2 Structural"
              value={form.engineer ?? ''}
              onChange={e => set('engineer', e.target.value)} />
          </F>
        </Grid>
        <F label="General Contractor (GC)">
          <input className="form-input" placeholder="e.g. Willowbrook, Inc"
            value={form.gc ?? ''}
            onChange={e => set('gc', e.target.value)} />
        </F>
      </Section>

      <Section id="location" num={3} title="Location" isOpen={open.location} onToggle={() => toggle('location')}>
        <Grid>
          <F label="City">
            <input className="form-input" placeholder="Oklahoma City"
              value={form.city ?? ''}
              onChange={e => set('city', e.target.value)} />
          </F>
          <F label="State">
            <input className="form-input" placeholder="OK"
              value={form.state ?? ''}
              onChange={e => set('state', e.target.value)} />
          </F>
        </Grid>
      </Section>

      <Section id="building" num={4} title="Building Specifications" isOpen={open.building} onToggle={() => toggle('building')}>
        <Grid>
          <F label="Building Type">
            <input className="form-input" placeholder="Type VA, Type III, Type VB…"
              value={form.building_type ?? ''}
              onChange={e => set('building_type', e.target.value)} />
          </F>
          <F label="Style">
            <input className="form-input" placeholder="Garden Style, Ground Wrap, Podium Deck…"
              value={form.style ?? ''}
              onChange={e => set('style', e.target.value)} />
          </F>
        </Grid>
        <Grid cols={3}>
          <F label="Complexity">
            <select className="form-select" value={form.complexity ?? ''}
              onChange={e => set('complexity', e.target.value || null)}>
              <option value="">— Select —</option>
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
          </F>
          <F label="Wind Rating">
            <NumericInput value={form.wind_rating ?? null} decimals={0}
              onChange={v => set('wind_rating', v)} placeholder="115" />
          </F>
          <F label="IBC Code Year">
            <input className="form-input" type="number" placeholder="2018"
              value={form.ibc_code_year ?? ''}
              onChange={e => set('ibc_code_year', e.target.value ? parseInt(e.target.value) : null)} />
          </F>
        </Grid>
        <Grid cols={3}>
          <F label="Number of Levels">
            <input className="form-input" type="number" placeholder="4"
              value={form.levels ?? ''}
              onChange={e => set('levels', e.target.value ? parseInt(e.target.value) : null)} />
          </F>
          <F label="Wall Height (ft-in)">
            <input className="form-input" placeholder={`10'-4"`}
              value={form.wall_height ?? ''}
              onChange={e => set('wall_height', e.target.value)} />
            <p className="text-[10px] text-slate-400 mt-1">Format: [ft]&apos;-[in]&quot; e.g. 10&apos;-4&quot;</p>
          </F>
          <F label="Clubhouse">
            <select className="form-select" value={form.clubhouse ? 'yes' : 'no'}
              onChange={e => set('clubhouse', e.target.value === 'yes')}>
              <option value="no">No</option><option value="yes">Yes</option>
            </select>
          </F>
        </Grid>
        <Grid>
          <F label="Stair Shaft Construction">
            <input className="form-input" placeholder="Wood, CMU, Concrete…"
              value={form.stair_shaft ?? ''}
              onChange={e => set('stair_shaft', e.target.value)} />
          </F>
          <F label="Stair Framing">
            <input className="form-input" placeholder="Wood, Steel…"
              value={form.stair_framing ?? ''}
              onChange={e => set('stair_framing', e.target.value)} />
          </F>
        </Grid>
        <F label="Hardware Complexity">
          <input className="form-input" placeholder="Easy, Medium, Hard"
            value={form.hardware_complexity ?? ''}
            onChange={e => set('hardware_complexity', e.target.value)} />
        </F>
      </Section>

      <Section id="dimensions" num={5} title="Dimensions & Quantities" isOpen={open.dimensions} onToggle={() => toggle('dimensions')}>
        <Grid>
          <F label="Floor SF">
            <NumericInput value={form.floor_sf ?? null} decimals={2}
              onChange={v => set('floor_sf', v)} placeholder="255,000.00" />
          </F>
          <F label="Siding SF">
            <NumericInput value={form.siding_sf ?? null} decimals={2}
              onChange={v => set('siding_sf', v)} placeholder="128,800.00" />
          </F>
        </Grid>
        <F label="Exterior Wall SF">
          <NumericInput value={form.exterior_wall_sf ?? null} decimals={2}
            onChange={v => set('exterior_wall_sf', v)} placeholder="0.00" />
        </F>
        <Grid cols={3}>
          <F label="Windows">
            <IntegerInput value={form.windows ?? null}
              onChange={v => set('windows', v)} placeholder="720" />
          </F>
          <F label="Patio Doors">
            <IntegerInput value={form.patio_doors ?? null}
              onChange={v => set('patio_doors', v)} placeholder="2" />
          </F>
          <F label="Entry Doors">
            <IntegerInput value={form.entry_doors ?? null}
              onChange={v => set('entry_doors', v)} placeholder="0" />
          </F>
        </Grid>
        <F label="Shaftwall LF Per Level">
          <NumericInput value={form.shaftwall_lf_per_level ?? null} decimals={2}
            onChange={v => set('shaftwall_lf_per_level', v)} placeholder="0.00" />
        </F>
        <Grid>
          <F label="Truss Depth (ft-in)">
            <input className="form-input" placeholder={`22"`}
              value={form.truss_depth ?? ''}
              onChange={e => set('truss_depth', e.target.value)} />
            <p className="text-[10px] text-slate-400 mt-1">e.g. 22&quot; or 1&apos;-10&quot;</p>
          </F>
          <F label="Truss Spacing (ft-in)">
            <input className="form-input" placeholder={`24"`}
              value={form.truss_spacing ?? ''}
              onChange={e => set('truss_spacing', e.target.value)} />
            <p className="text-[10px] text-slate-400 mt-1">e.g. 24&quot; or 2&apos;-0&quot;</p>
          </F>
        </Grid>
      </Section>

      <Section id="pricing" num={6} title="Financial Data" isOpen={open.pricing} onToggle={() => toggle('pricing')}>
        <div className="bg-orange-50 border border-orange-200 rounded px-4 py-3 text-xs text-orange-700 flex items-start gap-2">
          <Calculator className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Enter the four base amounts. All <strong>AUTO</strong> fields calculate using <strong>Floor SF</strong> from section 5.</span>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Manual Inputs</p>
          <Grid>
            <F label="Frame L, N, E Price ($)">
              <NumericInput value={form.frame_lne_price ?? null} decimals={2}
                onChange={v => set('frame_lne_price', v)} placeholder="1,822,980.00" />
            </F>
            <F label="Frame Material ($)">
              <NumericInput value={form.frame_material ?? null} decimals={2}
                onChange={v => set('frame_material', v)} placeholder="3,060,000.00" />
            </F>
          </Grid>
          <Grid cols={3}>
            <F label="Truss Price ($)">
              <NumericInput value={form.truss_price ?? null} decimals={2}
                onChange={v => set('truss_price', v)} placeholder="1,118,250.00" />
            </F>
            <F label="Siding L & M ($)">
              <NumericInput value={form.siding_lm ?? null} decimals={2}
                onChange={v => set('siding_lm', v)} placeholder="784,420.00" />
            </F>
            <F label="Change Orders ($)">
              <NumericInput value={form.change_orders ?? null} decimals={2}
                onChange={v => set('change_orders', v)} placeholder="-195,300.00" />
            </F>
          </Grid>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Auto-Calculated</p>
          <Grid>
            <CalcField label="Frame L, N, E Price / SF" value={calc.frame_lne_price_sf} />
            <CalcField label="Frame Material / SF"      value={calc.frame_material_sf} />
          </Grid>
          <Grid>
            <CalcField label="Truss / SF"               value={calc.truss_sf} />
            <CalcField label="Siding L & M / SF"        value={calc.siding_lm_sf} />
          </Grid>
          <Grid cols={3}>
            <CalcField label="Total Price / SF"          value={calc.total_price_sf} />
            <CalcField label="Total Contract Price ($)"  value={calc.total_contract_price} format="usd" />
            <CalcField label="Contract Price + CO's ($)" value={calc.contract_price_cos}   format="usd" />
          </Grid>
        </div>
      </Section>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary px-6">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : mode === 'create' ? 'Create Project' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
