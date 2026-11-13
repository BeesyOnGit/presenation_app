// Host control (/host): PIN, then the only place that moves the talk forward.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { emit, serverNow, useServerState, useTick } from '../socket'
import type { Phase, State } from '../types'
import { bullets, clock, Icon, inline, paragraphs, pct } from '../ui'

const PIN_KEY = 'cwc-host-pin'
const OFFLINE = 'No answer from the server'
const ss = {
  get: () => {
    try {
      return sessionStorage.getItem(PIN_KEY) ?? ''
    } catch {
      return ''
    }
  },
  set: (v: string | null) => {
    try {
      if (v) sessionStorage.setItem(PIN_KEY, v)
      else sessionStorage.removeItem(PIN_KEY)
    } catch {
      // no storage: the host retypes the PIN after a reload
    }
  },
}

export default function Host() {
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState('')

  const auth = (pin: string) =>
    emit('host:auth', { pin })
      .then(() => {
        ss.set(pin)
        setAuthed(true)
        setError('')
      })
      .catch((e: Error) => {
        if (e.message !== OFFLINE) {
          ss.set(null)
          setAuthed(false)
        }
        setError(e.message)
      })

  const { state, connected } = useServerState(() => {
    const pin = ss.get()
    if (pin) auth(pin)
  })

  if (!authed) return <Pin onSubmit={auth} error={error} />
  if (!state?.fullStep)
    return (
      <div className="phone" style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        Loading…
      </div>
    )
  return <Panel s={state} connected={connected} />
}

function Pin({ onSubmit, error }: { onSubmit: (pin: string) => Promise<void>; error: string }) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    await onSubmit(pin)
    setBusy(false)
    setPin('')
  }
  const press = (k: string) => (k === '⌫' ? setPin((p) => p.slice(0, -1)) : k === '✓' ? pin && submit() : setPin((p) => (p + k).slice(0, 12)))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('⌫')
      else if (e.key === 'Enter') press('✓')
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  const boxes = Math.max(4, pin.length + (pin.length < 12 ? 1 : 0))
  return (
    <div className="phone" style={{ padding: '28px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="badge">CWC</span>
        <span className="kicker muted">HOST</span>
      </div>
      <div style={{ marginTop: 56, fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Enter host PIN</div>
      <div style={{ marginTop: 8, fontSize: 16, color: 'var(--muted)' }}>Only the presenter controls the talk.</div>
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: `repeat(${Math.min(boxes, 6)}, minmax(0, 1fr))`, gap: 12 }} aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: boxes }, (_, i) => (
          <div key={i} style={{ height: 68, borderRadius: 14, background: 'var(--surface)', border: `2px solid ${i === pin.length ? 'var(--text)' : 'var(--line)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: "800 30px 'JetBrains Mono', monospace" }}>
            {i < pin.length ? '•' : ''}
          </div>
        ))}
      </div>
      {error && (
        <div className="error" role="alert" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: 'auto', paddingTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map((k) => (
          <button
            key={k}
            disabled={busy || (k === '✓' && !pin)}
            aria-label={k === '⌫' ? 'Delete' : k === '✓' ? 'Enter' : k}
            onClick={() => press(k)}
            style={{ height: 60, borderRadius: 14, border: 0, background: k === '✓' ? 'var(--text)' : 'var(--surface)', color: k === '✓' ? 'var(--bg)' : 'var(--text)', font: "700 24px 'JetBrains Mono', monospace" }}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}

const POLL_PHASES: [Phase, string][] = [
  ['waiting', 'Waiting'],
  ['open', 'Open'],
  ['closed', 'Closed'],
  ['revealed', 'Revealed'],
]
const GAME_PHASES: [Phase, string][] = [
  ['intro', 'Intro'],
  ['playing', 'Playing'],
  ['heatmap', 'Heatmap'],
  ['revealed', 'Reveal'],
  ['leaderboard', 'Board'],
]

/** The next phase the host can trigger, with its button label. */
function nextAction(s: State): [Phase, string] | null {
  const step = s.fullStep!
  const p = s.phase
  if (step.type === 'poll' || step.type === 'compare') {
    if (p === 'waiting' || !p) return ['open', 'Open poll']
    if (p === 'open') return ['closed', 'Close poll']
    if (p === 'closed') return ['revealed', 'Reveal results']
  }
  if (step.type === 'game-round') {
    if (p === 'intro' || !p) return ['playing', 'Start round']
    if (p === 'playing') return ['heatmap', 'End round · show heatmap']
    if (p === 'heatmap') return ['revealed', 'Reveal answer']
    if (p === 'revealed' && step.scored !== false) return ['leaderboard', 'Show leaderboard']
  }
  return null
}

function Panel({ s, connected }: { s: State; connected: boolean }) {
  const step = s.fullStep!
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [allPlayers, setAllPlayers] = useState(false)
  const playing = s.phase === 'playing'
  useTick(true, 500)

  const act = async (event: string, payload?: unknown) => {
    setBusy(true)
    setError('')
    try {
      return await emit<unknown>(event, payload)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const go = (i: number) => i >= 0 && i < s.stepCount && act('host:goto', { stepIndex: i })
  const action = nextAction(s)

  // Arrow keys and presentation clickers (PageUp / PageDown)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as Element)?.closest('input, textarea')) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(s.stepIndex + 1)
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(s.stepIndex - 1)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  const phases = step.type === 'game-round' ? GAME_PHASES.filter(([p]) => p !== 'leaderboard' || step.scored !== false) : step.type === 'poll' || step.type === 'compare' ? POLL_PHASES : null
  const at = phases?.findIndex(([p]) => p === s.phase) ?? -1
  const players = s.players ?? []
  const shown = allPlayers ? players : players.slice(0, 8)

  const exportCsv = async () => {
    const csv = await act('host:export')
    if (typeof csv !== 'string') return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `poll-results-${s.room}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  let detail: ReactNode = <span className="muted">{s.phase ? `Phase: ${s.phase}` : step.type}</span>
  if (s.poll) detail = <Count n={s.poll.answerCount} of={s.playerCount} what="answered" />
  if (step.type === 'game-round' && s.game) {
    const left = (s.game.roundEndsAt ?? 0) - serverNow()
    detail = (
      <>
        {playing && (
          <>
            <span className="mono" style={{ fontWeight: 800, fontSize: 22, color: 'var(--yellow)' }}>
              {left > (step.durationSec ?? 30) * 1000 ? 'GO in ' + Math.ceil((left - (step.durationSec ?? 30) * 1000) / 1000) : clock(left)}
            </span>
            <span className="muted">left ·</span>
          </>
        )}
        <Count n={s.game.lockedCount} of={s.playerCount} what="locked" />
      </>
    )
  }

  return (
    <div className="host">
      <div className="topbar" style={{ padding: '0 16px', justifyContent: 'flex-start' }}>
        <span className="badge">HOST</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--muted)' }}>
          <span className="dot" style={{ background: connected ? 'var(--green)' : 'var(--warn)' }} />
          {connected ? 'Live' : 'Reconnecting…'} · <b className="mono" style={{ color: 'var(--text)' }}>{s.playerCount}</b> players
        </span>
        <a href="/screen" target="_blank" rel="noreferrer" className="mono" style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>
          /screen
        </a>
        <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)' }}>
          {s.room}
        </span>
      </div>

      <div className="host-cols">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16, minHeight: 'calc(100dvh - 52px)' }}>
          <div className="card" style={{ borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="kicker muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>
                NOW · STEP {s.stepIndex} / {s.stepCount - 1}
              </span>
              <span style={{ color: step.theme === 'part2' ? 'var(--yellow)' : 'var(--red)' }}>{step.type.toUpperCase().replace('-', ' ')}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>{step.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, flexWrap: 'wrap' }}>{detail}</div>
            {step.type === 'game-round' && step.patternName && (
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                Answer: <b style={{ color: 'var(--text)' }}>{step.answers?.length ? step.answers.map((a) => a.join(' / ')).join(' + ') : 'clean screen'}</b> · {step.patternName}
              </div>
            )}
            {step.correctOptionId && (
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                Answer: <b style={{ color: 'var(--text)' }}>{step.options?.find((o) => o.id === step.correctOptionId)?.label}</b>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 4, padding: '10px 12px', borderRadius: 10, background: 'rgba(230,255,74,0.08)', color: 'var(--yellow)', fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
              <Icon name="next" size={18} style={{ flex: 'none', marginTop: 1 }} />
              {cue(s)}
            </div>
          </div>

          <Timers s={s} />

          {phases && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${phases.length}, minmax(0, 1fr))`, gap: 4 }}>
              {phases.map(([p, label], i) => (
                <div key={p} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: '100%', height: 6, borderRadius: 3, background: i < at ? '#4A525E' : i === at ? 'var(--yellow)' : 'var(--surface2)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: i === at ? 'var(--yellow)' : 'var(--muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {action && (
            <button className="btn btn-yellow" style={{ height: 64 }} disabled={busy} onClick={() => act('host:phase', { phase: action[0] })}>
              {action[1]}
            </button>
          )}
          {phases && (
            <button className="btn btn-danger" style={{ height: 52, fontSize: 15, borderRadius: 14 }} disabled={busy} onClick={() => confirm('Reset this step? Its answers are wiped.') && act('host:reset')}>
              Reset step
            </button>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}

          <Notes md={step.notes} />
          <Results s={s} />

          <div style={{ marginTop: 'auto', borderRadius: 16, background: 'var(--surface)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="kicker muted" style={{ fontSize: 12 }}>
              NEXT · STEP {s.stepIndex + 1}
            </span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{s.nextStep ?? 'End of the talk'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, position: 'sticky', bottom: 0, padding: '10px 0 16px', background: 'var(--bg)' }}>
            <button className="btn btn-ghost" aria-label="Previous step" style={{ height: 76, borderRadius: 18, background: 'var(--surface)', fontSize: 17 }} disabled={busy || s.stepIndex === 0} onClick={() => go(s.stepIndex - 1)}>
              <Icon name="prev" size={22} sw={2.6} />
              Prev
            </button>
            <button className="btn" style={{ height: 76, borderRadius: 18, fontSize: 20 }} disabled={busy || s.stepIndex >= s.stepCount - 1} onClick={() => go(s.stepIndex + 1)}>
              Next
              <Icon name="next" size={24} sw={2.6} />
            </button>
          </div>
        </div>

        <div>
          <Outline s={s} busy={busy} onGo={go} />
          <div style={{ padding: '20px 16px 8px', borderTop: '1px solid var(--surface2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>Players</span>
              <span className="mono muted" style={{ fontSize: 13 }}>
                {s.playerCount} online · {players.length} joined
              </span>
            </div>
            {shown.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 52, padding: '0 4px 0 12px', borderRadius: 12, background: 'var(--surface)', opacity: p.online ? 1 : 0.5 }}>
                <span className="dot" style={{ background: p.online ? 'var(--green)' : 'var(--line)' }} />
                <span className="mono" style={{ flex: 1, fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.nickname}
                </span>
                <span className="mono muted" style={{ fontSize: 14 }}>
                  {p.score}
                </span>
                <button
                  className="icon-btn"
                  aria-label={`Rename ${p.nickname}`}
                  onClick={() => {
                    const nickname = prompt('New nickname (16 characters max)', p.nickname)
                    if (nickname?.trim()) act('host:player', { playerId: p.id, action: 'rename', nickname: nickname.trim() })
                  }}
                >
                  <Icon name="pencil" size={18} sw={2} />
                </button>
                <button className="icon-btn" aria-label={`Remove ${p.nickname}`} style={{ color: 'var(--error)' }} onClick={() => confirm(`Remove ${p.nickname}?`) && act('host:player', { playerId: p.id, action: 'remove' })}>
                  <Icon name="trash" size={18} sw={2} />
                </button>
              </div>
            ))}
            {players.length > 8 && (
              <button onClick={() => setAllPlayers((v) => !v)} style={{ height: 44, borderRadius: 12, border: '1px dashed var(--line)', background: 'transparent', color: 'var(--muted)', font: '600 14px Inter, sans-serif' }}>
                {allPlayers ? 'Show fewer' : `Show all ${players.length}`}
              </button>
            )}
            {!players.length && <div className="muted" style={{ fontSize: 14 }}>Nobody joined yet.</div>}
          </div>

          <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>Q&amp;A</span>
              <span className="mono muted" style={{ fontSize: 13 }}>
                {s.questions.length} questions
              </span>
            </div>
            {s.questions.map((q) => {
              const on = q.id === s.highlightedQuestionId
              return (
                <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 12, background: 'var(--surface)', border: on ? '1.5px solid var(--yellow)' : '1px solid var(--line)', opacity: q.hidden ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.4 }}>
                    <b className="mono">{q.votes}</b>
                    <span style={{ overflowWrap: 'anywhere' }}>{q.text}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      disabled={q.hidden}
                      onClick={() => act('host:qna', { questionId: q.id, action: on ? 'unhighlight' : 'highlight' })}
                      style={{ height: 44, flex: 1, borderRadius: 10, border: 0, background: on ? 'var(--yellow)' : 'var(--surface2)', color: on ? 'var(--bg)' : 'var(--text)', font: '700 14px Inter, sans-serif' }}
                    >
                      {on ? 'On screen' : 'Highlight'}
                    </button>
                    <button
                      onClick={() => act('host:qna', { questionId: q.id, action: q.hidden ? 'show' : 'hide' })}
                      style={{ height: 44, width: 88, borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', font: '600 14px Inter, sans-serif' }}
                    >
                      {q.hidden ? 'Show' : 'Hide'}
                    </button>
                  </div>
                </div>
              )
            })}
            <button className="btn btn-ghost" style={{ marginTop: 14, height: 48, fontSize: 15, borderRadius: 12 }} disabled={busy} onClick={exportCsv}>
              Export poll results (CSV)
            </button>
            <button
              className="btn btn-danger"
              style={{ height: 48, fontSize: 15, borderRadius: 12 }}
              disabled={busy}
              onClick={() => confirm('End the session? This wipes every player, answer, score and question, and creates a new room code.') && act('host:end')}
            >
              End session · wipe all data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** m:ss for a duration in ms (can be negative). */
const dur = (ms: number) => {
  const s = Math.round(Math.abs(ms) / 1000)
  return `${ms < 0 ? '−' : ''}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Ms spent on step `i`: earlier visits, plus the live one for the current step. */
const spent = (s: State, i: number) => (s.outline?.[i]?.spentMs ?? 0) + (i === s.stepIndex && s.stepStartedAt ? Math.max(0, serverNow() - s.stepStartedAt) : 0)

/** Time on this step against its budget, and the whole talk against the plan. */
function Timers({ s }: { s: State }) {
  const now = serverNow()
  const outline = s.outline ?? []
  const budget = (outline[s.stepIndex]?.budgetSec ?? 0) * 1000
  const onStep = spent(s, s.stepIndex)
  const total = outline.reduce((a, o) => a + (o.budgetSec ?? 0), 0) * 1000
  const plannedBefore = outline.slice(0, s.stepIndex).reduce((a, o) => a + (o.budgetSec ?? 0), 0) * 1000
  const talk = s.talkStartedAt ? now - s.talkStartedAt : 0
  // Behind schedule = time used so far minus what the plan allowed up to here (this step counts once over budget)
  const drift = s.talkStartedAt ? talk - plannedBefore - Math.min(onStep, budget) : 0
  const ratio = budget ? onStep / budget : 0
  const color = ratio >= 1 ? 'var(--red)' : ratio >= 0.8 ? 'var(--warn)' : 'var(--green)'

  return (
    <div className="card" style={{ borderRadius: 18, padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="kicker muted" style={{ fontSize: 12 }}>
          THIS STEP
        </span>
        <span className="mono" style={{ fontSize: 30, fontWeight: 800, color: budget ? color : undefined }}>
          {dur(onStep)}
          {budget > 0 && <span style={{ fontSize: 16, color: 'var(--muted)' }}> / {dur(budget)}</span>}
        </span>
        {budget > 0 && (
          <>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, ratio * 100)}%`, height: '100%', background: color, transition: 'width 0.5s linear' }} />
            </div>
            <span style={{ fontSize: 13, color: ratio >= 1 ? 'var(--red)' : 'var(--muted)', fontWeight: ratio >= 1 ? 700 : 400 }}>
              {ratio >= 1 ? `${dur(onStep - budget)} over: move on` : `${dur(budget - onStep)} left`}
            </span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="kicker muted" style={{ fontSize: 12 }}>
          WHOLE TALK
        </span>
        <span className="mono" style={{ fontSize: 30, fontWeight: 800 }}>
          {dur(talk)}
          <span style={{ fontSize: 16, color: 'var(--muted)' }}> / {dur(total)}</span>
        </span>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden' }}>
          <div style={{ width: `${total ? Math.min(100, (talk / total) * 100) : 0}%`, height: '100%', background: 'var(--text)' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: !s.talkStartedAt ? 'var(--muted)' : Math.abs(drift) < 30000 ? 'var(--green)' : drift > 0 ? 'var(--red)' : 'var(--yellow)' }}>
          {!s.talkStartedAt ? 'Starts when you leave the lobby' : Math.abs(drift) < 30000 ? 'On schedule' : drift > 0 ? `${dur(drift)} behind` : `${dur(-drift)} ahead`}
        </span>
      </div>
    </div>
  )
}

/** One line telling the presenter what to do right now. */
function cue(s: State): string {
  const step = s.fullStep!
  const p = s.phase
  switch (step.type) {
    case 'lobby':
      return `${s.playerCount} joined. Go when the count stops rising.`
    case 'poll':
    case 'compare':
      if (p === 'open') return `${s.poll?.answerCount ?? 0} / ${s.playerCount} voted. Close when the count stops moving.`
      if (p === 'closed') return step.hideResults ? 'Results stay hidden for later: just press Next.' : 'Press Reveal results.'
      if (p === 'revealed') return 'Results are on screen. Comment, then Next.'
      return 'Press Open poll.'
    case 'game-round':
      if (p === 'intro') return 'Read the context out loud, then Start round.'
      if (p === 'playing') return 'Round running. It ends by itself when time is up or everyone locked in.'
      if (p === 'heatmap') return 'Comment where people tapped, then Reveal answer.'
      if (p === 'revealed') return step.scored === false ? 'Run the debate, then Next.' : 'Explain the pattern, then Show leaderboard.'
      return 'Top 5 on screen. Next round.'
    case 'qna':
      return 'Highlight one question to show it big; hide off-topic ones.'
    default:
      return 'Talk over the slide, then Next.'
  }
}

function Notes({ md }: { md?: string }) {
  if (!md) return null
  const items = bullets(md)
  return (
    <div className="card" style={{ borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 10, borderColor: '#3A4250' }}>
      <span className="kicker muted" style={{ fontSize: 12 }}>
        SPEAKER NOTES
      </span>
      {items.length ? (
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 17, lineHeight: 1.45 }}>
          {items.map((b, i) => (
            <li key={i}>{inline(b)}</li>
          ))}
        </ul>
      ) : (
        paragraphs(md).map((t, i) => (
          <p key={i} style={{ fontSize: 17, lineHeight: 1.45 }}>
            {inline(t)}
          </p>
        ))
      )}
    </div>
  )
}

/** Live poll counts and round stats, for the host only. */
function Results({ s }: { s: State }) {
  const step = s.fullStep!
  const label = (id: string) => step.elements?.find((e) => e.id === id)?.label ?? id
  let rows: { label: string; n: number; right: boolean }[] = []
  let total = 0
  let title = ''
  if (s.poll && step.options) {
    total = s.poll.answerCount
    title = `LIVE RESULTS · ${total} ANSWERS`
    rows = step.options.map((o) => ({ label: o.label, n: s.poll?.counts?.[o.id] ?? 0, right: o.id === step.correctOptionId }))
  } else if (s.game?.elementCounts) {
    const g = s.game
    total = g.answered ?? 0
    const good = new Set((step.answers ?? []).flat())
    title = `TAPS · ${total} ANSWERS${g.correctPct !== undefined ? ` · ${g.correctPct}% RIGHT` : ''}`
    rows = Object.entries(g.elementCounts ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => ({ label: label(id), n, right: good.has(id) }))
    rows.push({ label: 'No pattern here', n: g.noneCount ?? 0, right: !good.size && step.scored !== false })
  } else return null

  return (
    <div className="card" style={{ borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span className="kicker muted" style={{ fontSize: 12 }}>
        {title}
      </span>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: r.right ? 'var(--green)' : undefined, fontWeight: r.right ? 700 : 400 }}>
              {r.right && <Icon name="check" size={14} />}
              {r.label}
            </span>
            <b className="mono">
              {r.n} · {pct(r.n, total)}%
            </b>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
            <div className="bar-fill" style={{ width: `${pct(r.n, total)}%`, height: '100%', background: r.right ? 'var(--green)' : 'var(--muted)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** "0:25 / 1:00": green within budget, red over it; only the budget for steps not visited yet. */
function StepTime({ used, budget, on }: { used: number; budget: number; on: boolean }) {
  if (!used) return <span className="mono" style={{ fontSize: 12, opacity: 0.7 }}>{budget ? dur(budget) : ''}</span>
  const over = budget > 0 && used > budget
  const color = on ? (over ? '#C0362C' : 'var(--bg)') : over ? 'var(--red)' : 'var(--green)'
  return (
    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color }}>
      {dur(used)}
      {budget > 0 && <span style={{ fontWeight: 400, opacity: 0.7 }}> / {dur(budget)}</span>}
    </span>
  )
}

/** Every step; tap one to jump there (finished polls and rounds keep their results). */
function Outline({ s, onGo, busy }: { s: State; onGo: (i: number) => void; busy: boolean }) {
  const current = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest' })
  }, [s.stepIndex])
  return (
    <div style={{ padding: '20px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 18, fontWeight: 800 }}>All steps</span>
        <span className="muted" style={{ fontSize: 13 }}>
          tap to jump
        </span>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
        {(s.outline ?? []).map((o, i) => {
          const on = i === s.stepIndex
          const done = o.phase === 'revealed' || o.phase === 'leaderboard' || (o.phase === 'closed' && i !== s.stepIndex)
          return (
            <button
              key={i}
              ref={on ? current : undefined}
              disabled={busy || on}
              onClick={() => onGo(i)}
              style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', alignItems: 'center', gap: 8, minHeight: 40, padding: '6px 10px', borderRadius: 10, border: 0, textAlign: 'left', background: on ? 'var(--text)' : 'transparent', color: on ? 'var(--bg)' : i < s.stepIndex ? 'var(--muted)' : 'var(--text)', opacity: 1, font: '500 14px Inter, sans-serif' }}
            >
              <span className="mono" style={{ fontSize: 12 }}>
                {String(i).padStart(2, '0')}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                {done && <Icon name="check" size={13} style={{ color: on ? 'var(--bg)' : 'var(--green)', flex: 'none' }} />}
              </span>
              <StepTime used={spent(s, i)} budget={(o.budgetSec ?? 0) * 1000} on={on} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Count({ n, of, what }: { n: number; of: number; what: string }) {
  return (
    <>
      <b className="mono">
        {n} / {of}
      </b>
      <span className="muted">{what}</span>
      <div style={{ flexBasis: '100%', height: 8, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden' }}>
        <div className="bar-fill" style={{ width: `${pct(n, of)}%`, height: '100%', background: 'var(--text)' }} />
      </div>
    </>
  )
}
