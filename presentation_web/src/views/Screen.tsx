// Big screen (/screen): 1920×1080, scaled to the window. Renders only what the server sends.
import QRCode from 'qrcode'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import FakeScreen from '../screens'
import { emit, serverNow, useServerState, useTick } from '../socket'
import type { Choice, Row, State, Step } from '../types'
import { accent, bullets, fmt, Icon, inline, letter, paragraphs, pct } from '../ui'

const MONO: CSSProperties = { fontFamily: 'var(--mono)' }
const pad = (n: number) => String(n).padStart(2, '0')

export default function Screen() {
  const { state } = useServerState(() => emit('screen:join', {}).catch(() => {}))
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const fit = () => setScale(Math.min(innerWidth / 1920, innerHeight / 1080))
    fit()
    addEventListener('resize', fit)
    return () => removeEventListener('resize', fit)
  }, [])

  return (
    <div className="stage-wrap" onDoubleClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
      <div className="stage" style={{ transform: `scale(${scale})` }}>
        {state ? <StepView s={state} /> : <Center>Connecting…</Center>}
      </div>
    </div>
  )
}

function StepView({ s }: { s: State }) {
  const step = s.step
  switch (step.type) {
    case 'lobby':
      return <Lobby s={s} />
    case 'poll':
      return s.phase === 'revealed' ? <PollReveal s={s} step={step} /> : <LivePoll s={s} />
    case 'compare':
      return <Compare s={s} />
    case 'reveal':
      return step.code ? <CodeReveal s={s} /> : <PollReveal s={s} step={s.pollStep ?? step} />
    case 'game-round':
      return <Game s={s} />
    case 'leaderboard':
      return <Podium s={s} />
    case 'qna':
      return <QnaWall s={s} />
    default:
      return step.id === 'title' ? <Title s={s} /> : bullets(step.body).length ? <Story s={s} /> : <Section s={s} />
  }
}

// ---- Shared bits ----

function Center({ children }: { children: ReactNode }) {
  return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, color: 'var(--muted)' }}>{children}</div>
}

function Footer({ s, join = true }: { s: State; join?: boolean }) {
  const last = Math.max(1, s.stepCount - 1)
  return (
    <div className="footer">
      <span>
        ROOM <b>{s.room}</b>
      </span>
      {join && (
        <span>
          join at <b>{location.host}/?room={s.room}</b>
        </span>
      )}
      <span style={{ marginLeft: 'auto' }}>
        <b>{s.playerCount}</b> players
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 220, height: 6, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}>
          <div className="bar-fill" style={{ width: `${(s.stepIndex / last) * 100}%`, height: '100%', background: accent(s.step) }} />
        </div>
        <span>
          {pad(s.stepIndex)} / {pad(last)}
        </span>
      </div>
    </div>
  )
}

function PartPill({ step }: { step: Step }) {
  const p2 = step.theme === 'part2'
  const c = p2 ? '230,255,74' : '255,90,78'
  return (
    <span className="pill" style={{ background: `rgba(${c},0.14)`, color: accent(step), border: `1px solid rgba(${c},0.45)` }}>
      ● {p2 ? 'PART 2 · BY DESIGN' : 'PART 1 · ACCIDENTS'}
    </span>
  )
}

/** Horizontal bar rows for a poll. `counts` null = results hidden. */
function Bars({ options, counts, total, correct }: { options: Choice[]; counts: Record<string, number> | null; total: number; correct?: string | null }) {
  const max = Math.max(1, ...options.map((o) => counts?.[o.id] ?? 0))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, justifyContent: 'center' }}>
      {options.map((o, i) => {
        const n = counts?.[o.id] ?? 0
        const right = correct === o.id
        return (
          <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 140px', gap: 28, alignItems: 'center' }}>
            <span style={{ ...MONO, width: 72, height: 72, borderRadius: 16, background: right ? 'var(--green)' : 'var(--surface2)', color: right ? 'var(--bg)' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 800 }}>
              {right ? <Icon name="check" size={40} /> : letter(i)}
            </span>
            <div style={{ position: 'relative', height: 100, borderRadius: 16, background: 'var(--surface)', overflow: 'hidden', boxShadow: right ? '0 0 0 3px var(--green)' : undefined }}>
              <div className="bar-fill" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: counts ? `${(n / max) * 100}%` : 0, background: right ? 'rgba(75, 227, 160, 0.35)' : correct ? '#22272F' : 'var(--line)', borderRadius: 16 }} />
              {/* Light text: the fill is as wide as the votes, so it may not sit under the label */}
              <span style={{ position: 'absolute', inset: '0 32px', display: 'flex', alignItems: 'center', gap: 18, fontSize: 42, fontWeight: 600, color: right ? 'var(--text)' : correct ? 'var(--muted)' : undefined }}>
                <span style={{ flex: 1 }}>{o.label}</span>
                {right && <span style={{ ...MONO, fontSize: 22, fontWeight: 800, letterSpacing: '0.12em', padding: '6px 12px', borderRadius: 8, background: 'var(--bg)', color: 'var(--green)' }}>CORRECT</span>}
              </span>
            </div>
            <span style={{ ...MONO, fontSize: 44, fontWeight: 800, textAlign: 'right' }}>{counts ? (correct !== undefined ? `${pct(n, total)}%` : n) : '–'}</span>
          </div>
        )
      })}
    </div>
  )
}

// ---- Slides ----

function Lobby({ s }: { s: State }) {
  const url = `${location.origin}/?room=${s.room}`
  const [qr, setQr] = useState('')
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 0, width: 512, color: { dark: '#0A0C0F', light: '#FFFFFF' } }).then(setQr, () => setQr(''))
  }, [url])
  const names = s.lobby ?? []

  return (
    <>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 640px', gap: 96, padding: '88px 104px 48px', minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ ...MONO, fontSize: 24, letterSpacing: '0.16em', color: 'var(--muted)' }}>TECH COFFEE · CODE WITH CONSEQUENCES</div>
          <h1 style={{ marginTop: 28, fontSize: 92, lineHeight: 0.98, fontWeight: 800, letterSpacing: '-0.035em' }}>
            Grab your phone
            <br />
            or laptop.
            <br />
            <span style={{ color: 'var(--yellow)' }}>Pick a nickname.</span>
          </h1>
          <div style={{ marginTop: 48, display: 'flex', gap: 40, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 28, color: 'var(--muted)' }}>Room code</div>
              <div style={{ ...MONO, fontSize: 120, fontWeight: 800, letterSpacing: '0.12em', lineHeight: 1 }}>{s.room}</div>
            </div>
            <div style={{ paddingBottom: 14, minWidth: 0 }}>
              <div style={{ fontSize: 28, color: 'var(--muted)' }}>or go to</div>
              <div style={{ ...MONO, fontSize: 36, fontWeight: 700, whiteSpace: 'nowrap' }}>{url.replace(/^https?:\/\//, '')}</div>
            </div>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--green)', boxShadow: '0 0 0 8px rgba(75,227,160,0.18)' }} />
              <span style={{ ...MONO, fontSize: 40, fontWeight: 800 }}>{s.playerCount}</span>
              <span style={{ fontSize: 32, color: 'var(--muted)' }}>players in the room</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, maxHeight: 172, overflow: 'hidden' }}>
              {names.map((n) => (
                <span key={n} className="pop" style={{ ...MONO, fontSize: 26, fontWeight: 500, padding: '12px 22px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)' }}>
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 600, height: 600, background: '#FFFFFF', borderRadius: 32, padding: 44 }}>
            {qr && <img src={qr} alt={`QR code for ${url}`} style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />}
          </div>
          <div style={{ fontSize: 28, color: 'var(--muted)' }}>Scan with your phone, or type the link on a laptop</div>
        </div>
      </div>
      <div className="footer">
        <span>Starts in a moment</span>
        <span style={{ marginLeft: 'auto' }}>
          {pad(s.stepIndex)} / {pad(s.stepCount - 1)}
        </span>
      </div>
    </>
  )
}

function Title({ s }: { s: State }) {
  const [sub, by] = paragraphs(s.step.body)
  return (
    <>
      <div className="grid-bg" style={{ opacity: 0.9 }} />
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 140px', gap: 40 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <span className="pill" style={{ color: 'var(--red)', border: '1px solid rgba(255,90,78,0.5)' }}>PART 1 · ACCIDENTS</span>
          <span className="pill" style={{ color: 'var(--yellow)', border: '1px solid rgba(230,255,74,0.5)' }}>PART 2 · BY DESIGN</span>
        </div>
        <h1 style={{ fontSize: 196, lineHeight: 0.9, fontWeight: 800, letterSpacing: '-0.045em', maxWidth: 1500 }}>
          {s.step.title}
          <span style={{ color: 'var(--red)' }}>_</span>
        </h1>
        {sub && <p style={{ fontSize: 44, lineHeight: 1.3, color: 'var(--muted)', maxWidth: 1300 }}>{inline(sub)}</p>}
        {by && <div style={{ ...MONO, fontSize: 30 }}>{by}</div>}
      </div>
      <Footer s={s} />
    </>
  )
}

function Section({ s }: { s: State }) {
  return (
    <>
      <div className="grid-bg" style={{ opacity: 0.9 }} />
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 140px', gap: 48 }}>
        <PartPill step={s.step} />
        <h1 style={{ fontSize: 140, lineHeight: 0.95, fontWeight: 800, letterSpacing: '-0.04em', maxWidth: 1600 }}>{s.step.title}</h1>
        {paragraphs(s.step.body).map((p, i) => (
          <p key={i} style={{ fontSize: 52, lineHeight: 1.3, color: 'var(--muted)', maxWidth: 1400 }}>
            {inline(p)}
          </p>
        ))}
      </div>
      <Footer s={s} />
    </>
  )
}

/** Headline + up to ~4 short facts, the numbers in the accent color. */
function Story({ s }: { s: State }) {
  const step = s.step
  const color = accent(step)
  return (
    <>
      <div style={{ height: 8, flex: 'none', background: `repeating-linear-gradient(135deg, ${color} 0 24px, var(--bg) 24px 48px)` }} />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '640px 1fr', gap: 96, padding: '88px 104px 56px', minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36, borderRight: '1px solid var(--line)', paddingRight: 64 }}>
          <PartPill step={step} />
          <h2 style={{ fontSize: 88, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.03em' }}>{step.title}</h2>
          {paragraphs(step.body).map((p, i) => (
            <p key={i} style={{ fontSize: 32, lineHeight: 1.4, color: 'var(--muted)' }}>
              {inline(p)}
            </p>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 44 }}>
          {bullets(step.body).map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 28, alignItems: 'baseline' }}>
              <span style={{ ...MONO, fontSize: 28, color }}>{pad(i + 1)}</span>
              <span className="accent-b" style={{ fontSize: 52, lineHeight: 1.25, fontWeight: 500 }}>
                {inline(b)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style>{`.accent-b b{color:${color};font-family:var(--mono);font-weight:800}`}</style>
      <Footer s={s} />
    </>
  )
}

// ---- Polls ----

function LivePoll({ s }: { s: State }) {
  const step = s.step
  const poll = s.poll
  const n = poll?.answerCount ?? 0
  const status = s.phase === 'open' ? 'VOTING OPEN' : s.phase === 'closed' ? 'VOTING CLOSED' : 'VOTING OPENS SOON'
  const live = s.phase === 'open'
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '80px 104px 56px', gap: 56, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...MONO, fontSize: 24, fontWeight: 700, letterSpacing: '0.14em', color: accent(step) }}>POLL{step.anonymous ? ' · ANONYMOUS' : ''}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 14, ...MONO, fontSize: 28 }}>
            <span style={{ width: 16, height: 16, borderRadius: 8, background: live ? 'var(--green)' : 'var(--line)', boxShadow: live ? '0 0 0 8px rgba(75,227,160,0.18)' : undefined }} />
            {status} · answers: <b>{n}</b> / {s.playerCount}
          </span>
        </div>
        <h2 style={{ fontSize: 104, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{step.question}</h2>
        <Bars options={step.options ?? []} counts={poll?.counts ?? null} total={n} />
        {!poll?.counts && <div style={{ fontSize: 32, color: 'var(--muted)', textAlign: 'center' }}>Results stay hidden until the reveal.</div>}
      </div>
      <Footer s={s} />
    </>
  )
}

function PollReveal({ s, step }: { s: State; step: Step }) {
  const poll = s.poll
  const notes = s.step.type === 'reveal' ? bullets(s.step.body) : []
  return (
    <>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: notes.length ? '1fr 680px' : '1fr', gap: 80, padding: '80px 104px 56px', minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, minWidth: 0 }}>
          <span style={{ ...MONO, fontSize: 24, fontWeight: 700, letterSpacing: '0.14em', color: accent(step) }}>
            {poll?.correctOptionId ? 'THE ANSWER' : 'RESULTS'} · {poll?.answerCount ?? 0} ANSWERS
          </span>
          <h2 style={{ fontSize: 80, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{step.question}</h2>
          <Bars options={step.options ?? []} counts={poll?.counts ?? {}} total={poll?.answerCount ?? 0} correct={poll?.correctOptionId ?? null} />
        </div>
        {notes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 24, padding: 48 }}>
            <div style={{ ...MONO, fontSize: 22, letterSpacing: '0.14em', color: 'var(--muted)' }}>POST-MORTEM · {s.step.title.split(':')[0].toUpperCase()}</div>
            {notes.map((b, i) => (
              <div key={i} className="accent-b" style={{ fontSize: 36, lineHeight: 1.35, fontWeight: 600, paddingTop: i ? 26 : 0, borderTop: i ? '1px solid var(--line)' : undefined }}>
                {inline(b)}
              </div>
            ))}
            <style>{`.accent-b b{color:${accent(s.step)};font-family:var(--mono);font-weight:800}`}</style>
          </div>
        )}
      </div>
      <Footer s={s} />
    </>
  )
}

function highlight(code: string) {
  return code.split(/(\b(?:function|var|let|const|if|while|for|return)\b|'[^']*'|"[^"]*")/g).map((t, i) =>
    /^['"]/.test(t) ? (
      <span key={i} style={{ color: 'var(--green)' }}>{t}</span>
    ) : /^(function|var|let|const|if|while|for|return)$/.test(t) ? (
      <span key={i} style={{ color: 'var(--red)' }}>{t}</span>
    ) : (
      t
    ),
  )
}

/** left-pad reveal: our dependency count, the 11-line function, the lesson. */
function CodeReveal({ s }: { s: State }) {
  const step = s.step
  const poll = s.poll
  const lines = (step.code ?? '').split('\n')
  const right = poll?.correctOptionId ? pct(poll.counts?.[poll.correctOptionId] ?? 0, poll.answerCount) : null
  return (
    <>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 960px', gap: 88, padding: '80px 104px 56px', minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, minWidth: 0 }}>
          <PartPill step={step} />
          <div style={{ fontSize: 36, color: 'var(--muted)' }}>Our project depends on</div>
          <div style={{ ...MONO, fontSize: 168, fontWeight: 800, lineHeight: 0.9, letterSpacing: '-0.04em', color: 'var(--red)' }}>{fmt(s.dependencyCount ?? 0)}</div>
          <div style={{ fontSize: 36, color: 'var(--muted)' }}>packages.</div>
          {right !== null && (
            <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 14, padding: '14px 22px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)', fontSize: 30 }}>
              <Icon name="check" size={28} style={{ color: 'var(--green)' }} />
              <span>
                <b>{right}%</b> of you guessed the right range
              </span>
            </div>
          )}
          <div style={{ marginTop: 'auto', fontSize: 52, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{inline(paragraphs(step.body)[0] ?? '')}</div>
        </div>
        <div style={{ alignSelf: 'center', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--line)', overflow: 'hidden' }}>
          <div style={{ height: 64, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)', ...MONO, fontSize: 22, color: 'var(--muted)' }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: 'var(--red)' }} />
            <span style={{ width: 14, height: 14, borderRadius: 7, background: 'var(--line)' }} />
            <span style={{ width: 14, height: 14, borderRadius: 7, background: 'var(--line)' }} />
            <span style={{ marginLeft: 16 }}>left-pad/index.js · {lines.length} lines · unpublished March 2016</span>
          </div>
          <div style={{ display: 'flex', padding: '28px 0', ...MONO, fontSize: 30, lineHeight: 1.55 }}>
            <div style={{ padding: '0 24px 0 28px', color: '#4A525E', textAlign: 'right', whiteSpace: 'pre' }}>{lines.map((_, i) => i + 1).join('\n')}</div>
            <div style={{ whiteSpace: 'pre', paddingRight: 28 }}>{highlight(step.code ?? '')}</div>
          </div>
        </div>
      </div>
      <Footer s={s} />
    </>
  )
}

function Compare({ s }: { s: State }) {
  const step = s.step
  const options = step.options ?? []
  const before = s.before?.counts ?? {}
  const after = s.poll?.counts ?? {}
  const total = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0)
  const [tb, ta] = [total(before), total(after)]
  const fills = ['var(--red)', 'var(--yellow)', 'var(--green)', 'var(--muted)']
  const deltas = options.map((o) => ({ o, d: pct(after[o.id] ?? 0, ta) - pct(before[o.id] ?? 0, tb) }))
  const moved = deltas.reduce((a, b) => (b.d > a.d ? b : a), { o: options[0], d: 0 })

  const chart = (title: string, sub: string, counts: Record<string, number>, n: number) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 24, padding: 44 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 44, fontWeight: 800 }}>{title}</span>
        <span style={{ ...MONO, fontSize: 24, color: 'var(--muted)' }}>{sub}</span>
      </div>
      {options.map((o, i) => (
        <div key={o.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 32 }}>
            <span>{o.label}</span>
            <b style={MONO}>{pct(counts[o.id] ?? 0, n)}%</b>
          </div>
          <div style={{ height: 64, borderRadius: 12, background: 'var(--bg)', overflow: 'hidden' }}>
            <div className="bar-fill" style={{ height: '100%', width: `${pct(counts[o.id] ?? 0, n)}%`, background: fills[i % fills.length], borderRadius: 12 }} />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '72px 104px 56px', gap: 48, minHeight: 0 }}>
        <div>
          <div style={{ ...MONO, fontSize: 24, fontWeight: 700, letterSpacing: '0.14em', color: accent(step) }}>
            {step.question?.toUpperCase()} · AGAIN {s.phase === 'open' && `· VOTING OPEN · ${ta} / ${s.playerCount}`}
          </div>
          <h2 style={{ marginTop: 20, fontSize: 96, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>Did the room change its mind?</h2>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 64 }}>
          {chart('Before', `${tb} votes`, before, tb)}
          {chart('After', `${ta} votes`, after, ta)}
        </div>
        {ta > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 40, fontWeight: 700 }}>
            {moved.d > 0 ? (
              <>
                <span style={{ ...MONO, fontSize: 48, fontWeight: 800, color: 'var(--bg)', background: 'var(--yellow)', padding: '6px 18px', borderRadius: 12 }}>+{moved.d} pts</span>
                <span>moved toward "{moved.o.label}"</span>
              </>
            ) : (
              <span>The room held its ground.</span>
            )}
          </div>
        )}
      </div>
      <Footer s={s} />
    </>
  )
}

// ---- Game rounds ----

function Game({ s }: { s: State }) {
  const g = s.game
  const playing = s.phase === 'playing'
  useTick(playing)
  if (!g || s.phase === 'intro') return <RoundIntro s={s} count={null} />
  if (playing) {
    const now = serverNow()
    if (g.roundStartedAt && now < g.roundStartedAt) return <RoundIntro s={s} count={Math.ceil((g.roundStartedAt - now) / 1000)} />
    return <GamePlay s={s} now={now} />
  }
  if (s.phase === 'heatmap') return <Heatmap s={s} />
  if (s.phase === 'leaderboard') return <MiniLeaderboard s={s} rows={g.leaderboard ?? []} />
  return <PatternReveal s={s} />
}

const roundTag = (step: Step) => `ROUND ${step.round} / 8`

function YellowTag({ children, size = 28 }: { children: ReactNode; size?: number }) {
  return <span style={{ alignSelf: 'flex-start', ...MONO, fontSize: size, fontWeight: 800, letterSpacing: '0.12em', padding: '10px 20px', borderRadius: 999, background: 'var(--yellow)', color: 'var(--bg)' }}>{children}</span>
}

function RoundIntro({ s, count }: { s: State; count: number | null }) {
  const step = s.step
  return (
    <>
      <div className="dots-bg" />
      <div style={{ position: 'relative', flex: 1, display: 'grid', gridTemplateColumns: '1fr 560px', alignItems: 'center', gap: 80, padding: '0 140px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          <YellowTag size={32}>
            {roundTag(step)}
            {step.scored === false ? ' · DEBATE' : step.maxSelections === 2 ? ' · BONUS' : ''}
          </YellowTag>
          <div style={{ fontSize: 180, fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.9 }}>{step.product}</div>
          <div style={{ fontSize: 56, color: 'var(--muted)', fontWeight: 500 }}>{step.context}.</div>
          <div style={{ display: 'flex', gap: 20, marginTop: 16, fontSize: 32 }}>
            <span style={{ padding: '14px 22px', borderRadius: 14, border: '2px solid var(--line)' }}>Tap it · Lock in</span>
            <span style={{ padding: '14px 22px', borderRadius: 14, border: '2px solid var(--line)' }}>or "No pattern here"</span>
          </div>
        </div>
        <div
          key={count ?? 'ready'}
          className="pop"
          style={{ width: 520, height: 520, borderRadius: 260, border: '14px solid var(--yellow)', boxShadow: '0 0 0 18px rgba(230,255,74,0.12), 0 0 120px rgba(230,255,74,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...MONO, fontSize: count ? 300 : 96, fontWeight: 800, color: 'var(--yellow)', lineHeight: 1 }}
        >
          {count ?? 'READY'}
        </div>
      </div>
      <Footer s={s} />
    </>
  )
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="frame">
      <div>{children}</div>
    </div>
  )
}

function GamePlay({ s, now }: { s: State; now: number }) {
  const step = s.step
  const g = s.game!
  const total = (step.durationSec ?? 30) * 1000
  const left = Math.max(0, (g.roundEndsAt ?? now) - now)
  const C = 2 * Math.PI * 190
  return (
    <>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 418px 1fr', gap: 96, alignItems: 'center', padding: '0 104px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <YellowTag>{roundTag(step)}</YellowTag>
          <div style={{ fontSize: 88, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95 }}>{step.product}</div>
          <div style={{ fontSize: 40, color: 'var(--muted)' }}>{step.context}.</div>
          <div style={{ marginTop: 24, fontSize: 34, lineHeight: 1.4 }}>
            {step.maxSelections === 2 ? 'Bonus: find both patterns on your phone.' : 'Find the manipulative element on your phone.'} Or tap <b>"No pattern here"</b>.
          </div>
        </div>
        <Phone>
          <FakeScreen name={step.screenComponent ?? ''} width={390} />
        </Phone>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48 }}>
          <div style={{ position: 'relative', width: 420, height: 420 }}>
            <svg width="420" height="420" viewBox="0 0 420 420" aria-hidden="true" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
              <circle cx="210" cy="210" r="190" fill="none" stroke="var(--surface2)" strokeWidth="24" />
              <circle cx="210" cy="210" r="190" fill="none" stroke={left < 5000 ? 'var(--red)' : 'var(--yellow)'} strokeWidth="24" strokeLinecap="round" strokeDasharray={`${(C * left) / total} ${C}`} style={{ transition: 'stroke-dasharray 0.2s linear' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ ...MONO, fontSize: 168, fontWeight: 800, lineHeight: 1, color: left < 5000 ? 'var(--red)' : 'var(--yellow)' }}>{Math.ceil(left / 1000)}</span>
              <span style={{ fontSize: 30, color: 'var(--muted)' }}>seconds</span>
            </div>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ ...MONO, fontSize: 64, fontWeight: 800 }}>
                {g.lockedCount} <span style={{ color: 'var(--muted)' }}>/ {s.playerCount}</span>
              </span>
              <span style={{ fontSize: 32, color: 'var(--muted)' }}>locked in</span>
            </div>
            <div style={{ height: 20, borderRadius: 10, background: 'var(--surface2)', overflow: 'hidden' }}>
              <div className="bar-fill" style={{ width: `${pct(g.lockedCount, s.playerCount)}%`, height: '100%', background: 'var(--text)', borderRadius: 10 }} />
            </div>
          </div>
        </div>
      </div>
      <Footer s={s} />
    </>
  )
}

/** Share of answers per tapped element, most tapped first. */
function TapRows({ s, limit = 5 }: { s: State; limit?: number }) {
  const g = s.game!
  const n = g.answered ?? 0
  const label = (id: string) => s.step.elements?.find((e) => e.id === id)?.label ?? id
  const rows = Object.entries(g.elementCounts ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
  return (
    <>
      {rows.map(([id, c]) => (
        <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30 }}>
            <span>{label(id)}</span>
            <b style={MONO}>{pct(c, n)}%</b>
          </div>
          <div style={{ height: 16, borderRadius: 8, background: 'var(--surface2)', overflow: 'hidden' }}>
            <div className="bar-fill" style={{ height: '100%', width: `${pct(c, n)}%`, background: 'var(--red)', borderRadius: 8 }} />
          </div>
        </div>
      ))}
      {!rows.length && <div style={{ fontSize: 30, color: 'var(--muted)' }}>Nobody tapped an element.</div>}
    </>
  )
}

function Heatmap({ s }: { s: State }) {
  const step = s.step
  const g = s.game!
  return (
    <>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 418px 1fr', gap: 96, alignItems: 'center', padding: '0 104px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <YellowTag>{roundTag(step)}</YellowTag>
          <div style={{ fontSize: 88, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95 }}>Where you tapped</div>
          <div style={{ fontSize: 36, color: 'var(--muted)' }}>
            {step.product} · {step.context}
          </div>
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ ...MONO, fontSize: 120, fontWeight: 800, lineHeight: 1 }}>{pct(g.noneCount ?? 0, g.answered ?? 0)}%</span>
            <span style={{ fontSize: 34 }}>
              said <b>"No pattern here"</b>
            </span>
          </div>
        </div>
        <Phone>
          <FakeScreen name={step.screenComponent ?? ''} width={390} dots={g.taps ?? []} />
        </Phone>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ ...MONO, fontSize: 24, letterSpacing: '0.14em', color: 'var(--muted)' }}>
            TAPS BY ELEMENT · {g.answered ?? 0} ANSWERS
          </div>
          <TapRows s={s} />
          <div style={{ fontSize: 26, color: 'var(--muted)', marginTop: 8 }}>Answer revealed next.</div>
        </div>
      </div>
      <Footer s={s} />
    </>
  )
}

function PatternReveal({ s }: { s: State }) {
  const step = s.step
  const g = s.game!
  const clean = !step.answers?.length
  const debate = step.scored === false
  const m = (step.patternName ?? '').match(/^(.*?)\s*\((.*)\)$/)
  const [name, aka] = m ? [m[1], m[2]] : [step.patternName ?? '', '']
  const n = g.answered ?? 0
  return (
    <>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 418px 1fr', gap: 96, alignItems: 'center', padding: '0 104px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, background: 'var(--surface)', border: '2px solid var(--yellow)', borderRadius: 28, padding: 48, boxShadow: '10px 10px 0 var(--yellow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...MONO, fontSize: 24, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--yellow)' }}>
            <Icon name={clean && !debate ? 'check' : 'warn'} size={30} sw={2.5} />
            {debate ? 'DEBATE' : clean ? 'CLEAN SCREEN' : 'DARK PATTERN'}
          </div>
          <div style={{ fontSize: 76, fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 0.95 }}>{name}</div>
          {aka && <div style={{ fontSize: 30, color: 'var(--muted)', ...MONO }}>a.k.a. {aka}</div>}
          <div style={{ fontSize: 36, lineHeight: 1.35 }}>{step.explanation}</div>
        </div>
        <Phone>
          <FakeScreen name={step.screenComponent ?? ''} width={390} reveal />
        </Phone>
        {debate ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            <div style={{ ...MONO, fontSize: 24, letterSpacing: '0.14em', color: 'var(--muted)' }}>HOW THE ROOM SPLIT</div>
            <TapRows s={s} />
            <div style={{ fontSize: 30 }}>
              <b style={MONO}>{pct(g.noneCount ?? 0, n)}%</b> saw no pattern
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ ...MONO, fontSize: 200, fontWeight: 800, lineHeight: 0.9, color: clean ? 'var(--green)' : 'var(--red)', letterSpacing: '-0.04em' }}>{clean ? g.correctPct ?? 0 : g.fooledPct ?? 0}%</div>
            <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1 }}>{clean ? 'of you saw it was clean.' : 'of you got fooled.'}</div>
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 30, color: 'var(--muted)' }}>
              {!clean && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Icon name="check" size={28} style={{ color: 'var(--green)' }} />
                  <span>
                    <b style={{ color: 'var(--text)' }}>{g.correctPct ?? 0}%</b> spotted it
                  </span>
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Icon name="x" size={28} style={{ color: 'var(--error)' }} />
                <span>
                  {clean ? (
                    <>
                      <b style={{ color: 'var(--text)' }}>{pct(n - (g.noneCount ?? 0), n)}%</b> tapped an element
                    </>
                  ) : (
                    <>
                      <b style={{ color: 'var(--text)' }}>{pct(g.noneCount ?? 0, n)}%</b> saw no pattern
                    </>
                  )}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
      <Footer s={s} />
    </>
  )
}

function Change({ d }: { d: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10, ...MONO, fontSize: 32, fontWeight: 700 }} aria-label={d > 0 ? `up ${d}` : d < 0 ? `down ${-d}` : 'same place'}>
      <Icon name={d > 0 ? 'up' : d < 0 ? 'down' : 'same'} size={32} />
      {d ? Math.abs(d) : ''}
    </span>
  )
}

function MiniLeaderboard({ s, rows }: { s: State; rows: Row[] }) {
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '72px 220px 48px', gap: 40, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...MONO, fontSize: 26, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--yellow)' }}>AFTER {roundTag(s.step)}</div>
            <h2 style={{ marginTop: 14, fontSize: 104, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>Top 5</h2>
          </div>
          <div style={{ fontSize: 30, color: 'var(--muted)' }}>Check your phone for your rank</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center' }}>
          {rows.map((r, i) => (
            <div
              key={r.nickname}
              className="pop"
              style={{ animationDelay: `${(rows.length - i) * 0.12}s`, height: 120, display: 'grid', gridTemplateColumns: '110px 1fr 180px 220px', alignItems: 'center', gap: 24, padding: '0 40px', borderRadius: 20, background: i ? 'var(--surface)' : 'var(--yellow)', color: i ? 'var(--text)' : 'var(--bg)' }}
            >
              <span style={{ ...MONO, fontSize: 56, fontWeight: 800 }}>#{r.rank}</span>
              <span style={{ ...MONO, fontSize: 52, fontWeight: 800, letterSpacing: '-0.02em' }}>{r.nickname}</span>
              <Change d={r.change} />
              <span style={{ ...MONO, fontSize: 56, fontWeight: 800, textAlign: 'right' }}>{fmt(r.score)}</span>
            </div>
          ))}
          {!rows.length && <Center>No scores yet.</Center>}
        </div>
      </div>
      <Footer s={s} />
    </>
  )
}

function Podium({ s }: { s: State }) {
  const rows = s.leaderboard ?? []
  const block = (r: Row | undefined, place: number, height: number, delay: number) => {
    const first = place === 1
    return (
      <div className="pop" style={{ animationDelay: `${delay}s`, width: first ? 340 : 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        {first && <Icon name="crown" size={72} sw={1.8} style={{ color: 'var(--yellow)' }} />}
        <span style={{ ...MONO, fontSize: first ? 48 : 38, fontWeight: 800, color: first ? 'var(--yellow)' : undefined }}>{r?.nickname ?? '—'}</span>
        <span style={{ ...MONO, fontSize: first ? 38 : 34, color: first ? undefined : 'var(--muted)' }}>{r ? fmt(r.score) : ''}</span>
        <div
          style={{ width: '100%', height, borderRadius: '20px 20px 0 0', background: first ? 'var(--yellow)' : 'var(--surface2)', border: first ? undefined : '2px solid var(--line)', borderBottom: 0, display: 'flex', justifyContent: 'center', paddingTop: 24, ...MONO, fontSize: first ? 150 : 110, fontWeight: 800, color: first ? 'var(--bg)' : 'var(--muted)' }}
        >
          {place}
        </div>
      </div>
    )
  }
  return (
    <>
      <div className="dots-bg" />
      <div style={{ position: 'relative', flex: 1, display: 'grid', gridTemplateColumns: '1fr 520px', gap: 88, padding: '64px 104px 0', minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...MONO, fontSize: 26, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--yellow)' }}>FINAL · SPOT THE DARK PATTERN</div>
          <h2 style={{ marginTop: 14, fontSize: 96, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>Pattern spotters</h2>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 24 }}>
            {block(rows[1], 2, 300, 0.6)}
            {block(rows[0], 1, 420, 1.2)}
            {block(rows[2], 3, 220, 0)}
          </div>
        </div>
        {rows.length > 3 && (
          <div className="pop" style={{ animationDelay: '1.8s', alignSelf: 'center', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 24, padding: '32px 36px', marginBottom: 56 }}>
            <div style={{ ...MONO, fontSize: 22, letterSpacing: '0.14em', color: 'var(--muted)', marginBottom: 8 }}>4 – {rows.length}</div>
            {rows.slice(3).map((r) => (
              <div key={r.nickname} style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 16, alignItems: 'center', height: 64, borderBottom: '1px solid var(--surface2)', ...MONO, fontSize: 32 }}>
                <span style={{ color: 'var(--muted)' }}>{r.rank}</span>
                <span style={{ fontWeight: 700 }}>{r.nickname}</span>
                <span>{fmt(r.score)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer s={s} join={false} />
    </>
  )
}

function QnaWall({ s }: { s: State }) {
  const hl = s.questions.find((q) => q.id === s.highlightedQuestionId)
  const rest = s.questions.filter((q) => q !== hl).slice(0, hl ? 6 : 9)
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '64px 104px 48px', gap: 36, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 88, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>Questions</h2>
          <span style={{ fontSize: 30, color: 'var(--muted)' }}>
            Anonymous · upvote on your phone · <b style={{ color: 'var(--text)', ...MONO }}>{s.questions.length}</b> asked
          </span>
        </div>
        {hl && (
          <div className="pop" key={hl.id} style={{ display: 'flex', gap: 40, alignItems: 'center', background: 'var(--text)', color: 'var(--bg)', borderRadius: 28, padding: '44px 52px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 120 }}>
              <Icon name="caret" size={40} />
              <span style={{ ...MONO, fontSize: 56, fontWeight: 800, lineHeight: 1 }}>{hl.votes}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...MONO, fontSize: 22, fontWeight: 800, letterSpacing: '0.14em', color: '#5E6670' }}>NOW ANSWERING</div>
              <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.2, marginTop: 10 }}>{hl.text}</div>
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24 }}>
          {rest.map((q) => (
            <div key={q.id} style={{ display: 'flex', gap: 22, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 56, color: 'var(--muted)' }}>
                <Icon name="caret" size={28} />
                <span style={{ ...MONO, fontSize: 34, fontWeight: 800, color: 'var(--text)' }}>{q.votes}</span>
              </div>
              <div style={{ fontSize: 32, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{q.text}</div>
            </div>
          ))}
        </div>
        {!s.questions.length && <Center>Ask from your phone: tap "Ask".</Center>}
      </div>
      <Footer s={s} />
    </>
  )
}
