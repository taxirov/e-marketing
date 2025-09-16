import React from 'react'

export default function ObjectsTable({ items }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Nomi</th>
            <th>Viloyat</th>
            <th>Tuman</th>
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
              <td className="actions">
                <button title="Tahrirlash" className="icon-btn">✏️</button>
                <button title="Ko‘rish" className="icon-btn">👁️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

