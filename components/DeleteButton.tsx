'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProject } from '@/lib/supabase'
import { Trash2 } from 'lucide-react'

export default function DeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return
    setDeleting(true)
    await deleteProject(id)
    router.push('/projects')
  }

  return (
    <button onClick={handleDelete} disabled={deleting} className="btn-danger text-xs">
      <Trash2 className="w-3.5 h-3.5" />
      {deleting ? 'Deleting…' : 'Delete'}
    </button>
  )
}
