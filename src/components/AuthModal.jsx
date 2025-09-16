import React, { useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthContext'

export default function AuthModal() {
  const { open, setOpen, token, setToken, clear } = useAuth()
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
      const onKey = (e) => {
        if (e.key === 'Escape') setOpen(false)
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

  if (!open) return null

  const save = () => {
    const raw = inputRef.current?.value?.trim() || ''
    setToken(raw)
    setOpen(false)
  }

  return (
    <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Authorize</h3>
        </div>
        <div className="modal-body">
          <label className="modal-field">
            <span>Bearer token</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="eyJhbGciOiJI..."
              defaultValue={token}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </label>
          <div className="hint">Header preview: {previewHeader(token)}</div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={save}>Save</button>
          <button className="btn ghost" onClick={() => { clear(); setOpen(false) }}>Clear</button>
          <button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function previewHeader(t) {
  const v = (t || '').trim()
  if (!v) return 'Authorization: —'
  return 'Authorization: ' + (v.startsWith('Bearer ') ? v : `Bearer ${v}`)
}

