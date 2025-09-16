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
        <label>
          <span>Kategoriya</span>
          <select value={value.category} onChange={(e) => set({ category: e.target.value })}>
            <option value="">Tanlang…</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Kadastr raqami</span>
          <input value={value.cadastral} onChange={(e) => set({ cadastral: e.target.value })} />
        </label>
        <label>
          <span>Maydon (m²) dan</span>
          <input type="number" value={value.areaMin} onChange={(e) => set({ areaMin: e.target.value })} />
        </label>
        <label>
          <span>Maydon (m²) gacha</span>
          <input type="number" value={value.areaMax} onChange={(e) => set({ areaMax: e.target.value })} />
        </label>
        <label>
          <span>CRM</span>
          <input value={value.crm} onChange={(e) => set({ crm: e.target.value })} />
        </label>
        <label>
          <span>CRM NEW</span>
          <input value={value.crmNew} onChange={(e) => set({ crmNew: e.target.value })} />
        </label>
        <label>
          <span>Manba</span>
          <input value={value.source} onChange={(e) => set({ source: e.target.value })} />
        </label>
        <label>
          <span>Buyurtmachi</span>
          <input value={value.client} onChange={(e) => set({ client: e.target.value })} />
        </label>
        <label>
          <span>Hudud</span>
          <select value={value.region} onChange={(e) => set({ region: e.target.value })}>
            <option value="">Tanlang…</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={value.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">Tanlang…</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>ProductProcessType</span>
          <select
            value={value.productProcessType}
            onChange={(e) => set({ productProcessType: e.target.value })}
          >
            <option value="">Tanlang…</option>
            <option value="IDENTIFICATION">IDENTIFICATION</option>
            <option value="EVALUATION">EVALUATION</option>
            <option value="SALE">SALE</option>
          </select>
        </label>
        <label>
          <span>Savdo turi</span>
          <select value={value.tradeType} onChange={(e) => set({ tradeType: e.target.value })}>
            <option value="">Tanlang…</option>
            {tradeTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Saralash</span>
          <select value={value.sortBy} onChange={(e) => set({ sortBy: e.target.value })}>
            <option value="createdAt">Yangi qo‘shilgan sana</option>
            <option value="id">ID</option>
            <option value="name">Nomi</option>
            <option value="region">Viloyat</option>
          </select>
        </label>
        <label>
          <span>Yo‘nalish</span>
          <select value={value.sortDir} onChange={(e) => set({ sortDir: e.target.value })}>
            <option value="desc">desc</option>
            <option value="asc">asc</option>
          </select>
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
