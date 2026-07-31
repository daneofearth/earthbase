'use client'

import { useState } from 'react'

type Mode = 'signin' | 'signup'

export default function AccessGate({ notice }: { notice?: string | null }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(notice ?? null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: mode, email, password }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)

    if (!res.ok) {
      setError(data.error ?? 'That did not work.')
      setPassword('')
      return
    }

    if (mode === 'signup' && !data.confirmed) {
      setMessage(data.message)
      setMode('signin')
      setPassword('')
      return
    }

    // Full reload so the server re-renders with the session cookie in hand,
    // rather than trying to mirror auth state on the client.
    window.location.assign('/tune')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <form onSubmit={submit} className="w-full max-w-xs">
        <h1 className="text-sm font-semibold">Tune the globe</h1>

        <div className="mt-4 flex gap-4 text-xs">
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError(null)
              }}
              className={
                mode === m
                  ? 'text-white underline underline-offset-4'
                  : 'text-white/40 transition-colors hover:text-white/70'
              }
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          autoFocus
          placeholder="Email"
          className="mt-4 w-full rounded border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none placeholder:text-white/25 focus:border-white/40"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
          placeholder="Password"
          className="mt-2 w-full rounded border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none placeholder:text-white/25 focus:border-white/40"
        />

        <button
          type="submit"
          disabled={busy || !email || !password}
          className="mt-3 w-full rounded bg-white px-3 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        {message && <p className="mt-3 text-xs text-emerald-400">{message}</p>}

        <p className="mt-6 text-xs leading-relaxed text-white/30">
          Accounts are limited to a fixed list of addresses. Anything else is
          refused whether or not it has a password.
        </p>
      </form>
    </main>
  )
}
