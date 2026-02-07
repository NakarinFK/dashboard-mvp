export async function createSqliteDatabase(bytes) {
  const initSqlJs = (await import('sql.js')).default
  const SQL = await initSqlJs({
    locateFile: (file) => `/node_modules/sql.js/dist/${file}`,
  })

  if (bytes && bytes.length) {
    return new SQL.Database(bytes)
  }

  return new SQL.Database()
}
