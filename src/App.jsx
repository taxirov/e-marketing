import React, { useEffect, useMemo, useState } from 'react'
import FilterForm from './components/FilterForm'
import ObjectsTable from './components/ObjectsTable'
import EditModal from './components/EditModal'
import Pagination from './components/Pagination'
import data from './data/mock'
import logo from './images/logo.png'
import AuthModal from './components/AuthModal'
import { useAuth } from './auth/AuthContext'
import { useAnalysisApi, getSavedPayload } from './api/analysis'

export default function App() {
  const { open, setOpen, token } = useAuth()
  const { fetchAnalysis, isAuthorized } = useAnalysisApi()
  const [filters, setFilters] = useState({
    id: '',
    analysisStatus: '',
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
  
  // Initialize filters from localStorage payload on first mount
  useEffect(() => {
    try {
      const saved = getSavedPayload()
      if (saved) {
        setFilters((prev) => ({ ...prev, id: saved.search || '', analysisStatus: saved.analysisStatus || '' }))
      }
    } catch {}
  }, [])

  const filtered = useMemo(() => {
    const f = filters
    const pass = (v) => v !== undefined && v !== null && String(v).trim() !== ''
    let itemsList = isAuthorized ? itemsState() : data

    if (pass(f.id)) itemsList = itemsList.filter((x) => String(x.id).includes(String(f.id)))
    if (pass(f.category)) itemsList = itemsList.filter((x) => x.category === f.category)
    if (pass(f.analysisStatus)) itemsList = itemsList.filter((x) => (x.analysisStatus || x.raw?.analysisStatus) === f.analysisStatus)
    if (pass(f.cadastral)) itemsList = itemsList.filter((x) => x.cadastral?.includes(f.cadastral))
    if (pass(f.areaMin)) itemsList = itemsList.filter((x) => (x.area ?? 0) >= Number(f.areaMin))
    if (pass(f.areaMax)) itemsList = itemsList.filter((x) => (x.area ?? 0) <= Number(f.areaMax))
    if (pass(f.crm)) itemsList = itemsList.filter((x) => x.crm === f.crm)
    if (pass(f.crmNew)) itemsList = itemsList.filter((x) => x.crmNew === f.crmNew)
    if (pass(f.source)) itemsList = itemsList.filter((x) => x.source === f.source)
    if (pass(f.client)) itemsList = itemsList.filter((x) => x.client?.toLowerCase().includes(f.client.toLowerCase()))
    if (pass(f.region)) itemsList = itemsList.filter((x) => x.region === f.region)
    if (pass(f.status)) itemsList = itemsList.filter((x) => x.status === f.status)
    if (pass(f.productProcessType)) itemsList = itemsList.filter((x) => x.productProcessType === f.productProcessType)
    if (pass(f.tradeType)) itemsList = itemsList.filter((x) => x.tradeType === f.tradeType)

    const dir = f.sortDir === 'asc' ? 1 : -1
    itemsList = [...itemsList].sort((a, b) => {
      const get = (k) => (k in a ? a[k] : a.createdAt)
      const va = get(f.sortBy)
      const vb = get(f.sortBy)
      if (va === vb) return 0
      return va > vb ? dir : -dir
    })

    if (!isAuthorized) {
      const start = (page - 1) * size
      const end = start + size
      return itemsList.slice(start, end)
    }
    return itemsList
  }, [filters, isAuthorized, items, page, size])

  function itemsState() { return items }

  async function handleSearch(targetPage = page, targetSize = size) {
    if (!isAuthorized) return
    setLoading(true)
    setError('')
    try {
      const { rows, total } = await fetchAnalysis(filters, targetPage, targetSize)
      setItems(rows || [])
      setTotal(total || 0)
      setPage(targetPage)
      setSize(targetSize)
    } catch (e) {
      setError(e.message || 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  function triggerSearchResetPage() {
    setPage(1)
    if (isAuthorized) {
      handleSearch(1, size)
    }
  }

  useEffect(() => {
    if (token?.trim()) {
      handleSearch(1, size)
    } else {
      setItems(data)
      setTotal(data.length)
      setPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="page">
      <AuthModal />
      <header className="topbar">
        <img src={logo} alt="E-MARKETING" className="logo-img" />
        <h1>Elektron Marketing</h1>
        <button className={`authorize ${token?.trim() ? 'on' : ''}`} onClick={() => setOpen(true)}>
          <svg className="lock-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M17 8h-1V6a4 4 0 10-8 0v2H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2zm-8-2a3 3 0 116 0v2h-6V6zm4 8v2a1 1 0 11-2 0v-2a1 1 0 112 0z"/>
          </svg>
          {token?.trim() ? 'Authorized' : 'Authorize'}
        </button>
      </header>

      <section className="filters-card">
        <h2>Obyektlar ro'yxati</h2>
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
          if (isAuthorized) handleSearch(p, size)
        }}
        onSizeChange={(s) => {
          setSize(s)
          setPage(1)
          if (isAuthorized) handleSearch(1, s)
        }}
      />
      <EditModal item={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  )
}
