import React, { useEffect } from 'react'
import { updateSavedPayload, getSavedPayload, DEFAULT_PAYLOAD } from '../api/analysis'

export default function FilterForm({ value, onChange, onSearch, loading, count }) {
  const set = (patch) => onChange({ ...value, ...patch })

  // Initialize localStorage payload if missing and sync initial UI
  useEffect(() => {
    const saved = getSavedPayload()
    if (!saved) {
      try { updateSavedPayload(DEFAULT_PAYLOAD) } catch {}
    } else {
      if (saved.search && saved.search !== value.id) onChange({ ...value, id: saved.search })
      if (saved.analysisStatus && saved.analysisStatus !== value.analysisStatus) onChange({ ...value, analysisStatus: saved.analysisStatus })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <form className="filters" onSubmit={(e) => e.preventDefault()}>
      <div className="grid">
        <label>
          <span>ID bo'yicha qidirish</span>
          <input value={value.id} onChange={(e) => { const v = e.target.value; set({ id: v }); try { updateSavedPayload({ search: (v || '').toString().trim() }) } catch {} }} />
        </label>
        <label>
          <span>Likvidligi</span>
          <select value={value.analysisStatus || ''} onChange={(e) => { const v = e.target.value; set({ analysisStatus: v }); try { updateSavedPayload({ analysisStatus: v }) } catch {} }}>
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
