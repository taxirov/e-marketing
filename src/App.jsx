import React, { useMemo, useState } from 'react'
import FilterForm from './components/FilterForm'
import ObjectsTable from './components/ObjectsTable'
import EditModal from './components/EditModal'
import Pagination from './components/Pagination'
import data from './data/mock'
import logo from './images/logo.png'
import AuthModal from './components/AuthModal'
import { useAuth } from './auth/AuthContext'
import { useAnalysisApi } from './api/analysis'

export default function App() {
  const { open, setOpen, token } = useAuth()
  const { fetchAnalysis, isAuthorized } = useAnalysisApi()
  const [filters, setFilters] = useState({
    id: '',
    category: '',
    cadastral: '',
    areaMin: '',
    areaMax: '',
    crm: '',
    crmNew: '',
    source: '',
    client: '',
    region: '',
    status: '',
    productProcessType: 'IDENTIFICATION',
    tradeType: '',
    sortBy: 'createdAt',
    sortDir: 'desc',
  })

  const [items, setItems] = useState(data)
  const [total, setTotal] = useState(data.length)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    const f = filters
    const pass = (v) => v !== undefined && v !== null && String(v).trim() !== ''
    let items = isAuthorized ? itemsState() : data

    if (pass(f.id)) items = items.filter((x) => String(x.id).includes(String(f.id)))
    if (pass(f.category)) items = items.filter((x) => x.category === f.category)
    if (pass(f.cadastral)) items = items.filter((x) => x.cadastral?.includes(f.cadastral))
    if (pass(f.areaMin)) items = items.filter((x) => (x.area ?? 0) >= Number(f.areaMin))
    if (pass(f.areaMax)) items = items.filter((x) => (x.area ?? 0) <= Number(f.areaMax))
    if (pass(f.crm)) items = items.filter((x) => x.crm === f.crm)
    if (pass(f.crmNew)) items = items.filter((x) => x.crmNew === f.crmNew)
    if (pass(f.source)) items = items.filter((x) => x.source === f.source)
    if (pass(f.client)) items = items.filter((x) => x.client?.toLowerCase().includes(f.client.toLowerCase()))
    if (pass(f.region)) items = items.filter((x) => x.region === f.region)
    if (pass(f.status)) items = items.filter((x) => x.status === f.status)
    if (pass(f.productProcessType)) items = items.filter((x) => x.productProcessType === f.productProcessType)
    if (pass(f.tradeType)) items = items.filter((x) => x.tradeType === f.tradeType)

    const dir = f.sortDir === 'asc' ? 1 : -1
    items = [...items].sort((a, b) => {
      const get = (k) => (k in a ? a[k] : a.createdAt)
      const va = get(f.sortBy)
      const vb = get(f.sortBy)
      if (va === vb) return 0
      return va > vb ? dir : -dir
    })

    // Client-side pagination when unauthorized; when authorized, items already from server
    if (!isAuthorized) {
      const start = (page - 1) * size
      const end = start + size
      return items.slice(start, end)
    }
    return items
  }, [filters, isAuthorized, items, page, size])

  function itemsState() { return items }

  async function handleSearch() {
    if (!isAuthorized) return
    setLoading(true)
    setError('')
    try {
      const { rows, total } = await fetchAnalysis(filters, page, size)
      setItems(rows || [])
      setTotal(total || 0)
    } catch (e) {
      setError(e.message || 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  function triggerSearchResetPage() {
    setPage(1)
    if (isAuthorized) {
      // Defer to let state update, then search
      setTimeout(() => handleSearch(), 0)
    }
  }

  return (
    <div className="page">
      <AuthModal />
      <header className="topbar">
        <img src={logo} alt="E‑MARKETING" className="logo-img" />
        <h1>Elektron Marketing</h1>
        <button className={`authorize ${token?.trim() ? 'on' : ''}`} onClick={() => setOpen(true)}>
          <svg className="lock-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M17 8h-1V6a4 4 0 10-8 0v2H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2zm-8-2a3 3 0 116 0v2h-6V6zm4 8v2a1 1 0 11-2 0v-2a1 1 0 112 0z"/>
          </svg>
          {token?.trim() ? 'Authorized' : 'Authorize'}
        </button>
      </header>

      <section className="filters-card">
        <h2>Obyektlar ro‘yxati</h2>
        <FilterForm
          value={filters}
          onChange={(v) => setFilters(v)}
          onSearch={triggerSearchResetPage}
          loading={loading}
          count={isAuthorized ? total : data.length}
        />
        {error && <div className="error">{error}</div>}
      </section>

      <ObjectsTable
        items={filtered}
        onEdit={(item) => setSelected(item)}
      />
      <Pagination
        page={page}
        size={size}
        total={isAuthorized ? total : data.length}
        onPageChange={(p) => {
          setPage(p)
          if (isAuthorized) handleSearch()
        }}
        onSizeChange={(s) => {
          setSize(s)
          setPage(1)
          if (isAuthorized) handleSearch()
        }}
      />
      <EditModal item={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  )
}
