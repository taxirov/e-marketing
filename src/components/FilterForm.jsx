import React, { useEffect } from 'react'
import { updateSavedPayload, getSavedPayload, DEFAULT_PAYLOAD } from '../api/analysis'
import REGIONS from '../data/hudud.json'

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
      const firstRegion = Array.isArray(saved.regions) && saved.regions.length ? String(saved.regions[0]) : ''
      if (firstRegion && firstRegion !== String(value.region || '')) onChange({ ...value, region: firstRegion })
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
          <span>Hudud</span>
          <select
            value={value.region || ''}
            onChange={(e) => {
              const v = e.target.value
              set({ region: v })
              try { updateSavedPayload({ regions: v ? [Number(v)] : [] }) } catch {}
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
