// Mock data to simulate API results
const now = Date.now()

const rows = [
  {
    id: 107855,
    name: 'Tovuqxona binosi',
    region: 'Andijon',
    district: 'Xo‘jaobod',
    area: 1200,
    category: 'Noturar',
    cadastral: '01:07:12:345',
    crm: 'A1',
    crmNew: 'B1',
    source: 'Portal',
    client: 'ABC LLC',
    status: 'Yangi',
    productProcessType: 'IDENTIFICATION',
    tradeType: 'Savdo',
    createdAt: now - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 107856,
    name: 'Tovuqxona binosi',
    region: 'Andijon',
    district: 'Xo‘jaobod',
    area: 1150,
    category: 'Noturar',
    cadastral: '01:07:13:111',
    crm: 'A2',
    crmNew: 'B1',
    source: 'Qo‘ng‘iroq',
    client: 'MCHJ Sunrise',
    status: 'Jarayonda',
    productProcessType: 'IDENTIFICATION',
    tradeType: 'Ijaraga',
    createdAt: now - 1000 * 60 * 60 * 12,
  },
  {
    id: 107857,
    name: 'Tovuqxona binosi',
    region: 'Andijon',
    district: 'Xo‘jaobod',
    area: 1000,
    category: 'Qishloq xo‘jaligi',
    cadastral: '01:07:09:999',
    crm: 'A1',
    crmNew: 'B2',
    source: 'Portal',
    client: 'Ziyo Farm',
    status: 'Tasdiqlangan',
    productProcessType: 'EVALUATION',
    tradeType: 'Auksion',
    createdAt: now - 1000 * 60 * 60 * 48,
  },
]

export default rows

