import React from 'react'

export default function FilterForm({ value, onChange, onSearch, loading, count }) {
  const set = (patch) => onChange({ ...value, ...patch })

  return (
    <form className="filters" onSubmit={(e) => e.preventDefault()}>
      <div className="grid">
        <label>
          <span>ID bo'yicha qidirish</span>
          <input value={value.id} onChange={(e) => set({ id: e.target.value })} />
        </label>
        <label>
          <span>Likvidligi</span>
          <select value={value.analysisStatus || ''} onChange={(e) => set({ analysisStatus: e.target.value })}>
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

