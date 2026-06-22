'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Helper untuk menyimpan file audio lokal ke public/uploads
async function saveAudioFileLocally(file: File, prefix: string): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const publicDir = join(process.cwd(), 'public')
  const uploadsDir = join(publicDir, 'uploads')

  // Buat folder public/uploads jika belum ada
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }

  const filename = `${prefix}-${Date.now()}.wav`
  const filepath = join(uploadsDir, filename)

  await writeFile(filepath, buffer)
  return `/uploads/${filename}`
}

export async function saveRecording(projectId: string, loopId: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Anda harus login terlebih dahulu')
  }

  const audioFile = formData.get('audio') as File
  if (!audioFile) {
    throw new Error('File audio tidak ditemukan')
  }

  // 1. Simpan file audio secara lokal
  const audioUrl = await saveAudioFileLocally(audioFile, `loop-${loopId}`)

  // 2. Cek apakah sudah ada rekaman untuk loop ini di project ini
  const { data: existingRec } = await supabase
    .from('recordings')
    .select('id')
    .eq('project_id', projectId)
    .eq('template_loop_id', loopId)
    .maybeSingle()

  if (existingRec) {
    // Update existing recording
    const { error } = await supabase
      .from('recordings')
      .update({
        recorded_audio_url: audioUrl,
        recorded_by: user.id,
        status: 'recorded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRec.id)

    if (error) throw new Error(error.message)
  } else {
    // Insert new recording
    const { error } = await supabase.from('recordings').insert({
      project_id: projectId,
      template_loop_id: loopId,
      recorded_audio_url: audioUrl,
      recorded_by: user.id,
      status: 'recorded',
    })

    if (error) throw new Error(error.message)
  }

  // Fetch loop data to retrieve scene ID for proper revalidation
  const { data: loopData } = await supabase
    .from("template_loops")
    .select("scene_id")
    .eq("id", loopId)
    .maybeSingle();

  revalidatePath(`/projects/${projectId}`);
  if (loopData?.scene_id) {
    revalidatePath(`/projects/${projectId}/scenes/${loopData.scene_id}/loops/${loopId}`);
  }
}

export async function saveKeyTermTranslation(
  projectId: string,
  keyTermId: string,
  translatedText: string,
  audioFile: File | null
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Anda harus login terlebih dahulu')
  }

  let audioUrl: string | null = null
  if (audioFile) {
    audioUrl = await saveAudioFileLocally(audioFile, `term-${keyTermId}`)
  }

  // Cek apakah sudah ada terjemahan key term untuk project ini
  const { data: existingTrans } = await supabase
    .from('project_key_term_translations')
    .select('id, recorded_audio_url')
    .eq('project_id', projectId)
    .eq('key_term_id', keyTermId)
    .maybeSingle()

  const updateData: Record<string, string | null> = {
    translated_text: translatedText || null,
    recorded_by: user.id,
    updated_at: new Date().toISOString(),
  }

  if (audioUrl) {
    updateData.recorded_audio_url = audioUrl
  }

  if (existingTrans) {
    const { error } = await supabase
      .from('project_key_term_translations')
      .update(updateData)
      .eq('id', existingTrans.id)

    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('project_key_term_translations').insert({
      project_id: projectId,
      key_term_id: keyTermId,
      translated_text: translatedText || null,
      recorded_audio_url: audioUrl || null,
      recorded_by: user.id,
    })

    if (error) throw new Error(error.message)
  }

  revalidatePath(`/projects/${projectId}/loops`)
}
