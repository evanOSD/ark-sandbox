'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function updateRecordingStatus(projectId: string, recordingId: string, status: 'pending' | 'recorded' | 'approved') {
  const supabase = await createClient()

  const { error } = await supabase
    .from('recordings')
    .update({ status })
    .eq('id', recordingId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/projects/${projectId}`)
}

export async function deleteRecording(projectId: string, recordingId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('recordings')
    .delete()
    .eq('id', recordingId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/projects/${projectId}`)
}

export async function updateProject(projectId: string, name: string, description: string, assignedUserIds: string[]) {
  const supabase = await createClient()

  if (!name) {
    throw new Error('Nama proyek wajib diisi')
  }

  // Update project details
  const { error: projectError } = await supabase
    .from('projects')
    .update({
      name,
      description: description || null,
    })
    .eq('id', projectId)

  if (projectError) {
    throw new Error(projectError.message)
  }

  // Delete current assignments
  const { error: deleteError } = await supabase
    .from('project_assignments')
    .delete()
    .eq('project_id', projectId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  // Insert new assignments
  if (assignedUserIds && assignedUserIds.length > 0) {
    const assignments = assignedUserIds.map((userId) => ({
      project_id: projectId,
      user_id: userId,
    }))

    const { error: assignError } = await supabase
      .from('project_assignments')
      .insert(assignments)

    if (assignError) {
      throw new Error(assignError.message)
    }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')
}
