'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function QuestAuthPanel({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    if (password.length < 8) {
      setMessage('Use a password with at least 8 characters.')
      return
    }

    setBusy(true)
    try {
      const supabase = createClient()
      if (mode === 'sign_in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setMessage('Invalid email or password.')
          return
        }
        onAuthenticated()
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback?next=/dashboard/quests`,
        },
      })
      if (error) {
        setMessage('Unable to create the account. Check the email and password requirements, then try again.')
        return
      }
      if (data.session) {
        onAuthenticated()
        return
      }
      setMessage('Account request received. If email confirmation is enabled, check your inbox before posting.')
    } catch {
      setMessage('Authentication is temporarily unavailable. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/[0.035]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sign in to post a quest</CardTitle>
        <CardDescription>
          Anyone can browse open quests. Publishing is tied to an authenticated account; credential eligibility is shown as a requirement, not claimed as verified by this page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit}>
          <FieldGroup className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field>
              <FieldLabel htmlFor="quest-email">Email</FieldLabel>
              <Input id="quest-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="quest-password">Password</FieldLabel>
              <Input id="quest-password" type="password" autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <Field className="justify-end">
              <Button type="submit" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'sign_in' ? 'Sign in' : 'Create account'}
              </Button>
            </Field>
          </FieldGroup>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => { setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in'); setMessage(null) }}>
            {mode === 'sign_in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
          </button>
          {message && <p role="status" className="text-muted-foreground">{message}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
