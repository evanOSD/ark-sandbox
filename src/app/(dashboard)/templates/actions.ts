'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { parseTimecodeToMs } from '@/lib/timecode'

// Helper untuk menyimpan file lokal ke public/uploads
async function saveFileLocally(file: File, prefix: string): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const publicDir = join(process.cwd(), 'public')
  const uploadsDir = join(publicDir, 'uploads')

  // Buat folder public/uploads jika belum ada
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }

  // Ambil ekstensi asli berkas atau default ke mp4/mp3
  const originalName = file.name || ''
  const ext = originalName.includes('.') 
    ? originalName.split('.').pop() 
    : (prefix.includes('video') ? 'mp4' : 'mp3')
  
  const filename = `${prefix}-${Date.now()}.${ext}`
  const filepath = join(uploadsDir, filename)

  await writeFile(filepath, buffer)
  return `/uploads/${filename}`
}

export async function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default",
  };
}

export async function createTemplate(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const videoFile = formData.get('video') as File | null
  const videoUrlText = formData.get('video_url') as string | null

  if (!name) {
    throw new Error('Nama template wajib diisi')
  }

  let video_url: string | null = videoUrlText || null

  if (videoFile && videoFile.size > 0) {
    video_url = await saveFileLocally(videoFile, 'template-video')
  }

  // Parse M&E audio
  const mneAudioFile = formData.get('mne_audio') as File | null
  const mneAudioUrlText = formData.get('mne_audio_url') as string | null
  let mne_audio_url: string | null = mneAudioUrlText || null

  if (mneAudioFile && mneAudioFile.size > 0) {
    mne_audio_url = await saveFileLocally(mneAudioFile, 'template-mne')
  }

  // Parse multi-audio sources
  const audioCount = Number(formData.get('audio_sources_count') || '0')
  const audioSources: Array<{ name: string; url: string }> = []

  for (let i = 0; i < audioCount; i++) {
    const label = formData.get(`audio_label_${i}`) as string
    const file = formData.get(`audio_file_${i}`) as File | null
    const urlText = formData.get(`audio_url_${i}`) as string | null
    const sourceType = formData.get(`audio_source_type_${i}`) as string

    if (!label) continue

    let finalUrl = ''

    if (sourceType === 'local' && file && file.size > 0) {
      finalUrl = await saveFileLocally(file, `template-audio-${i}`)
    } else if (urlText) {
      finalUrl = urlText
    }

    if (finalUrl) {
      audioSources.push({
        name: label,
        url: finalUrl,
      })
    }
  }

  // Fallback single audio_url_1 from first source
  const audio_url_1 = audioSources[0]?.url || null
  const audio_label_1 = audioSources[0]?.name || null
  const audio_url_2 = audioSources[1]?.url || null
  const audio_label_2 = audioSources[1]?.name || null
  const audio_url_3 = audioSources[2]?.url || null
  const audio_label_3 = audioSources[2]?.name || null
  const audio_url_4 = audioSources[3]?.url || null
  const audio_label_4 = audioSources[3]?.name || null

  const { error } = await supabase.from('templates').insert({
    name,
    description,
    video_url,
    audio_url_1,
    audio_label_1,
    audio_url_2,
    audio_label_2,
    audio_url_3,
    audio_label_3,
    audio_url_4,
    audio_label_4,
    mne_audio_url,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/templates')
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('templates').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/templates')
}

export async function createScene(templateId: string, name: string, sequenceNumber: number) {
  const supabase = await createClient()

  if (!name) {
    throw new Error('Nama scene wajib diisi')
  }

  const { error } = await supabase.from('template_scenes').insert({
    template_id: templateId,
    name,
    sequence_number: sequenceNumber,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/templates/${templateId}`)
}

export async function deleteScene(sceneId: string, templateId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('template_scenes').delete().eq('id', sceneId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/templates/${templateId}`)
}

export async function createLoop(
  sceneId: string,
  name: string,
  sequenceNumber: number,
  startTimecode: string,
  endTimecode: string,
  templateId: string
) {
  const supabase = await createClient()

  if (!name || !startTimecode || !endTimecode) {
    throw new Error('Nama loop dan batas waktu wajib diisi')
  }

  const startTimeMs = parseTimecodeToMs(startTimecode)
  const endTimeMs = parseTimecodeToMs(endTimecode)

  if (startTimeMs >= endTimeMs) {
    throw new Error('Waktu mulai harus lebih kecil dari waktu selesai')
  }

  const { error } = await supabase.from('template_loops').insert({
    scene_id: sceneId,
    name,
    sequence_number: sequenceNumber,
    start_time_ms: startTimeMs,
    end_time_ms: endTimeMs,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/templates/${templateId}`)
}

export async function deleteLoop(loopId: string, templateId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('template_loops').delete().eq('id', loopId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/templates/${templateId}`)
}

export async function addKeyTermToLoop(loopId: string, term: string, originalWord: string, meaningOrNote: string, templateId: string) {
  const supabase = await createClient()

  if (!term) {
    throw new Error('Kata kunci wajib diisi')
  }

  // Insert to key_terms
  const { data: termData, error: termError } = await supabase
    .from('key_terms')
    .insert({
      term,
      original_word: originalWord || null,
      meaning_or_note: meaningOrNote || null,
    })
    .select()
    .single()

  if (termError) {
    throw new Error(termError.message)
  }

  // Bind to loop
  const { error: bindError } = await supabase.from('loop_key_terms').insert({
    template_loop_id: loopId,
    key_term_id: termData.id,
  })

  if (bindError) {
    throw new Error(bindError.message)
  }

  revalidatePath(`/templates/${templateId}`)
}

export async function removeKeyTermFromLoop(loopId: string, termId: string, templateId: string) {
  const supabase = await createClient()

  // Just delete the relation. Let the key_term exist or clean it up.
  const { error } = await supabase
    .from('loop_key_terms')
    .delete()
    .eq('template_loop_id', loopId)
    .eq('key_term_id', termId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/templates/${templateId}`)
}

export async function importLoops(
  sceneId: string,
  templateId: string,
  loops: Array<{ name: string; startTimecode: string; endTimecode: string; sequenceNumber: number }>
) {
  const supabase = await createClient()

  const inserts = loops.map((loop) => {
    const startTimeMs = parseTimecodeToMs(loop.startTimecode)
    const endTimeMs = parseTimecodeToMs(loop.endTimecode)
    if (startTimeMs >= endTimeMs) {
      throw new Error(`Batas waktu loop "${loop.name}" tidak valid: waktu mulai >= waktu selesai.`)
    }
    return {
      scene_id: sceneId,
      name: loop.name,
      sequence_number: loop.sequenceNumber,
      start_time_ms: startTimeMs,
      end_time_ms: endTimeMs,
    }
  })

  const { error } = await supabase.from('template_loops').insert(inserts)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/templates/${templateId}`)
}

export async function updateTemplate(templateId: string, formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const videoFile = formData.get('video') as File | null
  const videoUrlText = formData.get('video_url') as string | null

  if (!name) {
    throw new Error('Nama template wajib diisi')
  }

  let video_url: string | null = videoUrlText || null

  if (videoFile && videoFile.size > 0) {
    video_url = await saveFileLocally(videoFile, 'template-video')
  }

  // Parse M&E audio
  const mneAudioFile = formData.get('mne_audio') as File | null
  const mneAudioUrlText = formData.get('mne_audio_url') as string | null
  let mne_audio_url: string | null = mneAudioUrlText || null

  if (mneAudioFile && mneAudioFile.size > 0) {
    mne_audio_url = await saveFileLocally(mneAudioFile, 'template-mne')
  }

  // Parse multi-audio sources
  const audioCount = Number(formData.get('audio_sources_count') || '0')
  const audioSources: Array<{ name: string; url: string }> = []

  for (let i = 0; i < audioCount; i++) {
    const label = formData.get(`audio_label_${i}`) as string
    const file = formData.get(`audio_file_${i}`) as File | null
    const urlText = formData.get(`audio_url_${i}`) as string | null
    const sourceType = formData.get(`audio_source_type_${i}`) as string

    if (!label) continue

    let finalUrl = ''

    if (sourceType === 'local' && file && file.size > 0) {
      finalUrl = await saveFileLocally(file, `template-audio-${i}`)
    } else if (urlText) {
      finalUrl = urlText
    }

    if (finalUrl) {
      audioSources.push({
        name: label,
        url: finalUrl,
      })
    }
  }

  // Fallback single audio_url_1 from first source
  const audio_url_1 = audioSources[0]?.url || null
  const audio_label_1 = audioSources[0]?.name || null
  const audio_url_2 = audioSources[1]?.url || null
  const audio_label_2 = audioSources[1]?.name || null
  const audio_url_3 = audioSources[2]?.url || null
  const audio_label_3 = audioSources[2]?.name || null
  const audio_url_4 = audioSources[3]?.url || null
  const audio_label_4 = audioSources[3]?.name || null

  const { error } = await supabase
    .from('templates')
    .update({
      name,
      description: description || null,
      video_url,
      audio_url_1,
      audio_label_1,
      audio_url_2,
      audio_label_2,
      audio_url_3,
      audio_label_3,
      audio_url_4,
      audio_label_4,
      mne_audio_url,
    })
    .eq('id', templateId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/templates/${templateId}`)
  revalidatePath('/templates')
}

export async function updateScene(sceneId: string, name: string, sequenceNumber: number, templateId: string) {
  const supabase = await createClient()

  if (!name) {
    throw new Error('Nama scene wajib diisi')
  }

  const { error } = await supabase
    .from('template_scenes')
    .update({
      name,
      sequence_number: sequenceNumber,
    })
    .eq('id', sceneId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/templates/${templateId}`)
}

export async function updateLoop(
  loopId: string,
  name: string,
  sequenceNumber: number,
  startTimecode: string,
  endTimecode: string,
  templateId: string
) {
  const supabase = await createClient()

  if (!name || !startTimecode || !endTimecode) {
    throw new Error('Nama loop dan batas waktu wajib diisi')
  }

  const startTimeMs = parseTimecodeToMs(startTimecode)
  const endTimeMs = parseTimecodeToMs(endTimecode)

  if (startTimeMs >= endTimeMs) {
    throw new Error('Waktu mulai harus lebih kecil dari waktu selesai')
  }

  const { error } = await supabase
    .from('template_loops')
    .update({
      name,
      sequence_number: sequenceNumber,
      start_time_ms: startTimeMs,
      end_time_ms: endTimeMs,
    })
    .eq('id', loopId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/templates/${templateId}`)
}
