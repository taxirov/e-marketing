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
                >�??��?</button>
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

