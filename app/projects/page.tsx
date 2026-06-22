import { createSupabaseServer } from '@/lib/supabase-server'
import ProjectsTable from '@/components/ProjectsTable'

export default async function ProjectsPage() {
  const supabase = await createSupabaseServer()
  const { data: projects = [] } = await supabase
    .from('projects').select('*').order('date_of_bid', { ascending: false })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">Database</p>
          <h1 className="text-3xl font-black text-slate-900">Projects</h1>
        </div>
      </div>
      <ProjectsTable initialProjects={projects} />
    </div>
  )
}
