import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Spinner } from './States'

// Open modals, innermost last, so Escape only closes the top-most one.
const stack = []

/** Accessible modal: focus moves inside, Escape closes, background scroll locked. */
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', dismissible = true }) {
  const panelRef = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const focusable = panelRef.current?.querySelector('input, textarea, select, button:not([data-close])')
    ;(focusable || panelRef.current)?.focus()
    const token = {}
    stack.push(token)
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible && stack[stack.length - 1] === token) closeRef.current?.()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      stack.splice(stack.indexOf(token), 1)
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open, dismissible])

  if (!open) return null
  const width = size === 'lg' ? 'sm:max-w-3xl' : size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-xl'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/75 backdrop-blur-sm" onClick={() => dismissible && onClose?.()} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`relative flex max-h-[92dvh] w-full ${width} animate-pop-in flex-col overflow-hidden rounded-t-2xl border border-ink-700 bg-ink-850 shadow-2xl shadow-black/50 outline-none sm:rounded-2xl`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink-700/70 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-cream-500">{subtitle}</p>}
          </div>
          {dismissible && (
            <button data-close onClick={onClose} className="btn-ghost -mr-2 p-2" aria-label="Close dialog">
              <X className="size-5" />
            </button>
          )}
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <footer className="border-t border-ink-700/70 bg-ink-850 px-5 py-4 sm:px-6">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onCancel}
      title={title}
      size="sm"
      dismissible={!busy}
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>
            {busy && <Spinner />} {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-sm text-cream-300">{children}</div>
    </Modal>
  )
}
