import type { ReactNode, SVGProps } from 'react'
import type { Step } from './types'

// ---- Icons (24×24 stroke paths from the design) ----

export const ICONS = {
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6L6 18',
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M5 12l7 7 7-7',
  same: 'M5 12h14',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  warn: 'M12 3l9 16H3zM12 10v4M12 17v.5',
  ask: 'M4 5h16v11H9l-5 4z',
  caret: 'M5 15l7-7 7 7',
  prev: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  pencil: 'M4 20h4L19 9l-4-4L4 16z',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  lock: 'M7 11h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2zM8 11V8a4 4 0 018 0v3',
  wifiOff: 'M2 8.5a15 15 0 0120 0M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0M3 3l18 18',
  removed: 'M14 8a4 4 0 11-8 0 4 4 0 018 0zM3 20a7 7 0 0114 0M17 8l4 4M21 8l-4 4',
}

export function Icon({ name, size = 24, sw = 3, ...rest }: { name: keyof typeof ICONS; size?: number; sw?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={ICONS[name]} />
    </svg>
  )
}

// ---- Tiny markdown: paragraphs, "- " bullets, **bold**, *italic* ----

export function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <b key={i}>{p.slice(2, -2)}</b>
    ) : p.length > 2 && p.startsWith('*') && p.endsWith('*') ? (
      <i key={i}>{p.slice(1, -1)}</i>
    ) : (
      p
    ),
  )
}

export const bullets = (md = '') => md.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2))
export const paragraphs = (md = '') => md.split(/\n\n+/).filter((p) => p.trim() && !p.startsWith('- '))

// ---- Numbers ----

export const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0)
export const fmt = (n: number) => n.toLocaleString('en-US')
export const letter = (i: number) => String.fromCharCode(65 + i)
export const accent = (step: Step) => (step.theme === 'part2' ? 'var(--yellow)' : 'var(--red)')

/** Seconds left as m:ss. */
export const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Labels of the correct elements of a revealed round. */
export function answerLabels(step: Step) {
  const ids = (step.answers ?? []).map((group) => group[0])
  return ids.map((id) => step.elements?.find((e) => e.id === id)?.label ?? id)
}
