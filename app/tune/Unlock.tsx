'use client'

import { useState } from 'react'

export default function Unlock() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const res = await fetch('/api/tune-auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    setBusy(false)
    if (res.ok) {
      // Full reload so the server re-renders the page with the session cookie
      // in hand, rather than trying to mirror auth state on the client.
      window.location.reload()
      return
    }
    const data = await res.json().catch(() => ({}))
    setError(data.error ?? 'Wrong password.')
    setPassword('')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <form onSubmit={submit} className="w-full max-w-xs">
        <h1 className="text-sm font-semibold">Tune the globe</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          placeholder="Password"
          className="mt-4 w-full rounded border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none placeholder:text-white/25 focus:border-white/40"
        />
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-3 w-full rounded bg-white px-3 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? 'Checking…' : 'Unlock'}
        </button>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </form>
    </main>
  )
}
