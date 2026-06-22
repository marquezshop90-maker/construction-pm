import { createClient } from '@supabase/supabase-js'
import type { Project, ProjectInsert, ProjectUpdate } from './types'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects').select('*').order('date_of_bid', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createProject(project: ProjectInsert): Promise<Project> {
  const { data, error } = await supabase
    .from('projects').insert(project).select().single()
  if (error) throw error
  return data
}

export async function updateProject(id: string, project: ProjectUpdate): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...project, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}
