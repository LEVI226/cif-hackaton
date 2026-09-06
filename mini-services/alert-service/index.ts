// CIF Sentinel - Real-time Alert WebSocket Service
// Runs on port 3003, broadcasts new alerts and transaction events

import { createServer } from 'http'
import { Server } from 'socket.io'
import { Database } from 'bun:sqlite'

const DATABASE_PATH = '/home/z/my-project/db/custom.db'

const PORT = 3003

const db = new Database(DATABASE_PATH, { readonly: true })

function query(sql: string, params: any[] = []) {
  try {
    const stmt = db.prepare(sql)
    return stmt.all(...params)
  } catch (e) {
    console.error('DB error:', e)
    return []
  }
}

function queryOne(sql: string, params: any[] = []) {
  try {
    const stmt = db.prepare(sql)
    return stmt.get(...params)
  } catch (e) {
    console.error('DB error:', e)
    return null
  }
}

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  path: '/',
})

let lastAlertCount = 0
let lastTransactionCount = 0

async function checkForNewEvents() {
  try {
    const alertRow = queryOne('SELECT COUNT(*) as count FROM "Alerte" WHERE statut IN (?, ?)', ['OUVERTE', 'EN_COURS']) as any
    const trxRow = queryOne('SELECT COUNT(*) as count FROM "Transaction"') as any
    const alertCount = alertRow?.count || 0
    const trxCount = trxRow?.count || 0

    if (alertCount > lastAlertCount && lastAlertCount > 0) {
      const newAlerts = query(`
        SELECT a.*, c.nom as clientNom, c.prenom as clientPrenom, c.code as clientCode
        FROM "Alerte" a LEFT JOIN "Client" c ON a.clientId = c.id
        ORDER BY a.createdAt DESC LIMIT ?
      `, [alertCount - lastAlertCount]) as any[]

      for (const a of newAlerts) {
        io.emit('alert:new', {
          id: a.id,
          reference: a.reference,
          type: a.type,
          severite: a.severite,
          titre: a.titre,
          description: a.description,
          montant: a.montant,
          client: a.clientNom ? `${a.clientNom} ${a.clientPrenom}` : null,
          timestamp: a.createdAt,
        })
        console.log(`[ALERT] ${a.reference}: ${a.titre}`)
      }
    }

    if (trxCount > lastTransactionCount && lastTransactionCount > 0) {
      const newTrxs = query(`
        SELECT t.*, c.nom as clientNom, c.prenom as clientPrenom
        FROM "Transaction" t LEFT JOIN "Client" c ON t.clientId = c.id
        ORDER BY t.date DESC LIMIT ?
      `, [trxCount - lastTransactionCount]) as any[]

      for (const t of newTrxs) {
        io.emit('transaction:new', {
          id: t.id,
          reference: t.reference,
          type: t.type,
          montant: t.montant,
          statut: t.statut,
          estSuspecte: t.estSuspecte,
          client: t.clientNom ? `${t.clientNom} ${t.clientPrenom}` : null,
          timestamp: t.date,
        })
      }
    }

    lastAlertCount = alertCount
    lastTransactionCount = trxCount
  } catch (e) {
    console.error('Check error:', e)
  }
}

async function init() {
  const alertRow = queryOne('SELECT COUNT(*) as count FROM "Alerte" WHERE statut IN (?, ?)', ['OUVERTE', 'EN_COURS']) as any
  const trxRow = queryOne('SELECT COUNT(*) as count FROM "Transaction"') as any
  lastAlertCount = alertRow?.count || 0
  lastTransactionCount = trxRow?.count || 0
  console.log(`[INIT] Alerts: ${lastAlertCount}, Transactions: ${lastTransactionCount}`)

  setInterval(checkForNewEvents, 8_000)

  setInterval(() => {
    try {
      const alerts = queryOne('SELECT COUNT(*) as c FROM "Alerte" WHERE statut = ?', ['OUVERTE']) as any
      const trxsToday = queryOne('SELECT COUNT(*) as c FROM "Transaction" WHERE date >= ?', [new Date(Date.now() - 86400000).toISOString()]) as any
      const clients = queryOne('SELECT COUNT(*) as c FROM "Client"') as any
      io.emit('dashboard:stats', {
        alertesOuvertes: alerts?.c || 0,
        transactionsJour: trxsToday?.c || 0,
        totalClients: clients?.c || 0,
      })
    } catch (e) { /* ignore */ }
  }, 30_000)
}

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`)
  socket.emit('connected', { message: 'CIF Sentinel Real-time Service', timestamp: new Date().toISOString() })
  socket.on('disconnect', () => console.log(`[WS] Disconnected: ${socket.id}`))
})

httpServer.listen(PORT, () => {
  console.log(`🚀 CIF Sentinel WebSocket Service on port ${PORT}`)
  init().catch(console.error)
})
