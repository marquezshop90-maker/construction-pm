import ProjectForm from '@/components/ProjectForm'

export default function NewProjectPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">New Entry</p>
        <h1 className="text-3xl font-black text-slate-900">New Project</h1>
        <p className="text-slate-500 text-sm mt-1">Enter the details for a new project or bid</p>
      </div>
      <ProjectForm mode="create" />
    </div>
  )
}
