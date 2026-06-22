'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

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

// ─── Result Banner ────────────────────────────────────────────────────────────
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
        {result.errors.length ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
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

// ─── Download unified template ─────────────────────────────────────────────────
function downloadUnifiedTemplate() {
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Projects (matches DB1 column order) ──────────────────────────
  const projHeaders = [
    'Project Name', 'Bid Result', 'Year Completed', 'Date of Bid', 'IDAPAC Index',
    'Contract Type', 'Architect', 'Engineer', 'General Contractor', 'City', 'State',
    'Building Type', 'Style', 'Complexity', 'Wind Rating', 'IBC Code Year', 'Levels',
    'Wall Height', 'Stair Shaft', 'Stair Framing', 'Hardware Complexity', 'Clubhouse',
    'Floor SF', 'Siding SF', 'Windows', 'Patio Doors', 'Entry Doors',
    'Shaftwall LF/Level', 'Truss Depth', 'Truss Spacing',
    'Frame L,N,E Price', 'Frame Material', 'Truss Price', 'Siding L&M', 'Change Orders',
  ]
  const projExample = [
    'Classen Curve', 'Won', 2022, '05/15/2022', 700,
    'Turn-Key', 'Dwell Design Studio', 'm2 Structural', 'Willowbrook, Inc', 'Oklahoma City', 'OK',
    'Type III', 'Ground Wrap', 'Medium', 115, 2015, 5,
    "9'-1 1/8\"", 'Concrete', 'Steel', 'Hard', 'Yes',
    372000, 94328, 1360, 181, 0,
    0, '18"', '24"',
    2518950, 2343600, 1258098, 601818, 0,
  ]
  const ws1 = XLSX.utils.aoa_to_sheet([projHeaders, projExample])
  ws1['!cols'] = projHeaders.map(() => ({ wch: 22 }))
  // Style header row
  XLSX.utils.book_append_sheet(wb, ws1, 'Projects')

  // ── Sheet 2: Budget Items (matches Budgeted3 format) ─────────────────────
  const budgHeaders = ['Project Name', 'Description', 'Type', 'Price Per', 'Qty', 'Total']
  const budgExample = [
    ['Classen Curve', 'Floor and Roof Trusses',           'Material',        3.38,   372000, 1258098],
    ['Classen Curve', 'Timber Framing',                   'Material',        0,       0,      0      ],
    ['Classen Curve', 'Rough Frame',                      'Material',        6.3,    372000, 2343600],
    ['Classen Curve', 'Primed Hardie B&B',                'Material',        3.75,   0,      0      ],
    ['Classen Curve', 'Primed Hardie Lap',                'Material',        3.4,    0,      0      ],
    ['Classen Curve', 'Primed Hardie Trim Around Windows','Material',        1.65,   0,      0      ],
    ['Classen Curve', 'Primed Hardie - Trim on Balconies','Material',        5.3,    0,      0      ],
    ['Classen Curve', 'Rough Frame',                      'Labor',           5.7,    372000, 2120400],
    ['Classen Curve', 'Stairs',                           'Install',         2000,   12,     24000  ],
    ['Classen Curve', 'Window - Single',                  'Install',         85,     1360,   115600 ],
    ['Classen Curve', 'Patio doors w/Nail Fin',           'Install',         90,     181,    16290  ],
    ['Classen Curve', 'Entry Doors',                      'Install',         0,      0,      0      ],
    ['Classen Curve', 'Firewall',                         'Material',        45,     0,      0      ],
    ['Classen Curve', 'Firewalls',                        'Install',         35,     0,      0      ],
    ['Classen Curve', 'Hardie - Trim on Balconies',       'Install - Primed',6,      0,      0      ],
    ['Classen Curve', 'Hardie B&B Siding',                'Install - Primed',3.5,    0,      0      ],
    ['Classen Curve', 'Primed Hardie Lap',                'Install - Primed',3.05,   0,      0      ],
    ['Classen Curve', 'Hardie Board & Batten',            'Install - Primed',2.9,    0,      0      ],
    ['Classen Curve', 'Primed Hardie Trim Around Windows','Install',         1,      0,      0      ],
    ['Classen Curve', 'Siding Equipment - With Frame',    'Equip-Material',  0,      0,      0      ],
    ['Classen Curve', 'Frame Equipment',                  'Equipment',       0.376,  372000, 140000 ],
    ['Classen Curve', 'Bond',                             'Financial',       0,      0,      0      ],
    ['Classen Curve', 'Nail Charge for Rough Framing',    'Material',        0.25,   372000, 93000  ],
    ['Classen Curve', 'Nail Charge for Siding',           'Material',        0.1,    94328,  9432   ],
  ]
  const ws2 = XLSX.utils.aoa_to_sheet([budgHeaders, ...budgExample])
  ws2['!cols'] = [{ wch: 22 }, { wch: 48 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Budget Items')

  XLSX.writeFile(wb, 'construction_pm_template.xlsx')
}

// ─── Import unified file ───────────────────────────────────────────────────────
async function importUnified(file: File): Promise<ImportResult> {
  const data = await file.arrayBuffer()
  const wb   = XLSX.read(data, { type: 'array' })
  const result: ImportResult = { success: 0, errors: [] }

  // ── 1. Import Projects sheet ──────────────────────────────────────────────
  const projSheet = wb.Sheets['Projects']
  if (!projSheet) {
    result.errors.push('Missing sheet: "Projects"')
    return result
  }

  const projRows = XLSX.utils.sheet_to_json(projSheet) as Record<string, unknown>[]
  const projectMap: Record<string, string> = {}

  for (const row of projRows) {
    const name = safeStr(row['Project Name'])
    if (!name) { result.errors.push('Row skipped: missing Project Name'); continue }

    const fs   = safeNum(row['Floor SF'])   ?? 0
    const flne = safeNum(row['Frame L,N,E Price']) ?? 0
    const fm   = safeNum(row['Frame Material'])    ?? 0
    const tp   = safeNum(row['Truss Price'])       ?? 0
    const slm  = safeNum(row['Siding L&M'])        ?? 0
    const ssf  = safeNum(row['Siding SF'])         ?? 0
    const co   = safeNum(row['Change Orders'])     ?? 0

    const frame_lne_price_sf   = fs > 0 ? flne / fs : 0
    const frame_material_sf    = fs > 0 ? fm   / fs : 0
    const truss_sf             = fs > 0 ? tp   / fs : 0
    const siding_lm_sf         = fs > 0 ? slm  / fs : 0
    const total_price_sf       = frame_lne_price_sf + frame_material_sf + truss_sf + siding_lm_sf
    const total_contract_price = total_price_sf * fs
    const contract_price_cos   = total_contract_price + co
    const pct_siding_vs_floor  = fs > 0 ? ssf  / fs : 0

    const project = {
      project_name:           name,
      client_response:        safeStr(row['Bid Result']),
      year_completed:         safeInt(row['Year Completed']),
      date_of_bid:            safeDate(row['Date of Bid']),
      idapac_index:           safeNum(row['IDAPAC Index']),
      contract_type:          safeStr(row['Contract Type']),
      architect:              safeStr(row['Architect']),
      engineer:               safeStr(row['Engineer']),
      gc:                     safeStr(row['General Contractor']),
      city:                   safeStr(row['City']),
      state:                  safeStr(row['State']),
      building_type:          safeStr(row['Building Type']),
      style:                  safeStr(row['Style']),
      complexity:             safeStr(row['Complexity']),
      wind_rating:            safeNum(row['Wind Rating']),
      ibc_code_year:          safeInt(row['IBC Code Year']),
      levels:                 safeInt(row['Levels']),
      wall_height:            safeStr(row['Wall Height']),
      stair_shaft:            safeStr(row['Stair Shaft']),
      stair_framing:          safeStr(row['Stair Framing']),
      hardware_complexity:    safeStr(row['Hardware Complexity']),
      clubhouse:              String(row['Clubhouse'] ?? '').toLowerCase() === 'yes',
      floor_sf:               fs   || null,
      siding_sf:              ssf  || null,
      windows:                safeInt(row['Windows']),
      patio_doors:            safeInt(row['Patio Doors']),
      entry_doors:            safeInt(row['Entry Doors']),
      shaftwall_lf_per_level: safeNum(row['Shaftwall LF/Level']),
      truss_depth:            safeStr(row['Truss Depth']),
      truss_spacing:          safeStr(row['Truss Spacing']),
      frame_lne_price:        flne || null,
      frame_material:         fm   || null,
      truss_price:            tp   || null,
      siding_lm:              slm  || null,
      change_orders:          co   || null,
      frame_lne_price_sf,
      frame_material_sf,
      truss_sf,
      siding_lm_sf,
      total_price_sf,
      total_contract_price:   total_contract_price || null,
      contract_price_cos:     contract_price_cos   || null,
      pct_siding_vs_floor,
    }

    const { data: inserted, error } = await supabase
      .from('projects')
      .upsert(project, { onConflict: 'project_name', ignoreDuplicates: false })
      .select('id')

    if (error) {
      result.errors.push(`"${name}": ${error.message}`)
    } else {
      const pid = inserted?.[0]?.id
      if (pid) projectMap[name.toLowerCase().trim()] = pid
      result.success++
    }
  }

  // ── 2. Import Budget Items sheet ──────────────────────────────────────────
  const budgSheet = wb.Sheets['Budget Items']
  if (!budgSheet) return result   // budget sheet is optional

  const budgRows = XLSX.utils.sheet_to_json(budgSheet) as Record<string, unknown>[]

  // Group by project name
  const byProject: Record<string, typeof budgRows> = {}
  for (const row of budgRows) {
    const name = safeStr(row['Project Name'])
    if (!name) continue
    if (!byProject[name]) byProject[name] = []
    byProject[name].push(row)
  }

  for (const [name, rows] of Object.entries(byProject)) {
    const pid = projectMap[name.toLowerCase().trim()]
    if (!pid) {
      result.errors.push(`Budget Items: project not found — "${name}" (import it in the Projects sheet first)`)
      continue
    }

    // Delete existing items and re-insert
    await supabase.from('budget_items').delete().eq('project_id', pid)

    const items = rows.map((row, i) => ({
      project_id:  pid,
      description: safeStr(row['Description']),
      type:        safeStr(row['Type']),
      price_per:   safeNum(row['Price Per']),
      qty:         safeNum(row['Qty']),
      total:       safeNum(row['Total']),
      sort_order:  i,
    }))

    const { error } = await supabase.from('budget_items').insert(items)
    if (error) {
      result.errors.push(`"${name}" budget items: ${error.message}`)
    } else {
      result.success += items.length
    }
  }

  return result
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ImportPage() {
  const [status, setStatus]   = useState<Status>('idle')
  const [result, setResult]   = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setStatus('loading'); setResult(null)
    try {
      const res = await importUnified(file)
      setResult(res); setStatus('done')
    } catch (err) {
      setResult({ success: 0, errors: [String(err)] }); setStatus('error')
    }
    e.target.value = ''
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">Data Management</p>
        <h1 className="text-3xl font-black text-slate-900">Import / Export</h1>
        <p className="text-slate-500 text-sm mt-1">
          Download the template, fill it in, then import it back.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-5 py-4 text-sm text-slate-600 space-y-2">
        <p className="font-bold text-slate-800">How it works</p>
        <ol className="list-decimal list-inside space-y-1 text-slate-500">
          <li>Download the template below</li>
          <li>Fill in the <strong>Projects</strong> sheet with your project data</li>
          <li>Fill in the <strong>Budget Items</strong> sheet with the line items for each project</li>
          <li>Upload the completed file — projects and budgets import in one step</li>
        </ol>
        <p className="text-xs text-slate-400 pt-1">
          Both sheets are required. Project Name must match exactly between sheets.
          Existing projects update automatically; new ones are added.
        </p>
      </div>

      {/* Download template */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Download className="w-4 h-4 text-orange-500" /> Step 1 — Download Template
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            One file, two sheets: <strong>Projects</strong> + <strong>Budget Items</strong>
          </p>
        </div>
        <div className="p-6">
          <button
            onClick={downloadUnifiedTemplate}
            className="flex items-center gap-3 border-2 border-dashed border-slate-200 rounded-lg p-5 hover:border-orange-400 hover:bg-orange-50 transition-all group text-left w-full max-w-sm"
          >
            <FileSpreadsheet className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-800 group-hover:text-orange-600 text-sm">
                construction_pm_template.xlsx
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Sheets: Projects · Budget Items
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-4 h-4 text-orange-500" /> Step 2 — Import File
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload your completed template — projects and budget items import together
          </p>
        </div>
        <div className="p-6">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={status === 'loading'}
            className="btn-primary"
          >
            <Upload className="w-4 h-4" />
            {status === 'loading' ? 'Importing…' : 'Choose File to Import'}
          </button>
          <ResultBanner result={result} status={status} />
        </div>
      </div>

      {/* Columns reference */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-800">Column Reference</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div>
            <p className="font-bold text-slate-700 mb-2">Projects sheet</p>
            <ul className="space-y-1 text-slate-500">
              {[
                'Project Name *','Bid Result (Won / Lost)','Year Completed','Date of Bid',
                'IDAPAC Index','Contract Type','Architect','Engineer','General Contractor',
                'City','State','Building Type','Style','Complexity','Wind Rating',
                'IBC Code Year','Levels','Wall Height','Stair Shaft','Stair Framing',
                'Hardware Complexity','Clubhouse (Yes / No)',
                'Floor SF','Siding SF','Windows','Patio Doors','Entry Doors',
                'Shaftwall LF/Level','Truss Depth','Truss Spacing',
                'Frame L,N,E Price','Frame Material','Truss Price','Siding L&M','Change Orders',
              ].map(c => <li key={c} className={c.includes('*') ? 'font-semibold text-slate-700' : ''}>• {c}</li>)}
            </ul>
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-2">Budget Items sheet</p>
            <ul className="space-y-1 text-slate-500">
              {[
                'Project Name *  (must match Projects sheet)',
                'Description *',
                'Type  (Material / Labor / Install / Install - Primed / Equip-Material / Equipment / Financial)',
                'Price Per',
                'Qty',
                'Total',
              ].map(c => <li key={c} className={c.includes('*') ? 'font-semibold text-slate-700' : ''}>• {c}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
