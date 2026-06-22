'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const usernameOrEmail = formData.get('usernameOrEmail') as string
  const password = formData.get('password') as string

  if (!usernameOrEmail) {
    redirect('/login?message=Username atau Email wajib diisi')
  }

  let email = usernameOrEmail
  if (!usernameOrEmail.includes('@')) {
    // Resolusi email dari username di tabel users
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('username', usernameOrEmail)
      .maybeSingle()

    if (userError || !userRow?.email) {
      redirect(`/login?message=${encodeURIComponent('Username tidak ditemukan')}`)
    }
    email = userRow.email
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  console.log("LOGIN ATTEMPT:", email, "RESULT:", { data: !!data?.user, error })

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  // Auto-insert/sync user profile into public.users
  if (data?.user) {
    const userId = data.user.id
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single()

    const isEvan = email.toLowerCase() === 'evan@osdindonesia.com'

    if (!existingUser) {
      // Insert new user profile
      const username = data.user.user_metadata?.username || email.split('@')[0]
      await supabase.from('users').insert({
        id: userId,
        username: username,
        email: email,
        role: isEvan ? 'admin' : 'user'
      })
      console.log("Inserted missing public user row for:", email, "with role:", isEvan ? 'admin' : 'user')
    } else if (isEvan && existingUser.role !== 'admin') {
      // Upgrade role to admin for evan@osdindonesia.com
      await supabase.from('users').update({ role: 'admin' }).eq('id', userId)
      console.log("Upgraded user role to admin for:", email)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username) {
    redirect('/signup?message=Username wajib diisi untuk pendaftaran baru')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  console.log("SIGNUP ATTEMPT:", email, "RESULT:", { user: !!data?.user, error })

  if (error) {
    redirect(`/signup?message=${encodeURIComponent(error.message)}`)
  }

  if (data?.user) {
    // Masukkan ke tabel public.users
    await supabase.from('users').insert({
      id: data.user.id,
      username: username,
      email: email,
      role: 'user'
    });
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signInWithGoogle() {
  const supabase = await createClient()

  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }
  if (data?.url) {
    redirect(data.url)
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
