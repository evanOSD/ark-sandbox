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

export async function updateProject(projectId: string, name: string, description: string, assignedUserIds: string[], templateId?: string) {
  const supabase = await createClient()

  if (!name) {
    throw new Error('Nama proyek wajib diisi')
  }

  // Update project details
  const updatePayload: Record<string, unknown> = {
    name,
    description: description || null,
  }

  if (templateId) {
    updatePayload.template_id = templateId
  }

  const { error: projectError } = await supabase
    .from('projects')
    .update(updatePayload)
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

export async function saveTranslationText(projectId: string, loopId: string, text: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Anda harus login terlebih dahulu')
  }

  // Cek apakah sudah ada rekaman untuk loop ini di project ini
  const { data: existingRec } = await supabase
    .from('recordings')
    .select('id')
    .eq('project_id', projectId)
    .eq('template_loop_id', loopId)
    .maybeSingle()

  if (existingRec) {
    // Update existing row
    const { error } = await supabase
      .from('recordings')
      .update({
        translated_text: text || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRec.id)

    if (error) throw new Error(error.message)
  } else {
    // Insert new row
    const { error } = await supabase.from('recordings').insert({
      project_id: projectId,
      template_loop_id: loopId,
      translated_text: text || null,
      recorded_by: user.id,
      status: 'pending',
    })

    if (error) throw new Error(error.message)
  }

  revalidatePath(`/projects/${projectId}`)
}

export async function getLoopWorkspaceData(projectId: string, sceneId: string, loopId: string) {
  const supabase = await createClient()

  // Fetch loop details belonging to this scene
  const { data: loop, error: loopError } = await supabase
    .from('template_loops')
    .select('id, name, sequence_number, start_time_ms, end_time_ms, script_text_1, script_text_2, script_text_3, script_text_4')
    .eq('id', loopId)
    .eq('scene_id', sceneId)
    .maybeSingle()

  if (loopError || !loop) {
    throw new Error(loopError?.message || 'Loop tidak ditemukan')
  }

  // Fetch key terms for this loop
  const { data: loopKeyTerms } = await supabase
    .from('loop_key_terms')
    .select('key_terms(id, term, original_word, meaning_or_note)')
    .eq('template_loop_id', loopId)

  interface DBKeyTerm {
    id: string;
    term: string;
    original_word: string | null;
    meaning_or_note: string | null;
  }

  interface DBLoopKeyTerm {
    key_terms: DBKeyTerm | null;
  }

  interface DBTranslation {
    key_term_id: string;
    id: string;
    translated_text: string | null;
    recorded_audio_url: string | null;
  }

  const rawLoopKeyTerms = (loopKeyTerms || []) as unknown as DBLoopKeyTerm[]
  const keyTermIds = rawLoopKeyTerms.map((lkt) => lkt.key_terms?.id).filter(Boolean) as string[]

  // Fetch existing translations for these key terms in this project
  let translations: DBTranslation[] = []
  if (keyTermIds.length > 0) {
    const { data: transData } = await supabase
      .from('project_key_term_translations')
      .select('key_term_id, id, translated_text, recorded_audio_url')
      .eq('project_id', projectId)
      .in('key_term_id', keyTermIds)
    translations = (transData || []) as unknown as DBTranslation[]
  }

  // Map key terms together with their translations
  const formattedKeyTerms = rawLoopKeyTerms
    .map((lkt) => {
      const term = lkt.key_terms
      if (!term) return null

      const trans = translations.find((t) => t.key_term_id === term.id)
      return {
        id: term.id,
        term: term.term,
        original_word: term.original_word,
        meaning_or_note: term.meaning_or_note,
        translation: trans
          ? {
              id: trans.id,
              translated_text: trans.translated_text,
              recorded_audio_url: trans.recorded_audio_url,
            }
          : null,
      }
    })
    .filter(Boolean)

  // Fetch existing main recording for this loop in this project
  const { data: recording } = await supabase
    .from('recordings')
    .select('recorded_audio_url, translated_text')
    .eq('project_id', projectId)
    .eq('template_loop_id', loopId)
    .maybeSingle()

  const formattedLoop = {
    id: loop.id,
    name: loop.name,
    sequence_number: loop.sequence_number,
    start_time_ms: loop.start_time_ms,
    end_time_ms: loop.end_time_ms,
    script_text_1: loop.script_text_1,
    script_text_2: loop.script_text_2,
    script_text_3: loop.script_text_3,
    script_text_4: loop.script_text_4,
    key_terms: formattedKeyTerms,
  }

  return {
    loop: formattedLoop,
    existingRecordingUrl: recording?.recorded_audio_url || null,
  }
}
