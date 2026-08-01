'use client'

/**
 * The tuning screen: controls down the left, saved presets down the right, and
 * the live globe filling everything behind them.
 *
 * The globe here is the same component the public page uses, driven by the same
 * config shape, so what you are looking at is the real thing and not a preview
 * that might disagree with it.
 */

import { useCallback, useState } from 'react'
import EarthBackground from '@/components/earth/EarthBackground'
import SiteText from '@/components/SiteText'
import {
  DEFAULTS,
  GROUPS,
  PARAMS,
  TABS,
  type EarthConfig,
  type ParamDef,
  type Tab,
} from '@/lib/earthConfig'

type Preset = { slug: string; name: string; savedAt: string; values: EarthConfig }

export default function Tuner({
  initial,
  presets: initialPresets,
  activeSlug: initialActive,
  backend,
  writable,
  email,
}: {
  initial: EarthConfig
  presets: Preset[]
  activeSlug: string | null
  backend: 'file' | 'supabase'
  writable: boolean
  /** null when running locally with no auth configured. */
  email: string | null
}) {
  // Where a save actually lands changes what the screen can honestly promise,
  // so the copy is derived rather than written for one of the two cases.
  const live = backend === 'supabase'
  const [values, setValues] = useState<EarthConfig>(initial)
  // Seeded from the server; every later change comes back in a mutation
  // response, so there is no fetch-on-mount and no empty first paint.
  const [presets, setPresets] = useState<Preset[]>(initialPresets)
  const [activeSlug, setActiveSlug] = useState<string | null>(initialActive)
  const [name, setName] = useState('')
  // The last state that was written to storage, so the screen can say plainly
  // whether what you are looking at has been kept or not.
  const [saved, setSaved] = useState<EarthConfig>(initial)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>('Earth')
  // The panels cover the left and right thirds of the screen, which is exactly
  // where the text position controls put the text. Without a way to get them
  // out of the way you cannot see what you are aiming at.
  const [showPanels, setShowPanels] = useState(true)

  const set = useCallback(<K extends keyof EarthConfig>(key: K, value: EarthConfig[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  async function save() {
    if (!name.trim()) return setStatus('Give it a name first.')
    setBusy(true)
    const res = await fetch('/api/earth-config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, values }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) return setStatus(data.error ?? 'Save failed.')
    setPresets(data.presets)
    // The name is kept, not cleared. Saving again is the normal way to keep
    // working on a look, and clearing it forced you to retype the exact name
    // to update what you had just saved.
    setName(data.saved.name)
    setSaved(data.saved.values)
    setStatus(
      activeSlug === data.saved.slug && live
        ? `Saved “${data.saved.name}” — it is the live look, so the site is updated.`
        : `Saved “${data.saved.name}”.`,
    )
  }

  async function makeActive(slug: string | null) {
    setBusy(true)
    const res = await fetch('/api/earth-config/active', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) return setStatus(data.error ?? 'Failed.')
    setActiveSlug(data.activeSlug)
    setStatus(
      slug
        ? live
          ? 'Live now. Reload the home page to see it.'
          : 'Marked as the live look. It reaches the real site on the next commit + deploy.'
        : 'Cleared — the site falls back to the built-in defaults.',
    )
  }

  async function remove(preset: Preset) {
    if (!confirm(`Delete “${preset.name}”?`)) return
    setBusy(true)
    const res = await fetch(`/api/earth-config?slug=${encodeURIComponent(preset.slug)}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) return setStatus(data.error ?? 'Delete failed.')
    setPresets(data.presets)
    setActiveSlug(data.activeSlug)
    setStatus(`Deleted “${preset.name}”.`)
  }

  const dirtyCount = PARAMS.filter((p) => values[p.key] !== DEFAULTS[p.key]).length
  const unsaved = PARAMS.some((p) => values[p.key] !== saved[p.key])

  return (
    // No background colour here on purpose. EarthBackground sits at -z-10, and
    // a background on this element paints over anything stacked behind it —
    // which is exactly what hid the globe the first time. The black comes from
    // <body> in the layout, which paints below negative z-index children.
    <main className="relative min-h-screen overflow-hidden text-white">
      <EarthBackground config={values} />
      <SiteText config={values} />

      <button
        onClick={() => setShowPanels((v) => !v)}
        className="fixed right-4 bottom-10 z-30 rounded-full border border-white/15 bg-black/70 px-4 py-2 text-xs text-white/70 backdrop-blur transition-colors hover:text-white"
      >
        {showPanels ? 'Hide panels' : 'Show panels'}
      </button>

      <div
        className={`relative z-10 flex min-h-screen flex-col gap-4 p-4 lg:flex-row lg:items-start ${
          showPanels ? '' : 'pointer-events-none invisible'
        }`}
      >
        {/* ---------------------------------------------------- controls */}
        <aside className="w-full shrink-0 rounded-lg border border-white/10 bg-black/70 backdrop-blur lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-80 lg:overflow-y-auto">
          <header className="border-b border-white/10">
            <nav className="flex">
              {TABS.map((t) => {
                const empty = GROUPS[t].length === 0
                return (
                  <button
                    key={t}
                    onClick={() => !empty && setTab(t)}
                    disabled={empty}
                    title={empty ? 'Not built yet' : undefined}
                    className={`flex-1 border-b-2 px-2 py-3 text-xs font-medium transition-colors ${
                      tab === t
                        ? 'border-white text-white'
                        : empty
                          ? 'border-transparent text-white/20'
                          : 'border-transparent text-white/45 hover:text-white/80'
                    }`}
                  >
                    {t}
                  </button>
                )
              })}
            </nav>
            <p className="px-4 pb-3 text-xs text-white/50">
              {unsaved ? (
                <span className="text-amber-400">Unsaved changes — Save is on the right →</span>
              ) : (
                <>
                  {dirtyCount === 0
                    ? 'Matching the built-in defaults.'
                    : `${dirtyCount} changed from defaults.`}
                </>
              )}
            </p>
          </header>

          {GROUPS[tab].map((group) => (
            <section key={group} className="border-b border-white/10 px-4 py-3 last:border-0">
              <h2 className="mb-3 text-xs font-semibold tracking-wide text-white/40 uppercase">
                {group}
              </h2>
              <div className="space-y-4">
                {PARAMS.filter((p) => p.tab === tab && p.group === group).map((param) => (
                  <Control key={param.key} param={param} values={values} onChange={set} />
                ))}
              </div>
            </section>
          ))}

          <div className="px-4 py-3">
            <button
              onClick={() => setValues(DEFAULTS)}
              className="w-full rounded border border-white/15 px-3 py-2 text-xs text-white/70 transition-colors hover:bg-white/10"
            >
              Reset to defaults
            </button>
          </div>
        </aside>

        {/* Spacer. The text itself is absolutely positioned across the whole
            screen, exactly as on the live page, so its position controls mean
            the same thing here as they do there. */}
        <div className="min-h-[40vh] flex-1" />

        {/* ----------------------------------------------------- presets */}
        <aside className="w-full shrink-0 rounded-lg border border-white/10 bg-black/70 backdrop-blur lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-80 lg:overflow-y-auto">
          <header className="border-b border-white/10 px-4 py-3">
            <h1 className="text-sm font-semibold">Saved looks</h1>
            <p className="mt-1 text-xs text-white/50">
              {live ? (
                'Stored in Supabase.'
              ) : (
                <>
                  Written to <code className="text-white/70">config/earth/</code> as text files.
                </>
              )}
            </p>
          </header>

          <div
            className={`border-b border-white/10 px-4 py-3 ${unsaved ? 'bg-amber-400/10' : ''}`}
          >
            <label className="block text-xs text-white/60" htmlFor="preset-name">
              {unsaved ? 'You have unsaved changes. Save them as' : 'Save the current settings as'}
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="preset-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void save()}
                placeholder="Calm drift"
                className="min-w-0 flex-1 rounded border border-white/15 bg-black/50 px-2 py-1.5 text-sm outline-none placeholder:text-white/25 focus:border-white/40"
              />
              <button
                onClick={() => void save()}
                disabled={busy}
                className="rounded bg-white px-3 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Save
              </button>
            </div>
            <p className="mt-2 text-xs text-white/35">
              Reusing a name overwrites that look. Saving over the live one
              {live ? ' updates the site immediately.' : ' takes effect on the next deploy.'}
            </p>
          </div>

          <ul className="divide-y divide-white/10">
            {presets.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-white/40">
                Nothing saved yet.
              </li>
            )}
            {presets.map((preset) => (
              <li key={preset.slug} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => {
                      setValues(preset.values)
                      setSaved(preset.values)
                      // Prefilled so Save updates this look rather than
                      // silently creating a second one under a new name.
                      setName(preset.name)
                      setStatus(`Loaded “${preset.name}”.`)
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm hover:underline">{preset.name}</span>
                    <span className="block text-xs text-white/35">
                      {preset.savedAt ? new Date(preset.savedAt).toLocaleString() : '—'}
                    </span>
                  </button>
                  <button
                    onClick={() => void remove(preset)}
                    disabled={busy}
                    className="shrink-0 text-xs text-white/35 transition-colors hover:text-red-400 disabled:opacity-40"
                    aria-label={`Delete ${preset.name}`}
                  >
                    delete
                  </button>
                </div>

                {activeSlug === preset.slug ? (
                  <p className="mt-2 text-xs text-emerald-400">● Live look</p>
                ) : (
                  <button
                    onClick={() => void makeActive(preset.slug)}
                    disabled={busy}
                    className="mt-2 text-xs text-white/45 underline-offset-2 transition-colors hover:text-white hover:underline disabled:opacity-40"
                  >
                    Use this on the site
                  </button>
                )}
              </li>
            ))}
          </ul>

          {activeSlug && (
            <div className="border-t border-white/10 px-4 py-3">
              <button
                onClick={() => void makeActive(null)}
                disabled={busy}
                className="text-xs text-white/45 underline-offset-2 hover:text-white hover:underline disabled:opacity-40"
              >
                Clear the live look
              </button>
            </div>
          )}

          <p className="border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-white/40">
            {!writable
              ? 'Read-only here — nothing can be saved.'
              : live
                ? 'Saving changes the public site straight away. No deploy needed.'
                : 'Saving writes files on this machine only. The public site changes when those files are committed and deployed.'}
          </p>

          {email && (
            <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
              <span className="truncate text-xs text-white/40">{email}</span>
              <button
                onClick={async () => {
                  await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ action: 'signout' }),
                  })
                  window.location.assign('/tune')
                }}
                className="shrink-0 text-xs text-white/45 underline-offset-2 hover:text-white hover:underline"
              >
                Sign out
              </button>
            </div>
          )}
        </aside>
      </div>

      {status && (
        <p className="fixed inset-x-0 bottom-0 z-20 bg-white/10 px-4 py-2 text-center text-xs backdrop-blur">
          {status}
        </p>
      )}
    </main>
  )
}

/* ------------------------------------------------------------------ control */

function Control({
  param,
  values,
  onChange,
}: {
  param: ParamDef
  values: EarthConfig
  onChange: <K extends keyof EarthConfig>(key: K, value: EarthConfig[K]) => void
}) {
  const value = values[param.key]

  if (param.kind === 'toggle') {
    return (
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-sm">{param.label}</span>
        <input
          id={param.key}
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(param.key, e.target.checked as never)}
          className="h-4 w-4 accent-white"
        />
      </label>
    )
  }

  if (param.kind === 'color') {
    return (
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm">{param.label}</span>
        <input
          type="color"
          value={value as string}
          onChange={(e) => onChange(param.key, e.target.value as never)}
          className="h-7 w-12 cursor-pointer rounded border border-white/15 bg-transparent"
        />
      </label>
    )
  }

  if (param.kind === 'select') {
    return (
      <label className="block">
        <span className="text-sm">{param.label}</span>
        <div className="mt-1.5 flex gap-1">
          {param.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(param.key, option as never)}
              className={`flex-1 rounded border px-2 py-1.5 text-xs capitalize transition-colors ${
                value === option
                  ? 'border-white/60 bg-white/15 text-white'
                  : 'border-white/15 text-white/50 hover:text-white'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        {param.hint && <p className="mt-1 text-xs leading-snug text-white/35">{param.hint}</p>}
      </label>
    )
  }

  if (param.kind === 'text') {
    const text = value as string
    const shared = {
      id: param.key,
      value: text,
      onChange: (e: { target: { value: string } }) =>
        onChange(param.key, e.target.value.slice(0, param.maxLength) as never),
      placeholder: param.placeholder,
      className:
        'mt-1.5 w-full rounded border border-white/15 bg-black/50 px-2 py-1.5 text-sm outline-none placeholder:text-white/25 focus:border-white/40',
    }
    return (
      <label className="block" htmlFor={param.key}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm">{param.label}</span>
          <span className="font-mono text-xs text-white/35">
            {text.length}/{param.maxLength}
          </span>
        </div>
        {param.multiline ? <textarea rows={3} {...shared} /> : <input type="text" {...shared} />}
        {param.hint && <p className="mt-1 text-xs leading-snug text-white/35">{param.hint}</p>}
      </label>
    )
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm" htmlFor={param.key}>
          {param.label}
        </label>
        <span className="font-mono text-xs text-white/50">
          {(value as number).toFixed(step2dp(param.step))}
          {param.unit ?? ''}
        </span>
      </div>
      <input
        id={param.key}
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value as number}
        onChange={(e) => onChange(param.key, Number(e.target.value) as never)}
        className="mt-1.5 w-full accent-white"
      />
      {param.hint && <p className="mt-1 text-xs leading-snug text-white/35">{param.hint}</p>}
    </div>
  )
}

/** Show as many decimals as the step implies, so 0.005 steps do not read "1". */
function step2dp(step: number): number {
  const s = String(step)
  const dot = s.indexOf('.')
  return dot === -1 ? 0 : s.length - dot - 1
}
