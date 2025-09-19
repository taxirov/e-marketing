import React from 'react'
import REGIONS from '../data/hudud.json'

export default function FilterForm({ value, onChange, onSearch, loading, count }) {
  const set = (patch) => onChange({ ...value, ...patch })

  // No localStorage-backed payload; UI starts empty

  return (
    <form className="filters" onSubmit={(e) => e.preventDefault()}>
      <div className="grid">
        <label>
          <span>ID bo'yicha qidirish</span>
          <input value={value.id} onChange={(e) => { const v = e.target.value; set({ id: v }); }} />
        </label>
        <label>
          <span>Hudud</span>
          <select
            value={value.region || ''}
            onChange={(e) => {
              const v = e.target.value
              set({ region: v })
            }}
          >
            <option value="">Tanlang...</option>
            {Array.isArray(REGIONS) && REGIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.name || r.label || r.code}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Likvidligi</span>
          <select value={value.analysisStatus || ''} onChange={(e) => { const v = e.target.value; set({ analysisStatus: v }); }}>
            <option value="">Hammasi</option>
            <option value="GREEN">Yashil</option>
            <option value="YELLOW">Sariq</option>
            <option value="RED">Qizil</option>
          </select>
        </label>
      </div>
      <div className="filters-footer">
        <button type="button" className="btn" onClick={onSearch} disabled={loading}>
          {loading ? 'Yuklanmoqda...' : 'Qidirish'}
        </button>
        <span className="count">Umumiy: {count}</span>
      </div>
    </form>
  )
}
