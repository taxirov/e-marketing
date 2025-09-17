import React from 'react'

const categories = ['Turar joy', 'Noturar', 'Qishloq xo‘jaligi']
const statuses = ['Yangi', 'Jarayonda', 'Tasdiqlangan']
const regions = ['Andijon', 'Farg‘ona', 'Namangan', 'Toshkent']
const tradeTypes = ['Savdo', 'Ijaraga', 'Auksion']

export default function FilterForm({ value, onChange, onSearch, loading, count }) {
  const set = (patch) => onChange({ ...value, ...patch })

  return (
    <form className="filters" onSubmit={(e) => e.preventDefault()}>
      <div className="grid">
        <label>
          <span>ID bo‘yicha qidirish</span>
          <input value={value.id} onChange={(e) => set({ id: e.target.value })} />
        </label>
      </div>
      <div className="filters-footer">
        <button type="button" className="btn" onClick={onSearch} disabled={loading}>
          {loading ? 'Yuklanmoqda…' : 'Qidirish'}
        </button>
        <span className="count">Umumiy: {count}</span>
      </div>
    </form>
  )
}
