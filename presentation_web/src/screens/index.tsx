import { useRef, type ComponentType, type MouseEvent } from 'react'
import CloudPixCancel from './CloudPixCancel'
import CloudPixPlans from './CloudPixPlans'
import FitTrack from './FitTrack'
import NewsDaily from './NewsDaily'
import ReadMore from './ReadMore'
import ShopNest from './ShopNest'
import StreamBox from './StreamBox'
import TravelGo from './TravelGo'

/** By `screenComponent` in content/talk.json. */
const SCREENS: Record<string, ComponentType<{ reveal?: boolean }>> = {
  ShopNest,
  StreamBox,
  FitTrack,
  TravelGo,
  NewsDaily,
  ReadMore,
  CloudPixPlans,
  CloudPixCancel,
}

export const W = 390
export const H = 844

interface Props {
  name: string
  /** Display width in px; the 390×844 design is scaled to it. */
  width: number
  /** Zone ids that can be tapped; others are ignored. */
  zones?: string[]
  /** Outlined: the current pick (yellow) and locked picks (white). */
  selected?: string | null
  locked?: string[]
  /** Shows the screen's own reveal highlight and pattern labels. */
  reveal?: boolean
  /** Heatmap dots as fractions of the design size. */
  dots?: [number, number][]
  onTap?: (zone: string, x: number, y: number) => void
}

const css = (ids: string[], color: string) =>
  ids.length
    ? `${ids.map((id) => `.cwc-fake [data-zone="${CSS.escape(id)}"]`).join(',')}{outline:4px solid ${color};outline-offset:3px;box-shadow:0 0 0 9px rgba(10,12,15,.85)}`
    : ''

export default function FakeScreen({ name, width, zones, selected, locked = [], reveal, dots, onTap }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const Screen = SCREENS[name]
  const scale = width / W

  // Fake links and buttons never navigate; a tap selects the nearest data-zone
  const tap = (e: MouseEvent) => {
    e.preventDefault()
    if (!onTap || !root.current) return
    const zone = (e.target as Element).closest('[data-zone]')?.getAttribute('data-zone')
    if (!zone || (zones && !zones.includes(zone))) return
    const r = root.current.getBoundingClientRect()
    const clamp = (v: number) => Math.min(1, Math.max(0, v))
    onTap(zone, clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height))
  }

  return (
    <div style={{ width, height: H * scale, overflow: 'hidden', position: 'relative', flex: 'none' }}>
      <style>{css(locked, '#F3F5F7') + css(selected ? [selected] : [], '#E6FF4A')}</style>
      <div
        ref={root}
        className="cwc-fake"
        onClickCapture={tap}
        style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: '0 0', position: 'relative', cursor: onTap ? 'pointer' : 'default', userSelect: 'none' }}
      >
        {Screen ? <Screen reveal={reveal} /> : <div style={{ padding: 24 }}>Unknown screen {name}</div>}
        {dots && (
          <>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,15,0.35)' }} />
            {dots.map(([x, y], i) => (
              <span
                key={i}
                style={{ position: 'absolute', left: x * W, top: y * H, width: 34, height: 34, margin: '-17px 0 0 -17px', borderRadius: 17, background: 'rgba(255,90,78,0.55)', boxShadow: '0 0 0 2px rgba(255,255,255,0.7)' }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
