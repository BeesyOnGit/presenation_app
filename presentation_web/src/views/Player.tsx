// Player (/): join with a nickname, then follow the host. Everything comes from `state`.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import FakeScreen from '../screens'
import { emit, serverNow, socket, useServerState, useTick } from '../socket'
import type { Me, State, Step } from '../types'
import { accent, answerLabels, clock, fmt, Icon, letter, pct } from '../ui'

interface Saved {
  room: string
  nickname: string
  token: string
}

const KEY = 'cwc-player'
const load = (): Saved | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}
const store = (s: Saved | null) => {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    // private mode: the player just can't restore after a refresh
  }
}
const OFFLINE = 'No answer from the server'

export default function Player() {
  const [saved, setSaved] = useState<Saved | null>(load)
  const [removed, setRemoved] = useState(false)
  const [notice, setNotice] = useState('')
  const [qna, setQna] = useState(false)

  const forget = () => {
    store(null)
    setSaved(null)
  }

  const { state, setState, connected } = useServerState(() => {
    const s = load()
    if (!s) return
    emit<Saved>('player:join', s)
      .then((r) => {
        const next = { room: s.room, nickname: r.nickname, token: r.token }
        store(next)
        setSaved(next)
      })
      .catch((e: Error) => {
        if (e.message === OFFLINE) return
        forget()
        if (e.message === 'removed') setRemoved(true)
      })
  })

  useEffect(() => {
    const kicked = () => {
      forget()
      setState(null)
      setRemoved(true)
    }
    const ended = () => {
      forget()
      setState(null)
      setNotice('The session ended. Thanks for playing!')
    }
    socket.on('player:removed', kicked)
    socket.on('session:ended', ended)
    return () => {
      socket.off('player:removed', kicked)
      socket.off('session:ended', ended)
    }
  }, [setState])

  if (removed)
    return (
      <Removed
        onRejoin={() => {
          setRemoved(false)
          if (!socket.connected) socket.connect()
        }}
      />
    )

  const me = state?.me
  if (!saved) return <Join notice={notice} onJoined={setSaved} />
  if (!state || !me)
    return (
      <div className="phone">
        <Banner />
        <Waiting title="Watch the big screen" sub={saved.nickname} dim />
      </div>
    )

  const step = state.step
  const gameOn = step.type === 'game-round' && (state.phase === 'playing' || state.phase === 'intro')
  const showQna = step.type === 'qna' || qna

  return (
    <div className="phone">
      {!connected && <Banner />}
      {showQna ? <Qna s={state} me={me} onClose={step.type === 'qna' ? undefined : () => setQna(false)} /> : <StepView s={state} me={me} />}
      {!showQna && !gameOn && (
        <button className="ask-fab" aria-label="Ask a question" onClick={() => setQna(true)}>
          <Icon name="ask" size={18} sw={2.2} />
          Ask
        </button>
      )}
    </div>
  )
}

function StepView({ s, me }: { s: State; me: Me }) {
  const step = s.step
  switch (step.type) {
    case 'poll':
    case 'compare':
      return <Poll s={s} me={me} />
    case 'reveal':
      return s.pollStep && s.poll?.correctOptionId ? <PollReveal s={s} me={me} step={s.pollStep} /> : <Waiting s={s} me={me} />
    case 'game-round':
      return <Game s={s} me={me} />
    case 'leaderboard':
      return <Final me={me} />
    default:
      return step.id === 'game-rules' ? <Rules me={me} /> : <Waiting s={s} me={me} title={step.phone} />
  }
}

// ---- Shell ----

function Top({ me, step, left }: { me: Me; step?: Step; left?: ReactNode }) {
  const p2 = step?.theme === 'part2'
  return (
    <div className="topbar">
      {left ?? (
        <span className="badge" style={p2 ? { background: 'var(--yellow)' } : undefined}>
          CWC
        </span>
      )}
      <span className="who">
        <span className="dot" />
        {me.nickname}
      </span>
    </div>
  )
}

function Banner() {
  return (
    <div className="banner" role="status">
      <span className="spinner" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Reconnecting…</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>Your score and answers are safe.</div>
      </div>
      <Icon name="wifiOff" size={22} sw={2.2} />
    </div>
  )
}

function Screenish({ color = 'var(--text)' }: { color?: string }) {
  return (
    <div style={{ width: 96, height: 72, borderRadius: 10, border: `3px solid ${color}`, position: 'relative' }}>
      <span style={{ position: 'absolute', left: '50%', bottom: -16, width: 32, height: 4, marginLeft: -16, borderRadius: 2, background: color }} />
    </div>
  )
}

function Waiting({ s, me, title, sub, dim }: { s?: State; me?: Me; title?: string; sub?: string; dim?: boolean }) {
  const step = s?.step
  const color = step ? accent(step) : 'var(--red)'
  return (
    <>
      {me && <Top me={me} step={step} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 36, padding: '0 32px 80px', textAlign: 'center', opacity: dim ? 0.55 : 1 }}>
        <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!dim && (
            <>
              <span style={{ position: 'absolute', inset: 0, borderRadius: 80, border: `2px solid ${color}`, animation: 'cwcPulse 2.4s ease-out infinite' }} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: 80, border: `2px solid ${color}`, animation: 'cwcPulse 2.4s ease-out 1.2s infinite' }} />
            </>
          )}
          <Screenish />
        </div>
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em' }}>{title || 'Watch the big screen'}</div>
          <div style={{ fontSize: 17, color: 'var(--muted)', marginTop: 10, lineHeight: 1.45 }}>{sub ?? "Your phone will light up when it's your turn."}</div>
        </div>
        {step && (
          <span className="kicker" style={{ padding: '8px 12px', borderRadius: 999, color, border: `1px solid ${color}` }}>
            {step.theme === 'part2' ? 'PART 2 · CODE BY DESIGN' : 'PART 1 · WHEN CODE BREAKS THE WORLD'}
          </span>
        )}
      </div>
    </>
  )
}

// ---- Join / removed ----

function Join({ notice, onJoined }: { notice: string; onJoined: (s: Saved) => void }) {
  const fromQr = new URLSearchParams(location.search).get('room') ?? ''
  const [room, setRoom] = useState(fromQr.toUpperCase())
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    if (!socket.connected) socket.connect()
    try {
      const r = await emit<Saved>('player:join', { room: room.trim(), nickname: nickname.trim() })
      const saved = { room: room.trim(), nickname: r.nickname, token: r.token }
      store(saved)
      onJoined(saved)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="phone" style={{ padding: '28px 22px' }} onSubmit={submit}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="badge" style={{ fontSize: 14, padding: '6px 10px' }}>
          CWC
        </span>
        <span style={{ fontSize: 15, color: 'var(--muted)' }}>Tech coffee</span>
      </div>
      <h1 style={{ marginTop: 48, fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.02 }}>
        Code With
        <br />
        Consequences<span style={{ color: 'var(--red)' }}>_</span>
      </h1>
      <p style={{ marginTop: 14, fontSize: 17, lineHeight: 1.45, color: 'var(--muted)' }}>Vote, play and ask questions from your phone.</p>
      {notice && (
        <p className="card" style={{ marginTop: 20, padding: 14, fontSize: 15 }}>
          {notice}
        </p>
      )}
      <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, fontWeight: 600, color: 'var(--muted)' }}>
          Room code
          <div className="field">
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
              required
              style={{ font: "800 22px 'JetBrains Mono', monospace", letterSpacing: '0.2em' }}
            />
            {fromQr && room === fromQr.toUpperCase() && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--green)' }}>
                <Icon name="check" size={16} />
                from QR
              </span>
            )}
          </div>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, fontWeight: 600 }}>
          Pick a nickname
          <div className="field">
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={16} autoFocus={!!fromQr} autoComplete="off" required style={{ font: '600 19px Inter, sans-serif' }} />
            <span className="mono muted" style={{ fontSize: 13 }}>
              {nickname.length}/16
            </span>
          </div>
        </label>
        <span style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.45 }}>Shown on the big screen if you make the top 5. No account, nothing stored after the talk.</span>
        {error && (
          <span className="error" role="alert">
            {error}
          </span>
        )}
      </div>
      <button className="btn" style={{ marginTop: 'auto' }} disabled={busy || !nickname.trim() || !room.trim()}>
        Join
        <Icon name="arrow" size={20} sw={2.6} />
      </button>
    </form>
  )
}

function Removed({ onRejoin }: { onRejoin: () => void }) {
  return (
    <div className="phone" style={{ padding: '28px 22px' }}>
      <span className="badge" style={{ alignSelf: 'flex-start' }}>
        CWC
      </span>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="removed" size={34} sw={2} />
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>You've been removed from this session</div>
        <div style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.5 }}>The host removed your nickname. You can join again with a different one.</div>
      </div>
      <button className="btn" onClick={onRejoin}>
        Join with a new nickname
      </button>
    </div>
  )
}

// ---- Polls ----

function Poll({ s, me }: { s: State; me: Me }) {
  const step = s.step
  const [sending, setSending] = useState('')
  const [error, setError] = useState('')
  const open = s.phase === 'open'
  const answer = me.answer
  const options = step.options ?? []

  if (s.phase === 'revealed' && s.poll?.correctOptionId) return <PollReveal s={s} me={me} step={step} />

  const vote = async (optionId: string) => {
    setSending(optionId)
    setError('')
    try {
      await emit('poll:answer', { stepId: step.id, optionId })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending('')
    }
  }

  const status = answer
    ? s.phase === 'revealed'
      ? 'Results are on the big screen'
      : 'Answer sent · wait for the reveal'
    : open
      ? null
      : s.phase === 'waiting' || !s.phase
        ? 'Voting opens in a moment'
        : 'Voting is closed'

  return (
    <>
      <Top me={me} step={step} />
      <div style={{ padding: '28px 20px 0' }}>
        <div className="kicker" style={{ color: accent(step) }}>
          POLL{open && !answer ? ' · TAP ONE' : ''}
          {step.anonymous ? ' · ANONYMOUS' : ''}
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 10, lineHeight: 1.1 }}>{step.question}</div>
        {status && (
          <div
            style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, fontWeight: 700, fontSize: 16, ...(answer ? { background: 'rgba(75,227,160,0.12)', color: 'var(--green)' } : { background: 'var(--surface)', color: 'var(--muted)' }) }}
          >
            {answer && <Icon name="check" size={20} />}
            {status}
          </div>
        )}
      </div>
      <div style={{ marginTop: 'auto', padding: '24px 20px 96px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {options.map((o, i) =>
          answer ? (
            <div
              key={o.id}
              className="option"
              style={answer === o.id ? { background: 'var(--text)', color: 'var(--bg)', border: 0, fontWeight: 700 } : { border: '1.5px solid var(--surface2)', background: 'transparent', color: '#8A939E' }}
            >
              <span className="key" style={answer === o.id ? { background: 'var(--bg)', color: 'var(--text)' } : { background: 'var(--surface)' }}>
                {letter(i)}
              </span>
              <span style={{ flex: 1 }}>{o.label}</span>
              {answer === o.id && (
                <span className="mono" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' }}>
                  YOUR PICK
                </span>
              )}
            </div>
          ) : (
            <button key={o.id} className="option" disabled={!open || !!sending} onClick={() => vote(o.id)} style={sending === o.id ? { borderColor: 'var(--text)' } : undefined}>
              <span className="key">{letter(i)}</span>
              <span>{o.label}</span>
            </button>
          ),
        )}
        {error && (
          <span className="error" role="alert">
            {error}
          </span>
        )}
      </div>
    </>
  )
}

function PollReveal({ s, me, step }: { s: State; me: Me; step: Step }) {
  const poll = s.poll!
  const correct = poll.correctOptionId!
  const label = (id: string | null) => step.options?.find((o) => o.id === id)?.label ?? ''
  const right = me.answer === correct
  return (
    <>
      <Top me={me} step={s.step} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px 80px', gap: 24 }}>
        <div className="pop" style={{ width: 88, height: 88, borderRadius: 44, background: right ? 'var(--green)' : me.answer ? 'var(--error)' : 'var(--surface2)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {me.answer ? <Icon name={right ? 'check' : 'x'} size={46} /> : <Screenish color="var(--muted)" />}
        </div>
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05 }}>{right ? 'Right. You called it.' : me.answer ? 'Not this time.' : "You didn't vote."}</div>
        {me.answer && !right && <div style={{ fontSize: 17, color: 'var(--muted)' }}>You picked: {label(me.answer)}</div>}
        <div className="card" style={{ padding: 18 }}>
          <div className="kicker muted" style={{ fontSize: 12 }}>
            ANSWER
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{label(correct)}</div>
          <div style={{ fontSize: 15, color: 'var(--muted)', marginTop: 8 }}>
            {pct(poll.counts?.[correct] ?? 0, poll.answerCount)}% of the room got it. Polls aren't scored.
          </div>
        </div>
      </div>
    </>
  )
}

// ---- Game ----

function Rules({ me }: { me: Me }) {
  const rows: [string, string, string][] = [
    ['Correct', '+100', 'var(--green)'],
    ['Speed bonus', 'up to +50', 'var(--yellow)'],
    ['Wrong', '−50', 'var(--error)'],
    ['No answer', '0', 'var(--muted)'],
  ]
  const steps = ['A real-looking app appears. Tap the element that manipulates you.', <>Hit <b>Lock in</b>. Can't change after that.</>, <>Some screens are clean. Then tap <b>No pattern here</b>.</>]
  return (
    <>
      <Top me={me} step={{ theme: 'part2' } as Step} />
      <div style={{ padding: '26px 20px 100px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="kicker" style={{ color: 'var(--yellow)' }}>
          GET READY · 8 ROUNDS
        </div>
        <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
          Spot the
          <br />
          Dark Pattern
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          {steps.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', fontSize: 16, lineHeight: 1.4 }}>
              <span style={{ width: 30, height: 30, flex: 'none', borderRadius: 8, background: 'var(--yellow)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "800 14px 'JetBrains Mono', monospace" }}>{i + 1}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: '6px 16px', fontSize: 15 }}>
          {rows.map(([k, v, c], i) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--surface2)' : undefined }}>
              <span>{k}</span>
              <b className="mono" style={{ color: c }}>
                {v}
              </b>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>30 seconds per round. Only the top 5 are named on screen.</div>
      </div>
    </>
  )
}

function Game({ s, me }: { s: State; me: Me }) {
  const step = s.step
  const g = s.game
  const playing = s.phase === 'playing'
  useTick(playing)
  const now = serverNow()
  const max = step.maxSelections ?? 1
  const done = me.locks.length >= max || me.locks.includes('none')

  if (!g || s.phase === 'intro') return <Countdown step={step} count={null} />
  if (playing && g.roundStartedAt && now < g.roundStartedAt) return <Countdown step={step} count={Math.ceil((g.roundStartedAt - now) / 1000)} />
  if (playing && !done) return <Play s={s} me={me} now={now} />
  if (playing || s.phase === 'heatmap') return <Locked s={s} me={me} now={now} />
  return <Result s={s} me={me} />
}

function Countdown({ step, count }: { step: Step; count: number | null }) {
  return (
    <div style={{ flex: 1, minHeight: '100dvh', background: 'var(--yellow)', color: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '0 28px', textAlign: 'center' }}>
      <span className="mono" style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.14em', padding: '8px 14px', borderRadius: 999, background: 'var(--bg)', color: 'var(--yellow)' }}>
        ROUND {step.round} / 8{step.maxSelections === 2 ? ' · BONUS' : ''}
      </span>
      <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>{step.product}</div>
      <div style={{ fontSize: 19, fontWeight: 500 }}>{step.context}.</div>
      <div key={count ?? 'ready'} className="pop mono" style={{ width: 200, height: 200, borderRadius: 100, border: '10px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: count ? 120 : 34, fontWeight: 800, lineHeight: 1 }}>
        {count ?? 'READY'}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>Thumbs ready.</div>
    </div>
  )
}

function TimerHead({ step, s, now }: { step: Step; s: State; now: number }) {
  const total = (step.durationSec ?? 30) * 1000
  const left = Math.max(0, (s.game?.roundEndsAt ?? now) - now)
  return (
    <div style={{ height: 50, flex: 'none', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
      <span className="kicker" style={{ color: 'var(--yellow)', fontWeight: 800, letterSpacing: '0.08em' }}>
        ROUND {step.round} / 8
      </span>
      <span className="mono" style={{ fontSize: 20, fontWeight: 800, color: left < 5000 ? 'var(--red)' : undefined }}>
        {clock(left)}
      </span>
      <div className="timerbar">
        <div style={{ width: `${(left / total) * 100}%`, background: left < 5000 ? 'var(--red)' : undefined }} />
      </div>
    </div>
  )
}

/** Width of the element: the 390×844 screen fills it edge to edge and scrolls vertically if taller. */
function useFitWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function Play({ s, me, now }: { s: State; me: Me; now: number }) {
  const step = s.step
  const [area, width] = useFitWidth()
  const [pick, setPick] = useState<{ id: string; x: number; y: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const max = step.maxSelections ?? 1
  const zones = (step.elements ?? []).map((e) => e.id).filter((id) => !me.locks.includes(id))

  const lock = async (elementId: string) => {
    setBusy(true)
    setError('')
    try {
      await emit('game:lock', elementId === 'none' ? { stepId: step.id, elementId } : { stepId: step.id, elementId, x: pick?.x, y: pick?.y })
      setPick(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const hint = error || (pick ? `${step.elements?.find((e) => e.id === pick.id)?.label ?? '1 element'} selected · tap again to clear` : max > 1 ? `Bonus: find both · ${me.locks.length} of ${max} locked` : 'Tap the manipulative element')

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TimerHead step={step} s={s} now={now} />
      <div ref={area} style={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', display: 'flex', justifyContent: 'center', background: 'var(--surface)' }}>
        {width > 0 && <FakeScreen name={step.screenComponent ?? ''} width={width} zones={zones} selected={pick?.id} locked={me.locks} onTap={(id, x, y) => setPick((p) => (p?.id === id ? null : { id, x, y }))} />}
      </div>
      <div style={{ flex: 'none', padding: '12px 16px 22px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg)', borderTop: '1px solid var(--surface2)' }}>
        <div role={error ? 'alert' : undefined} style={{ fontSize: 13, color: error ? 'var(--error)' : 'var(--muted)', textAlign: 'center' }}>
          {hint}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <button className="btn btn-ghost" style={{ height: 56, fontSize: 16, borderWidth: 2, borderRadius: 14 }} disabled={busy || me.locks.length > 0} onClick={() => lock('none')}>
            No pattern here
          </button>
          <button className="btn btn-yellow" style={{ height: 56, fontSize: 17, borderRadius: 14 }} disabled={busy || !pick} onClick={() => pick && lock(pick.id)}>
            <Icon name="lock" size={18} sw={2.6} />
            Lock in
          </button>
        </div>
      </div>
    </div>
  )
}

function Locked({ s, me, now }: { s: State; me: Me; now: number }) {
  const step = s.step
  const g = s.game!
  const over = s.phase === 'heatmap'
  const none = me.locks.length === 0
  return (
    <>
      {over ? <Top me={me} step={step} /> : <TimerHead step={step} s={s} now={now} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: '0 30px 80px', textAlign: 'center' }}>
        <div className="pop" style={{ width: 112, height: 112, borderRadius: 28, background: none ? 'var(--surface2)' : 'var(--yellow)', color: none ? 'var(--muted)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: none ? undefined : '0 8px 0 #8FA51C' }}>
          <Icon name={none ? 'x' : 'lock'} size={56} sw={2.4} />
        </div>
        <div>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em' }}>{none ? "Time's up" : 'Locked in'}</div>
          <div style={{ fontSize: 17, color: 'var(--muted)', marginTop: 8 }}>{over ? 'Look at the big screen: where did everyone tap?' : 'Waiting for the others'}</div>
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
            <span className="muted">Room</span>
            <span className="mono" style={{ fontWeight: 700 }}>
              {g.lockedCount} / {s.playerCount} locked
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: 'var(--surface2)', overflow: 'hidden' }}>
            <div className="bar-fill" style={{ width: `${pct(g.lockedCount, s.playerCount)}%`, height: '100%', background: 'var(--text)' }} />
          </div>
        </div>
      </div>
    </>
  )
}

function Result({ s, me }: { s: State; me: Me }) {
  const step = s.step
  const r = me.result
  const points = r?.points ?? 0
  const answers = step.answers ?? []
  const clean = !answers.length
  const debate = step.scored === false
  const missed = me.locks.length === 0
  const picked = me.locks.map((id) => (id === 'none' ? '"No pattern here"' : step.elements?.find((e) => e.id === id)?.label ?? id)).join(' and ')
  const labels = answerLabels(step)
  const trick = clean ? (
    'This screen was clean.'
  ) : (
    <>
      The{' '}
      {labels.map((l, i) => (
        <span key={l}>
          {i > 0 && ' and the '}
          <b>{l}</b>
        </span>
      ))}{' '}
      {labels.length > 1 ? 'were' : 'was'} the trick.
    </>
  )
  const base = 100 * Math.max(1, answers.length)

  let badge: [string, string, string] // text, color, background
  let big: string
  let detail: ReactNode = null
  if (debate) {
    badge = ['Debate round · not scored', 'var(--yellow)', 'rgba(230,255,74,0.12)']
    big = '0'
    detail = missed ? 'You sat this one out.' : <>You picked {picked}.</>
  } else if (missed) {
    badge = ['Time ran out', 'var(--muted)', 'var(--surface2)']
    big = '0'
    detail = <>No answer, no penalty. {trick}</>
  } else if (r?.correct) {
    badge = ['Spotted it', 'var(--green)', 'rgba(75,227,160,0.14)']
    big = `+${points}`
  } else if (points > 0) {
    badge = ['Partly right', 'var(--yellow)', 'rgba(230,255,74,0.12)']
    big = `+${points}`
    detail = <>You picked {picked}. {trick}</>
  } else {
    badge = ['Not quite', 'var(--error)', 'rgba(255,138,122,0.14)']
    big = String(points).replace('-', '−')
    detail = <>You picked {picked}. {trick}</>
  }

  return (
    <>
      <Top me={me} step={step} left={<span className="kicker" style={{ color: 'var(--yellow)', fontWeight: 800 }}>ROUND {step.round} RESULT</span>} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, padding: '24px 22px 96px' }}>
        <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: badge[2], color: badge[1], fontWeight: 800, fontSize: 16 }}>
          {!debate && !missed && <Icon name={points > 0 ? 'check' : 'x'} size={18} />}
          {badge[0]}
        </div>
        <div className="mono pop" style={{ fontSize: 112, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.9, color: points > 0 ? 'var(--yellow)' : points < 0 ? 'var(--error)' : 'var(--muted)' }}>
          {big}
        </div>
        {r?.correct && points > base && (
          <div className="mono muted" style={{ fontSize: 16 }}>
            {base} correct + {points - base} speed bonus
          </div>
        )}
        {detail && <div style={{ fontSize: 16, lineHeight: 1.45 }}>{detail}</div>}
        <div className="card" style={{ padding: 16, fontSize: 16, lineHeight: 1.45 }}>
          <b>{step.patternName}.</b> {step.explanation}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderRadius: 16, background: 'var(--text)', color: 'var(--bg)' }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>
            You're <span className="mono">#{me.rank ?? '–'}</span> of {me.total}
          </span>
          <span className="mono" style={{ fontWeight: 800 }}>
            {fmt(me.score)} pts
          </span>
        </div>
      </div>
    </>
  )
}

function Final({ me }: { me: Me }) {
  return (
    <>
      <Top me={me} left={<span className="kicker" style={{ color: 'var(--yellow)', fontWeight: 800 }}>FINAL</span>} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, padding: '0 22px 90px' }}>
        <Icon name="crown" size={64} sw={1.8} style={{ color: 'var(--yellow)' }} />
        <div>
          <div style={{ fontSize: 18, color: 'var(--muted)' }}>You finished</div>
          <div className="mono pop" style={{ fontSize: 120, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.9, color: 'var(--yellow)' }}>
            #{me.rank ?? '–'}
          </div>
          <div style={{ fontSize: 18, color: 'var(--muted)', marginTop: 8 }}>of {me.total} players</div>
        </div>
        <div className="card" style={{ padding: 14, borderRadius: 14 }}>
          <div className="mono" style={{ fontSize: 22, fontWeight: 800 }}>
            {fmt(me.score)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>points</div>
        </div>
        <div style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--muted)' }}>Next time a timer says "09:59", reload the page.</div>
      </div>
    </>
  )
}

// ---- Q&A ----

function Qna({ s, me, onClose }: { s: State; me: Me; onClose?: () => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const ask = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await emit('qna:ask', { text: text.trim() })
      setText('')
      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const upvote = (questionId: number) => emit('qna:upvote', { questionId }).catch((err: Error) => setError(err.message))

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar" style={{ justifyContent: 'flex-start', padding: '0 12px' }}>
        {onClose && (
          <button className="icon-btn" aria-label="Close questions" style={{ color: 'var(--text)' }} onClick={onClose}>
            <Icon name="x" size={22} sw={2.4} />
          </button>
        )}
        <span style={{ fontSize: 18, fontWeight: 800, paddingLeft: onClose ? 0 : 6 }}>Questions</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)', paddingRight: 8 }}>Anonymous</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {s.questions.map((q) => {
          const mine = me.upvoted.includes(q.id)
          return (
            <div key={q.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 14, borderColor: q.id === s.highlightedQuestionId ? 'var(--yellow)' : undefined }}>
              <div style={{ flex: 1, fontSize: 16, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{q.text}</div>
              <button
                aria-label={mine ? 'Upvoted' : 'Upvote'}
                disabled={mine}
                onClick={() => upvote(q.id)}
                style={{ width: 52, minHeight: 52, flex: 'none', borderRadius: 12, border: mine ? 0 : '1.5px solid var(--line)', background: mine ? 'var(--yellow)' : 'transparent', color: mine ? 'var(--bg)' : 'var(--text)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', font: "800 15px 'JetBrains Mono', monospace", opacity: 1 }}
              >
                <Icon name="caret" size={18} />
                {q.votes}
              </button>
            </div>
          )
        })}
        {!s.questions.length && <div style={{ color: 'var(--muted)', textAlign: 'center', marginTop: 40 }}>No questions yet. Be the first.</div>}
      </div>
      <form onSubmit={ask} style={{ flex: 'none', padding: '12px 16px 22px', borderTop: '1px solid var(--surface2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}>
            <span>Ask the speaker</span>
            <span className="mono">{text.length} / 200</span>
          </span>
          <textarea
            rows={2}
            maxLength={200}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setSent(false)
            }}
            style={{ resize: 'none', borderRadius: 14, border: '2px solid var(--line)', background: 'var(--surface)', color: 'var(--text)', padding: '12px 14px', font: '400 16px Inter, sans-serif', outline: 'none' }}
          />
        </label>
        {(error || sent) && (
          <span className={error ? 'error' : undefined} role="status" style={sent && !error ? { color: 'var(--green)', fontSize: 15, fontWeight: 600 } : undefined}>
            {error || 'Question sent.'}
          </span>
        )}
        <button className="btn" style={{ height: 54, fontSize: 17, borderRadius: 14 }} disabled={busy || !text.trim()}>
          Send question
        </button>
      </form>
    </div>
  )
}
