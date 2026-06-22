import { createSupabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Project } from '@/lib/types'
import DeleteButton from '@/components/DeleteButton'
import { Edit } from 'lucide-react'

const fmtUSD = (n: number | null) =>
  n ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
const fmtNum = (n: number | null) =>
  (n !== null && n !== undefined) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
const fmtInt = (n: number | null) =>
  (n !== null && n !== undefined) ? Math.round(n).toLocaleString('en-US') : '—'
const fmtSF = (n: number | null) =>
  n ? `$${n.toFixed(4)}/SF` : '—'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right">{value ?? '—'}</span>
    </div>
  )
}

function Card({ title, children, accent = false }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-5 py-3 border-b border-slate-200 ${accent ? 'bg-orange-500' : 'bg-slate-50'}`}>
        <h2 className={`text-xs font-bold uppercase tracking-widest ${accent ? 'text-white' : 'text-slate-500'}`}>{title}</h2>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  )
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServer()
  const { data: p } = await supabase.from('projects').select('*').eq('id', id).single()

  if (!p) notFound()

  const project = p as Project

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-500 mb-3 transition-colors">
          ← All Projects
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-black text-slate-900">{project.project_name}</h1>
              {project.client_response === 'Won'  && <span className="badge-won text-sm">Won</span>}
              {project.client_response === 'Lost' && <span className="badge-lost text-sm">Lost</span>}
              {(!project.client_response || project.client_response === 'Pending') && <span className="badge-pending text-sm">Pending</span>}
            </div>
            <p className="text-slate-400 text-sm mt-1">
              {[project.city, project.state].filter(Boolean).join(', ')}
              {project.gc && ` · ${project.gc}`}
              {project.date_of_bid && ` · Bid: ${new Date(project.date_of_bid + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href={`/projects/${id}/edit`} className="btn-secondary text-xs">
              <Edit className="w-3.5 h-3.5" /> Edit
            </Link>
            <DeleteButton id={id} name={project.project_name} />
          </div>
        </div>
      </div>

      {/* Key metrics banner */}
      {(project.total_contract_price || project.total_price_sf || project.floor_sf) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Contract',  value: fmtUSD(project.total_contract_price) },
            { label: "Contract + CO's", value: fmtUSD(project.contract_price_cos) },
            { label: 'Price / SF',      value: project.total_price_sf ? `$${project.total_price_sf.toFixed(4)}` : '—' },
            { label: 'Floor SF',        value: project.floor_sf ? project.floor_sf.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-900 rounded-lg p-4 text-center">
              <p className="text-lg font-black text-orange-400">{value}</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Project Identification">
          <Row label="Year Completed" value={project.year_completed} />
          <Row label="Date of Bid" value={project.date_of_bid ? new Date(project.date_of_bid + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null} />
          <Row label="IDAPAC Index" value={project.idapac_index?.toLocaleString('en-US')} />
          <Row label="Contract Type" value={project.contract_type} />
        </Card>
        <Card title="Project Team">
          <Row label="Architect" value={project.architect} />
          <Row label="Engineer" value={project.engineer} />
          <Row label="General Contractor" value={project.gc} />
        </Card>
        <Card title="Building Specifications">
          <Row label="Building Type" value={project.building_type} />
          <Row label="Style" value={project.style} />
          <Row label="Complexity" value={project.complexity} />
          <Row label="Wind Rating" value={project.wind_rating} />
          <Row label="IBC Code Year" value={project.ibc_code_year} />
          <Row label="Levels" value={project.levels} />
          <Row label="Wall Height" value={project.wall_height} />
          <Row label="Stair Shaft" value={project.stair_shaft} />
          <Row label="Stair Framing" value={project.stair_framing} />
          <Row label="Hardware Complexity" value={project.hardware_complexity} />
          <Row label="Clubhouse" value={project.clubhouse ? 'Yes' : 'No'} />
        </Card>
        <Card title="Dimensions & Quantities">
          <Row label="Floor SF"            value={fmtNum(project.floor_sf)} />
          <Row label="Siding SF"           value={fmtNum(project.siding_sf)} />
          <Row label="% Siding / Floor"    value={project.pct_siding_vs_floor ? `${(project.pct_siding_vs_floor * 100).toFixed(2)}%` : null} />
          <Row label="Exterior Wall SF"    value={fmtNum(project.exterior_wall_sf)} />
          <Row label="Windows"             value={fmtInt(project.windows)} />
          <Row label="Patio Doors"         value={fmtInt(project.patio_doors)} />
          <Row label="Entry Doors"         value={fmtInt(project.entry_doors)} />
          <Row label="Shaftwall LF/Level"  value={fmtNum(project.shaftwall_lf_per_level)} />
          <Row label="Truss Depth"         value={project.truss_depth} />
          <Row label="Truss Spacing"       value={project.truss_spacing} />
        </Card>
        <Card title="Financial · Manual Inputs" accent>
          <Row label="Frame L, N, E Price" value={fmtUSD(project.frame_lne_price)} />
          <Row label="Frame Material"      value={fmtUSD(project.frame_material)} />
          <Row label="Truss Price"         value={fmtUSD(project.truss_price)} />
          <Row label="Siding L & M"        value={fmtUSD(project.siding_lm)} />
          <Row label="Change Orders"       value={fmtUSD(project.change_orders)} />
        </Card>
        <Card title="Financial · Calculated">
          <Row label="Frame L,N,E / SF"    value={fmtSF(project.frame_lne_price_sf)} />
          <Row label="Frame Material / SF" value={fmtSF(project.frame_material_sf)} />
          <Row label="Truss / SF"          value={fmtSF(project.truss_sf)} />
          <Row label="Siding L&M / SF"     value={fmtSF(project.siding_lm_sf)} />
          <Row label="Total Price / SF"    value={fmtSF(project.total_price_sf)} />
          <Row label="Total Contract"      value={fmtUSD(project.total_contract_price)} />
          <Row label="Contract + CO's"     value={fmtUSD(project.contract_price_cos)} />
        </Card>
      </div>
    </div>
  )
}
