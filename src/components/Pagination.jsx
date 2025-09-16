import React from 'react'

export default function Pagination({ page, size, total, onPageChange, onSizeChange }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (size || 10)))
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className="pagination">
      <button className="btn ghost" disabled={!canPrev} onClick={() => onPageChange(page - 1)}>
        ‹ Oldingi
      </button>
      <span className="page-info">
        {page} / {totalPages}
      </span>
      <button className="btn ghost" disabled={!canNext} onClick={() => onPageChange(page + 1)}>
        Keyingi ›
      </button>

      <div className="page-size">
        <span>Har sahifa:</span>
        <select value={size} onChange={(e) => onSizeChange(parseInt(e.target.value, 10))}>
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="total">Jami: {total}</span>
      </div>
    </div>
  )
}

