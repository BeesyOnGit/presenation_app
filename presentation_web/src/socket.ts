import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { State } from './types'

// One connection per device; Socket.IO falls back to long-polling if WebSockets are blocked
export const socket = io({ transports: ['websocket', 'polling'] })

let clockOffset = 0
/** Server clock in Unix ms. */
export const serverNow = () => Date.now() + clockOffset

interface Ack<T> {
  success: boolean
  message?: string
  result?: T
}

/** Emits with an ack; rejects with the server's message. */
export function emit<T = unknown>(event: string, payload?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const done = (err: Error | null, r: Ack<T>) => {
      if (err) reject(new Error('No answer from the server'))
      else if (r?.success) resolve(r.result as T)
      else reject(new Error(r?.message || 'Something went wrong'))
    }
    const s = socket.timeout(8000)
    if (payload === undefined) s.emit(event, done)
    else s.emit(event, payload, done)
  })
}

async function syncClock() {
  const t0 = Date.now()
  try {
    const server = await emit<number>('time:sync')
    const t1 = Date.now()
    clockOffset = server + (t1 - t0) / 2 - t1
  } catch {
    // keep the last offset
  }
}

/** Latest `state`; `onConnect` runs on every (re)connect to claim the socket's role again. */
export function useServerState(onConnect: () => void) {
  const [state, setState] = useState<State | null>(null)
  const [connected, setConnected] = useState(socket.connected)
  const cb = useRef(onConnect)
  cb.current = onConnect

  useEffect(() => {
    const up = () => {
      setConnected(true)
      syncClock()
      cb.current()
    }
    const down = () => setConnected(false)
    socket.on('connect', up)
    socket.on('disconnect', down)
    socket.on('state', setState)
    if (socket.connected) up()
    return () => {
      socket.off('connect', up)
      socket.off('disconnect', down)
      socket.off('state', setState)
    }
  }, [])

  return { state, setState, connected }
}

/** Re-renders every `ms` while `on`, for countdowns. */
export function useTick(on: boolean, ms = 200) {
  const [, set] = useState(0)
  useEffect(() => {
    if (!on) return
    const t = setInterval(() => set((n) => n + 1), ms)
    return () => clearInterval(t)
  }, [on, ms])
}
