import { createSupabaseServer } from '@/lib/supabase-server'
import BudgetsView from '@/components/BudgetsView'

export default async function BudgetsPage() {
  let projects: { id: string; project_name: string }[] = []
  try {
    const supabase = await createSupabaseServer()
    const { data } = await supabase
      .from('projects')
      .select('id, project_name')
      .order('project_name')
    if (data) projects = data
  } catch (e) {
    console.error(e)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">Cost Database</p>
        <h1 className="text-3xl font-black text-slate-900">Budgets</h1>
      </div>
      <BudgetsView projects={projects} />
    </div>
  )
}
