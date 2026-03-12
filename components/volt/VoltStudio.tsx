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
        const updated: VoltElementData = { ...initialElement, ...payload }
        try {
          await onSave?.(updated)
        } catch {
          toast.error('Failed to save. Please try again.')
        }
        if (e.data.type === 'VOLT_DESIGNER_DONE') {
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
      />
    </div>
  )
}
