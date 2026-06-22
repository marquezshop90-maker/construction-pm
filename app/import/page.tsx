'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────
type ImportResult = { success: number; errors: string[] }
type Status = 'idle' | 'loading' | 'done' | 'error'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeNum  = (v: unknown) => { const n = parseFloat(String(v ?? '')); return isNaN(n) ? null : n }
const safeInt  = (v: unknown) => { const n = parseInt(String(v ?? ''), 10); return isNaN(n) ? null : n }
const safeStr  = (v: unknown) => { const s = String(v ?? '').trim(); return s && s !== 'undefined' && s !== 'null' ? s : null }
const safeDate = (v: unknown) => {
  if (!v) return null
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (!d) return null
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }
  const s = String(v).trim()
  if (!s) return null
  try { return new Date(s).toISOString().split('T')[0] } catch { return null }
}

// ─── ResultBanner ─────────────────────────────────────────────────────────────
function ResultBanner({ result, status }: { result: ImportResult | null; status: Status }) {
  if (status === 'idle') return null
  if (status === 'loading') return (
    <div className="flex items-center gap-2 text-sm text-slate-500 mt-3">
      <Loader2 className="w-4 h-4 animate-spin" /> Processing…
    </div>
  )
  if (!result) return null
  return (
    <div className={`mt-3 rounded-lg px-4 py-3 text-sm ${result.errors.length ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
      <p className={`font-bold flex items-center gap-2 ${result.errors.length ? 'text-amber-700' : 'text-green-700'}`}>
        {result.errors.length
          ? <XCircle className="w-4 h-4" />
          : <CheckCircle2 className="w-4 h-4" />}
        {result.success} record{result.success !== 1 ? 's' : ''} imported successfully
      </p>
      {result.errors.length > 0 && (
        <ul className="mt-2 space-y-1 text-amber-600 text-xs max-h-32 overflow-y-auto">
          {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
        </ul>
      )}
    </div>
  )
}

// ─── Download templates ────────────────────────────────────────────────────────
function downloadProjectsTemplate() {
  const headers = [
    'Project Name','Bid Result','Year Completed','Date of Bid','IDAPAC Index',
    'Contract Type','Architect','Engineer','General Contractor','City','State',
    'Building Type','Style','Complexity','Wind Rating','IBC Code Year','Levels',
    'Wall Height','Stair Shaft','Stair Framing','Hardware Complexity','Clubhouse',
    'Entry Doors','Truss Depth','Truss Spacing',
  ]
  const example = [
    'Classen Curve','Won',2022,'05/15/2022',700,'Turn-Key','Dwell Design Studio',
    'm2 Structural','Willowbrook, Inc','Oklahoma','OK','Type III','Ground Wrap',
    'Medium',115,2015,5,"9'-1 1/8\"",'Concrete','Steel','Hard','Yes',0,"18\"","24\"",
  ]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  ws['!cols'] = headers.map(() => ({ wch: 22 }))
  XLSX.utils.book_append_sheet(wb, ws, 'Projects')
  XLSX.writeFile(wb, 'projects_template.xlsx')
}

function downloadBudgetsTemplate() {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Line Items
  const liHeaders = ['Project Name','Description','Type','Price Per','Qty','Total']
  const liExample = [
    ['Classen Curve','Floor and Roof Trusses','Material',3.38,372000,1258098],
    ['Classen Curve','Rough Frame','Material',6.3,372000,2343600],
    ['Classen Curve','Rough Frame','Labor',5.7,372000,2120400],
    ['Classen Curve','Window - Single','Install',85,1360,115600],
    ['Classen Curve','Patio doors w/Nail Fin','Install',90,181,16290],
    ['Classen Curve','Firewalls','Install',0,0,0],
    ['Classen Curve','Hardie Variable Lap Siding','Install - Primed',3,63713,191139],
    ['Classen Curve','Frame Equipment','Equipment',0.376,372000,140000],
    ['Classen Curve','Nail Charge for Rough Framing','Material',0.25,372000,93000],
    ['Classen Curve','Nail Charge for Siding','Material',0.1,94328,9432],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet([liHeaders, ...liExample])
  ws1['!cols'] = [{ wch: 22 },{ wch: 40 },{ wch: 18 },{ wch: 12 },{ wch: 12 },{ wch: 14 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Line Items')

  // Sheet 2: Summary
  const sumHeaders = [
    'Project Name','Floor SF','Siding SF','Windows','Patio Doors',
    'Shaftwall LF Per Level','Frame L,N,E Price','Frame Material',
    'Truss Price','Siding L&M',
  ]
  const sumExample = ['Classen Curve',372000,94328,1360,181,0,2518950,2343600,1258098,601818]
  const ws2 = XLSX.utils.aoa_to_sheet([sumHeaders, sumExample])
  ws2['!cols'] = sumHeaders.map(() => ({ wch: 22 }))
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary')

  XLSX.writeFile(wb, 'budgets_template.xlsx')
}

// ─── Import logic ─────────────────────────────────────────────────────────────
async function importProjects(file: File): Promise<ImportResult> {
  const data = await file.arrayBuffer()
  const wb   = XLSX.read(data, { type: 'array' })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]

  const result: ImportResult = { success: 0, errors: [] }

  for (const row of rows) {
    const name = safeStr(row['Project Name'])
    if (!name) { result.errors.push('Row skipped: missing Project Name'); continue }

    const project = {
      project_name:        name,
      client_response:     safeStr(row['Bid Result']),
      year_completed:      safeInt(row['Year Completed']),
      date_of_bid:         safeDate(row['Date of Bid']),
      idapac_index:        safeNum(row['IDAPAC Index']),
      contract_type:       safeStr(row['Contract Type']),
      architect:           safeStr(row['Architect']),
      engineer:            safeStr(row['Engineer']),
      gc:                  safeStr(row['General Contractor']),
      city:                safeStr(row['City']),
      state:               safeStr(row['State']),
      building_type:       safeStr(row['Building Type']),
      style:               safeStr(row['Style']),
      complexity:          safeStr(row['Complexity']),
      wind_rating:         safeNum(row['Wind Rating']),
      ibc_code_year:       safeInt(row['IBC Code Year']),
      levels:              safeInt(row['Levels']),
      wall_height:         safeStr(row['Wall Height']),
      stair_shaft:         safeStr(row['Stair Shaft']),
      stair_framing:       safeStr(row['Stair Framing']),
      hardware_complexity: safeStr(row['Hardware Complexity']),
      clubhouse:           String(row['Clubhouse'] ?? '').toLowerCase() === 'yes',
      entry_doors:         safeInt(row['Entry Doors']),
      truss_depth:         safeStr(row['Truss Depth']),
      truss_spacing:       safeStr(row['Truss Spacing']),
    }

    const { error } = await supabase.from('projects').upsert(project, {
      onConflict: 'project_name', ignoreDuplicates: false
    })
    if (error) result.errors.push(`"${name}": ${error.message}`)
    else result.success++
  }
  return result
}

async function importBudgets(file: File): Promise<ImportResult> {
  const data = await file.arrayBuffer()
  const wb   = XLSX.read(data, { type: 'array' })

  const result: ImportResult = { success: 0, errors: [] }

  // Fetch all projects to match names → ids
  const { data: projects } = await supabase.from('projects').select('id, project_name')
  const projectMap: Record<string, string> = {}
  projects?.forEach(p => { projectMap[p.project_name.toLowerCase().trim()] = p.id })

  // Sheet 2: Summary → update project fields
  if (wb.SheetNames.includes('Summary')) {
    const ws   = wb.Sheets['Summary']
    const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
    for (const row of rows) {
      const name = safeStr(row['Project Name'])
      if (!name) continue
      const pid = projectMap[name.toLowerCase().trim()]
      if (!pid) { result.errors.push(`Summary: project not found — "${name}"`); continue }

      const fs   = safeNum(row['Floor SF']) ?? 0
      const flne = safeNum(row['Frame L,N,E Price']) ?? 0
      const fm   = safeNum(row['Frame Material']) ?? 0
      const tp   = safeNum(row['Truss Price']) ?? 0
      const slm  = safeNum(row['Siding L&M']) ?? 0
      const ssf  = safeNum(row['Siding SF']) ?? 0

      const frame_lne_price_sf  = fs > 0 ? flne / fs : 0
      const frame_material_sf   = fs > 0 ? fm / fs   : 0
      const truss_sf            = fs > 0 ? tp / fs   : 0
      const siding_lm_sf        = fs > 0 ? slm / fs  : 0
      const total_price_sf      = frame_lne_price_sf + frame_material_sf + truss_sf + siding_lm_sf
      const total_contract_price = total_price_sf * fs
      const pct_siding_vs_floor  = fs > 0 ? ssf / fs : 0

      await supabase.from('projects').update({
        floor_sf: fs, siding_sf: ssf,
        windows:          safeInt(row['Windows']),
        patio_doors:      safeInt(row['Patio Doors']),
        shaftwall_lf_per_level: safeNum(row['Shaftwall LF Per Level']),
        frame_lne_price: flne, frame_material: fm, truss_price: tp, siding_lm: slm,
        frame_lne_price_sf, frame_material_sf, truss_sf, siding_lm_sf,
        total_price_sf, total_contract_price, pct_siding_vs_floor,
      }).eq('id', pid)
    }
  }

  // Sheet 1: Line Items → insert budget_items
  if (wb.SheetNames.includes('Line Items')) {
    const ws   = wb.Sheets['Line Items']
    const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]

    // Group by project
    const byProject: Record<string, typeof rows> = {}
    rows.forEach(row => {
      const name = safeStr(row['Project Name'])
      if (!name) return
      if (!byProject[name]) byProject[name] = []
      byProject[name].push(row)
    })

    for (const [name, prows] of Object.entries(byProject)) {
      const pid = projectMap[name.toLowerCase().trim()]
      if (!pid) { result.errors.push(`Line Items: project not found — "${name}"`); continue }

      // Delete existing items for this project
      await supabase.from('budget_items').delete().eq('project_id', pid)

      const items = prows.map((row, i) => ({
        project_id:  pid,
        description: safeStr(row['Description']),
        type:        safeStr(row['Type']),
        price_per:   safeNum(row['Price Per']),
        qty:         safeNum(row['Qty']),
        total:       safeNum(row['Total']),
        sort_order:  i,
      }))

      const { error } = await supabase.from('budget_items').insert(items)
      if (error) result.errors.push(`"${name}" line items: ${error.message}`)
      else result.success += items.length
    }
  }

  return result
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ImportPage() {
  const [projStatus, setProjStatus] = useState<Status>('idle')
  const [budgStatus, setBudgStatus] = useState<Status>('idle')
  const [projResult, setProjResult] = useState<ImportResult | null>(null)
  const [budgResult, setBudgResult] = useState<ImportResult | null>(null)
  const projRef = useRef<HTMLInputElement>(null)
  const budgRef = useRef<HTMLInputElement>(null)

  async function handleProjects(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setProjStatus('loading'); setProjResult(null)
    try {
      const result = await importProjects(file)
      setProjResult(result); setProjStatus('done')
    } catch (err) {
      setProjResult({ success: 0, errors: [String(err)] }); setProjStatus('error')
    }
    e.target.value = ''
  }

  async function handleBudgets(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBudgStatus('loading'); setBudgResult(null)
    try {
      const result = await importBudgets(file)
      setBudgResult(result); setBudgStatus('done')
    } catch (err) {
      setBudgResult({ success: 0, errors: [String(err)] }); setBudgStatus('error')
    }
    e.target.value = ''
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">Data Management</p>
        <h1 className="text-3xl font-black text-slate-900">Import / Export</h1>
        <p className="text-slate-500 text-sm mt-1">Download templates, fill them in, then import back.</p>
      </div>

      {/* Download templates */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Download className="w-4 h-4 text-orange-500" /> Download Templates
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Use these files to enter data — they have the exact columns required for import</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={downloadProjectsTemplate}
            className="flex items-center gap-3 border-2 border-dashed border-slate-200 rounded-lg p-5 hover:border-orange-400 hover:bg-orange-50 transition-all group text-left">
            <FileSpreadsheet className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-800 group-hover:text-orange-600 text-sm">Projects Template</p>
              <p className="text-xs text-slate-400 mt-0.5">projects_template.xlsx</p>
            </div>
          </button>
          <button onClick={downloadBudgetsTemplate}
            className="flex items-center gap-3 border-2 border-dashed border-slate-200 rounded-lg p-5 hover:border-orange-400 hover:bg-orange-50 transition-all group text-left">
            <FileSpreadsheet className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-800 group-hover:text-orange-600 text-sm">Budgets Template</p>
              <p className="text-xs text-slate-400 mt-0.5">budgets_template.xlsx — 2 sheets: Line Items + Summary</p>
            </div>
          </button>
        </div>
      </div>

      {/* Import Projects */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-4 h-4 text-orange-500" /> Import Projects
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Upload a filled-in projects_template.xlsx — existing projects update, new ones are added</p>
        </div>
        <div className="p-6">
          <input ref={projRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleProjects} />
          <button onClick={() => projRef.current?.click()} disabled={projStatus === 'loading'}
            className="btn-primary">
            <Upload className="w-4 h-4" />
            {projStatus === 'loading' ? 'Importing…' : 'Choose Projects File'}
          </button>
          <ResultBanner result={projResult} status={projStatus} />
        </div>
      </div>

      {/* Import Budgets */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-4 h-4 text-orange-500" /> Import Budgets
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload a filled-in budgets_template.xlsx — updates project financial fields + loads all line items.<br />
            <strong>Projects must exist first</strong> (import them above, or create them manually).
          </p>
        </div>
        <div className="p-6">
          <input ref={budgRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBudgets} />
          <button onClick={() => budgRef.current?.click()} disabled={budgStatus === 'loading'}
            className="btn-primary">
            <Upload className="w-4 h-4" />
            {budgStatus === 'loading' ? 'Importing…' : 'Choose Budgets File'}
          </button>
          <ResultBanner result={budgResult} status={budgStatus} />
        </div>
      </div>

      {/* Notes */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 text-xs text-amber-700 space-y-1">
        <p className="font-bold">⚠️ To import your existing Excel file (one-time)</p>
        <p>Run the Python script from your terminal — it reads your original Budgeted3 sheet directly:</p>
        <code className="block bg-amber-100 rounded px-3 py-2 mt-1 font-mono">
          python scripts/import_excel.py &quot;path\to\your\file.xlsm&quot;
        </code>
      </div>
    </div>
  )
}
