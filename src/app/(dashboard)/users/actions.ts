'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function updateUserRole(userId: string, role: 'admin' | 'user') {
  const supabase = await createClient()

  // 1. Get current logged-in user to check if they are admin
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    throw new Error('Anda harus login terlebih dahulu')
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', currentUser.id)
    .single()

  if (dbUser?.role !== 'admin') {
    throw new Error('Hanya administrator yang dapat mengubah role')
  }

  // Prevent admin from changing their own role (accidental lockout)
  if (currentUser.id === userId) {
    throw new Error('Anda tidak dapat mengubah role Anda sendiri')
  }

  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/users')
}

export async function createUser(username: string, email: string, password: string, role: 'admin' | 'user') {
  const supabase = await createClient()

  // 1. Get current logged-in user
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    throw new Error('Anda harus login terlebih dahulu')
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', currentUser.id)
    .single()

  if (dbUser?.role !== 'admin') {
    throw new Error('Hanya administrator yang dapat membuat pengguna baru')
  }

  // 2. Create client without cookie storage for signUp
  const tempSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  )

  const { data, error: signUpError } = await tempSupabase.auth.signUp({
    email,
    password,
  })

  if (signUpError) {
    throw new Error(signUpError.message)
  }

  if (data?.user) {
    // Insert into public.users
    const { error: insertError } = await supabase.from('users').insert({
      id: data.user.id,
      username: username.trim(),
      email: email.trim(),
      role: role
    })

    if (insertError) {
      throw new Error(insertError.message)
    }
  }

  revalidatePath('/users')
}

export async function deleteUser(userId: string) {
  const supabase = await createClient()

  // 1. Get current logged-in user
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    throw new Error('Anda harus login terlebih dahulu')
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', currentUser.id)
    .single()

  if (dbUser?.role !== 'admin') {
    throw new Error('Hanya administrator yang dapat menghapus pengguna')
  }

  if (currentUser.id === userId) {
    throw new Error('Anda tidak dapat menghapus akun Anda sendiri')
  }

  // Delete from public.users (will cascade delete or handle as needed)
  const { error } = await supabase.from('users').delete().eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/users')
}
