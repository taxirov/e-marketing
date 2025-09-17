import React from 'react'

export default function ObjectsTable({ items, onEdit }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Nomi</th>
            <th>Viloyat</th>
            <th>Tuman</th>
            <th>Likvid</th>
            <th>Amallar</th>
          </tr>
        </thead>
        <tbody>
          {items.map((x) => (
            <tr key={x.id}>
              <td>{x.id}</td>
              <td>{x.name}</td>
              <td>{x.region}</td>
              <td>{x.district}</td>
              <td>
                <StatusDot value={(x.analysisStatus || x.raw?.analysisStatus || '').toString()} />
              </td>
              <td className="actions">
                <button
                  title="Tahrirlash"
                  className="icon-btn"
                  onClick={() => onEdit && onEdit(x)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusDot({ value }) {
  const v = String(value || '').trim().toUpperCase()
  const cls = v === 'GREEN' ? 'green' : v === 'YELLOW' ? 'yellow' : v === 'RED' ? 'red' : 'muted'
  const title = v || 'NO DATA'
  return <span className={`status-dot ${cls}`} title={title} aria-label={`Likvid: ${title}`} />
}

