'use client'
import { useRef, useEffect, useCallback } from 'react'
import type { VoltElementData } from '@/types/volt'
import { useToast } from '@/components/admin/ToastProvider'

interface Props {
  initialElement: VoltElementData
  authorId: string
  onSave?: (element: VoltElementData) => Promise<void>
  onDone?: () => void
}

export default function VoltStudio({ initialElement, onSave, onDone }: Props) {
  const toast = useToast()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  // Tracks whether this design has ever held ≥1 layer — at open OR via any save in
  // this session. A brand-new design is pre-created in the DB as a blank record
  // (0 layers) before the designer opens; if it stays empty we must not leave that
  // blank card behind. `key={id}` on this component re-inits the ref per design.
  const everHadLayersRef = useRef((initialElement.layers?.length ?? 0) > 0)

  // Send element data to iframe when it signals ready
  const sendLoad = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'VOLT_DESIGNER_LOAD', payload: initialElement },
      '*'
    )
  }, [initialElement])

  useEffect(() => {
    async function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'VOLT_DESIGNER_READY') {
        sendLoad()
        return
      }

      if (e.data?.type === 'VOLT_DESIGNER_SAVE' || e.data?.type === 'VOLT_DESIGNER_DONE') {
        const payload = e.data.payload as Partial<VoltElementData>
        // Always preserve the DB id — designer payload may send empty string for new elements
        const updated: VoltElementData = { ...initialElement, ...payload, id: initialElement.id }
        const isDone = e.data.type === 'VOLT_DESIGNER_DONE'
        const isEmpty = (updated.layers?.length ?? 0) === 0

        if (!isEmpty) everHadLayersRef.current = true

        // ── Empty-design guard ──────────────────────────────────────────────────
        // Never persist an empty (0-layer) design. If it was NEVER meaningfully
        // non-empty (a brand-new pre-created blank the user opened and left without
        // drawing), discard the pre-created record on exit so no blank card remains.
        // An EXISTING design the user deliberately emptied (everHadLayers === true)
        // is left untouched here re: deletion — we persist the emptying, never destroy.
        if (isEmpty) {
          if (isDone) {
            if (!everHadLayersRef.current && initialElement.id) {
              // Brand-new, never-drawn blank → remove the pre-created record.
              try {
                await fetch(`/api/volt/${initialElement.id}`, { method: 'DELETE' })
              } catch {
                // Non-fatal: worst case a blank card remains; still close the studio.
              }
            } else {
              // Existing design emptied on purpose → persist the emptying (no delete).
              try {
                await onSave?.(updated)
              } catch {
                toast.error('Failed to save. Please try again.')
              }
            }
            onDone?.()
          }
          // Bare autosave of an empty design → skip persist entirely (no-op),
          // keeping the pre-created record alive so the session can continue.
          return
        }

        // ── Non-empty save/done → normal persist ────────────────────────────────
        try {
          await onSave?.(updated)
        } catch {
          toast.error('Failed to save. Please try again.')
        }
        if (isDone) {
          onDone?.()
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [initialElement, onSave, onDone, sendLoad, toast])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      <iframe
        ref={iframeRef}
        src="/volt-designer.html"
        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
        title="Volt Designer"
        onLoad={sendLoad}
      />
    </div>
  )
}
