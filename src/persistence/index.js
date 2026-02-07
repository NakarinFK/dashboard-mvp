import { createSqliteDatabase } from './sqliteDriver.js'

const STATE_KEY = 'financeState-v1'
const LEGACY_STORAGE_KEY = 'financeState-v1'
const APP_ID = 'finance-dashboard'
const VERSION = 1

const IDB_NAME = 'finance-dashboard'
const IDB_STORE = 'keyval'
const DB_BYTES_KEY = 'finance-sqlite-db'
const BACKUP_BYTES_KEY = 'finance-sqlite-backup'

let dbPromise = null
export function createPersistenceAdapter() {
  const adapter = {
    loadState: async () => {
      const db = await getDatabase()
      const raw = readStateRow(db)
      if (!raw) return null
      const parsed = safeParse(raw)
      return parsed ?? null
    },
    saveState: async (state) => {
      if (typeof state === 'undefined') return
      const db = await getDatabase()
      const json = JSON.stringify(state)
      writeStateRow(db, json)
      await persistDatabase(db)
    },
    exportData: async () => {
      const state = await adapter.loadState()
      return buildEnvelope(state)
    },
    importData: async (input) => {
      const payload = parseImportInput(input)
      if (!payload || typeof payload.version !== 'number' || !('state' in payload)) {
        throw new Error('Invalid import payload')
      }
      await adapter.backup()
      await adapter.saveState(payload.state)
    },
    backup: async () => {
      const state = await adapter.loadState()
      const json = JSON.stringify(state ?? null)
      await saveBackup(json)
    },
  }

  return adapter
}

export const persistenceAdapter = createPersistenceAdapter()

async function getDatabase() {
  if (!dbPromise) {
    dbPromise = initDatabase()
  }
  return dbPromise
}

async function initDatabase() {
  const bytes = await loadDB()
  const db = await createSqliteDatabase(bytes)
  db.run(
    'CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT NOT NULL)'
  )
  await migrateLegacyLocalStorage(db)
  return db
}

function readStateRow(db) {
  const stmt = db.prepare('SELECT json FROM app_state WHERE id = ?')
  stmt.bind([STATE_KEY])
  let value = null
  if (stmt.step()) {
    const row = stmt.getAsObject()
    value = row.json || null
  }
  stmt.free()
  return value
}

function writeStateRow(db, json) {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO app_state (id, json, updated_at) VALUES (?, ?, ?)'
  )
  stmt.bind([STATE_KEY, json, new Date().toISOString()])
  stmt.step()
  stmt.free()
}

async function persistDatabase(db) {
  const bytes = db.export()
  await saveDB(bytes)
}

async function migrateLegacyLocalStorage(db) {
  if (!hasLocalStorage()) return
  const existing = readStateRow(db)
  if (existing) return
  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!legacy) return
  const parsed = safeParse(legacy)
  if (!parsed) {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    return
  }
  writeStateRow(db, JSON.stringify(parsed))
  await persistDatabase(db)
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
}

function buildEnvelope(state) {
  return {
    version: VERSION,
    createdAt: new Date().toISOString(),
    app: APP_ID,
    state,
  }
}

function parseImportInput(input) {
  if (!input) return null
  if (typeof input === 'string') {
    return safeParse(input)
  }
  if (typeof input === 'object') {
    return input
  }
  return null
}

function safeParse(value) {
  try {
    return JSON.parse(value)
  } catch (error) {
    return null
  }
}

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function hasIndexedDB() {
  return typeof indexedDB !== 'undefined'
}

async function openIdb() {
  if (!hasIndexedDB()) return null
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbGet(key) {
  const db = await openIdb()
  if (!db) return null
  return new Promise((resolve) => {
    const transaction = db.transaction(IDB_STORE, 'readonly')
    const store = transaction.objectStore(IDB_STORE)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => resolve(null)
  })
}

async function idbSet(key, value) {
  const db = await openIdb()
  if (!db) return
  return new Promise((resolve) => {
    const transaction = db.transaction(IDB_STORE, 'readwrite')
    const store = transaction.objectStore(IDB_STORE)
    const request = store.put(value, key)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
  })
}

async function idbDelete(key) {
  const db = await openIdb()
  if (!db) return
  return new Promise((resolve) => {
    const transaction = db.transaction(IDB_STORE, 'readwrite')
    const store = transaction.objectStore(IDB_STORE)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
  })
}

async function saveDB(bytes) {
  if (!bytes) return
  await idbSet(DB_BYTES_KEY, bytes)
}

async function loadDB() {
  const stored = await idbGet(DB_BYTES_KEY)
  if (!stored) return null
  if (stored instanceof Uint8Array) return stored
  if (stored instanceof ArrayBuffer) return new Uint8Array(stored)
  if (Array.isArray(stored)) return new Uint8Array(stored)
  return null
}

async function clearDB() {
  await idbDelete(DB_BYTES_KEY)
}

async function saveBackup(value) {
  await idbSet(BACKUP_BYTES_KEY, value)
}
