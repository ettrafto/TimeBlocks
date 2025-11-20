import type { TBError } from './normalizeError'

export type HttpEvent = {
  id: string
  label?: string
  client: 'api' | 'http'
  method: string
  path: string
  url: string
  status: number | null
  ok: boolean
  cid?: string | null
  timestamp: number
  durationMs?: number
  requestBody?: unknown
  responseBody?: unknown
  error?: TBError
}

type Listener = (event: HttpEvent) => void

const listeners = new Set<Listener>()

export function subscribeHttpEvents(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emitHttpEvent(event: HttpEvent): void {
  if (!listeners.size) return
  for (const listener of Array.from(listeners)) {
    try {
      listener(event)
    } catch (err) {
      console.error('[HTTP][Events] listener error', err)
    }
  }
}


