'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function updateProfile(username: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Anda harus login terlebih dahulu')
  }

  if (!username || username.trim().length < 3) {
    throw new Error('Nama pengguna minimal 3 karakter')
  }

  const { error } = await supabase
    .from('users')
    .update({ username: username.trim() })
    .eq('id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/settings')
  revalidatePath('/', 'layout')
}
