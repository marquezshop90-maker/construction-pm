import { createSupabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ProjectForm from '@/components/ProjectForm'

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServer()
  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()

  if (!project) notFound()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href={`/projects/${id}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-500 mb-3 transition-colors">
          ← Back to project
        </Link>
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">Editing</p>
        <h1 className="text-3xl font-black text-slate-900">{project.project_name}</h1>
      </div>
      <ProjectForm project={project} mode="edit" />
    </div>
  )
}
