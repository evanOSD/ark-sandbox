'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function createProject(name: string, description: string, templateId: string, assignedUserIds: string[]) {
  const supabase = await createClient()

  if (!name || !templateId) {
    throw new Error('Nama proyek dan template wajib diisi')
  }

  // Insert project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name,
      description: description || null,
      template_id: templateId,
    })
    .select()
    .single()

  if (projectError) {
    throw new Error(projectError.message)
  }

  // Insert assignments
  if (assignedUserIds && assignedUserIds.length > 0) {
    const assignments = assignedUserIds.map((userId) => ({
      project_id: project.id,
      user_id: userId,
    }))

    const { error: assignError } = await supabase.from('project_assignments').insert(assignments)
    if (assignError) {
      throw new Error(assignError.message)
    }
  }

  revalidatePath('/projects')
}

export async function deleteProject(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/projects')
}
