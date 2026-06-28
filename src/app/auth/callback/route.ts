import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      const email = data.user.email
      if (email) {
        // Sinkronisasi profil pengguna ke public.users
        const userId = data.user.id
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, role')
          .eq('id', userId)
          .single()

        const isEvan = email.toLowerCase() === 'evan@osdindonesia.com'

        if (!existingUser) {
          // Masukkan profil baru
          const username = data.user.user_metadata?.username || email.split('@')[0]
          await supabase.from('users').insert({
            id: userId,
            username: username,
            email: email,
            role: isEvan ? 'admin' : 'user'
          })

        } else if (isEvan && existingUser.role !== 'admin') {
          // Naikkan menjadi admin
          await supabase.from('users').update({ role: 'admin' }).eq('id', userId)

        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
