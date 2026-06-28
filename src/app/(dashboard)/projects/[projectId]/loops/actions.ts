'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import crypto from 'crypto'

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

  const audioUrlParam = formData.get('audio_url') as string | null
  const audioFile = formData.get('audio') as File | null

  let audioUrl = ''
  if (audioUrlParam) {
    audioUrl = audioUrlParam
  } else if (audioFile && audioFile.size > 0) {
    audioUrl = await saveAudioFileLocally(audioFile, `loop-${loopId}`)
  } else {
    throw new Error('File audio atau URL tidak ditemukan')
  }

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

export async function saveBackTranslationRecording(projectId: string, loopId: string, audioUrl: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Anda harus login terlebih dahulu')
  }

  const { data: existingRec } = await supabase
    .from('recordings')
    .select('id')
    .eq('project_id', projectId)
    .eq('template_loop_id', loopId)
    .maybeSingle()

  if (existingRec) {
    const { error } = await supabase
      .from('recordings')
      .update({
        back_translation_audio_url: audioUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRec.id)

    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('recordings').insert({
      project_id: projectId,
      template_loop_id: loopId,
      back_translation_audio_url: audioUrl,
      status: 'pending',
      recorded_by: user.id,
    })

    if (error) throw new Error(error.message)
  }

  const { data: loopData } = await supabase
    .from("template_loops")
    .select("scene_id")
    .eq("id", loopId)
    .maybeSingle();

  revalidatePath(`/projects/${projectId}`)
  if (loopData?.scene_id) {
    revalidatePath(`/projects/${projectId}/scenes/${loopData.scene_id}/loops/${loopId}`)
  }
}

export async function getCloudinaryUploadParams(projectId: string, loopId: string) {
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  if (!project) throw new Error('Proyek tidak ditemukan')

  const { data: loop } = await supabase
    .from('template_loops')
    .select('name, scene_id')
    .eq('id', loopId)
    .single()

  if (!loop) throw new Error('Loop tidak ditemukan')

  const { data: scene } = await supabase
    .from('template_scenes')
    .select('name')
    .eq('id', loop.scene_id)
    .single()

  if (!scene) throw new Error('Scene tidak ditemukan')

  const sanitize = (part: string) => {
    return part.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
  }

  const cleanProjectName = sanitize(project.name)
  const cleanSceneName = sanitize(scene.name)
  const cleanLoopName = sanitize(loop.name)

  const { data: recordings } = await supabase
    .from('recordings')
    .select('back_translation_audio_url')
    .eq('project_id', projectId)
    .not('back_translation_audio_url', 'is', null)

  const prefix = `bt-${cleanProjectName}-${cleanSceneName}-${cleanLoopName}-`
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
  const regex = new RegExp(`${escapeRegExp(prefix)}(\\d{4})`, 'i')

  let maxIndex = 0
  if (recordings) {
    for (const rec of recordings) {
      const url = rec.back_translation_audio_url
      if (!url) continue
      const match = url.match(regex)
      if (match) {
        const index = parseInt(match[1], 10)
        if (index > maxIndex) {
          maxIndex = index
        }
      }
    }
  }

  const nextIndex = maxIndex + 1
  const nextIndexStr = String(nextIndex).padStart(4, '0')
  const publicId = `${prefix}${nextIndexStr}`

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || ''
  const apiKey = process.env.CLOUDINARY_API_KEY || ''
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'
  const apiSecret = process.env.CLOUDINARY_API_SECRET || ''

  const timestamp = Math.round(new Date().getTime() / 1000)

  const paramsToSign = {
    timestamp,
    upload_preset: uploadPreset,
    public_id: publicId,
  }

  const sortedKeys = Object.keys(paramsToSign).sort()
  const paramString = sortedKeys
    .map((key) => `${key}=${paramsToSign[key as keyof typeof paramsToSign]}`)
    .join('&')

  const stringToSign = `${paramString}${apiSecret}`
  const signature = crypto.createHash('sha1').update(stringToSign).digest('hex')

  return {
    cloudName,
    apiKey,
    uploadPreset,
    publicId,
    timestamp,
    signature,
  }
}
