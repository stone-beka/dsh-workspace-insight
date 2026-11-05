/**
 * Host half of the workspace-insight bundle.
 *
 * It reads two durable, read-only sources and serves one JSON document:
 *  - `$DSH_HOME/storages/workspace.json`            - workspace registry + archived session ids
 *  - `$DSH_HOME/storages/session_projcache/sessions` - per-session folded projections
 *
 * The browser half (./client) renders the document as a Settings page. Nothing
 * here mutates storage; archive actions go through the Client's own
 * `uiWorkspace` service, which owns the durable write.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const name = 'workspace-insight'
export const inject = ['webServer']

const ROUTE = '/workspace-insight/data'
const ACTIVITY_ROUTE = '/workspace-insight/activity'
const TTL_MS = 60_000
const ACTIVITY_TTL_MS = 5 * 60_000
const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
const DAY = 86_400_000
const TREND_DAYS = 14
const SUPPORTED_LOG_VERSIONS = new Set([3, 4]) // v3 and v4 share the same frame layout

let cache = { at: 0, doc: null }
let activityCache = { at: 0, doc: null, building: null }

function homeDir() {
  return process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

function sessionIdOf(file) {
  const base = path.basename(file, '.json')
  return base.startsWith('session-') ? base : `session-${base}`
}

function readRegistry(home) {
  const reg = readJson(path.join(home, 'storages', 'workspace.json'))
  const workspaces = []
  const bySession = new Map()
  const archived = new Set()
  try {
    const table = reg?.tables?.workspaces ?? {}
    for (const id of Object.keys(table)) {
      const rec = table[id]?.value ?? table[id]
      if (!rec || typeof rec.path !== 'string') continue
      const ws = {
        id,
        title: typeof rec.title === 'string' && rec.title ? rec.title : path.basename(rec.path),
        path: rec.path,
        createdAt: rec.createdAt ?? null,
        updatedAt: rec.updatedAt ?? null,
        sessionIds: Array.isArray(rec.sessionIds) ? rec.sessionIds : [],
      }
      workspaces.push(ws)
      for (const sid of ws.sessionIds) bySession.set(sid, ws)
    }
    for (const sid of reg?.global?.archivedSessionIds ?? []) archived.add(sid)
  } catch {
    /* an unreadable registry yields an empty dashboard, not a 500 */
  }
  let warning
  if (reg === undefined) warning = 'workspace storage is missing or unreadable'
  else if (reg?.unit?.name !== 'workspace') warning = 'unrecognized workspace storage format'
  return { workspaces, bySession, archived, warning }
}

function readSessions(home) {
  const dir = path.join(home, 'storages', 'session_projcache', 'sessions')
  let files = []
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
  } catch {
    return { list: [], warning: 'session projection cache not found' }
  }
  const out = []
  for (const file of files) {
    const full = path.join(dir, file)
    const doc = readJson(full)
    const record = doc?.record
    const identity = record?.identity
    if (!identity || typeof identity.cwd !== 'string') continue
    const rows = record.rows ?? {}
    const stats = rows.sessionStats?.val ?? {}
    const listMeta = rows.sessionListMetadata?.val ?? {}
    const totals = rows.tokenUsage?.val?.totals ?? {}
    let mtime = 0
    try {
      mtime = fs.statSync(full).mtimeMs
    } catch {
      /* keep 0 */
    }
    const lastAt =
      (typeof listMeta.lastPromptAt === 'number' && listMeta.lastPromptAt) ||
      (typeof record.lastEventAt === 'number' && record.lastEventAt) ||
      mtime ||
      null
    const title = typeof rows.title?.val === 'string' ? rows.title.val.trim() : ''
    out.push({
      id: sessionIdOf(file),
      cwd: identity.cwd,
      title,
      createdAt: identity.createdAt ?? null,
      lastAt,
      turns: Number(stats.turns) || 0,
      workMs: (Number(stats.llmMs) || 0) + (Number(stats.toolMs) || 0),
      outputTokens: Number(totals.outputTokens) || 0,
      preset: typeof rows.agentPreset?.val === 'string' ? rows.agentPreset.val : null,
      blank: listMeta.blank === true,
    })
  }
  return { list: out, warning: undefined }
}

function dayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10)
}

function trendOf(sessions, now) {
  const buckets = new Map()
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    buckets.set(dayKey(now - i * DAY), 0)
  }
  for (const s of sessions) {
    if (!s.lastAt) continue
    const key = dayKey(s.lastAt)
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1)
  }
  return [...buckets.values()]
}

function existsDir(p) {
  try {
    return fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}

function buildDoc() {
  const now = Date.now()
  const home = homeDir()
  const { workspaces, bySession, archived, warning: registryWarning } = readRegistry(home)
  const { list: sessions, warning: sessionWarning } = readSessions(home)
  const warnings = [registryWarning, sessionWarning].filter(Boolean)

  // Join sessions to workspaces: registry membership first, then exact cwd.
  const wsByPath = new Map(workspaces.map((w) => [w.path, w]))
  const buckets = new Map(workspaces.map((w) => [w.id, []]))
  const orphans = []
  for (const s of sessions) {
    const owner = bySession.get(s.id) ?? wsByPath.get(s.cwd)
    s.archived = archived.has(s.id)
    if (owner) {
      let list = buckets.get(owner.id)
      if (!list) {
        list = []
        buckets.set(owner.id, list)
      }
      list.push(s)
    } else {
      orphans.push(s)
    }
  }

  const shape = (base, list) => {
    const live = list.filter((s) => !s.archived)
    const lastAt = list.reduce((acc, s) => Math.max(acc, s.lastAt || 0), 0) || null
    return {
      id: base.id ?? null,
      title: base.title,
      path: base.path,
      exists: existsDir(base.path),
      createdAt: base.createdAt ?? null,
      lastAt,
      days: lastAt ? Math.floor((now - lastAt) / DAY) : null,
      sessions: list.length,
      liveSessions: live.length,
      archivedSessions: list.length - live.length,
      turns: list.reduce((acc, s) => acc + s.turns, 0),
      workMs: list.reduce((acc, s) => acc + s.workMs, 0),
      outputTokens: list.reduce((acc, s) => acc + s.outputTokens, 0),
      trend: trendOf(list, now),
      sessionList: list
        .slice()
        .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0))
        .map((s) => ({
          id: s.id,
          title: s.title || s.id,
          createdAt: s.createdAt,
          lastAt: s.lastAt,
          turns: s.turns,
          workMs: s.workMs,
          outputTokens: s.outputTokens,
          preset: s.preset,
          archived: s.archived,
          blank: s.blank,
        })),
    }
  }

  const rows = workspaces.map((w) => shape(w, buckets.get(w.id) ?? []))
  rows.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0) || a.title.localeCompare(b.title))

  // Sessions whose cwd is not any registered workspace path.
  const orphanGroups = new Map()
  for (const s of orphans) {
    let g = orphanGroups.get(s.cwd)
    if (!g) {
      g = { id: null, title: path.basename(s.cwd) || s.cwd, path: s.cwd, createdAt: null, list: [] }
      orphanGroups.set(s.cwd, g)
    }
    g.list.push(s)
  }
  const unassigned = [...orphanGroups.values()]
    .map((g) => shape({ id: null, title: g.title, path: g.path, createdAt: null }, g.list))
    .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0))

  const all = rows.concat(unassigned)
  return {
    generatedAt: now,
    warnings,
    totals: {
      workspaces: rows.length,
      sessions: sessions.length,
      active7: rows.filter((r) => r.days !== null && r.days <= 7).length,
      sleeping: rows.filter((r) => r.days !== null && r.days > 20).length,
      archivedSessions: sessions.filter((s) => s.archived).length,
      unassigned: unassigned.length,
      workMs: all.reduce((acc, r) => acc + r.workMs, 0),
    },
    workspaces: rows,
    unassigned,
  }
}

function getDoc(force) {
  const now = Date.now()
  if (!force && cache.doc && now - cache.at < TTL_MS) return cache.doc
  const doc = buildDoc()
  cache = { at: now, doc }
  return doc
}

// ---------------------------------------------------------------------------
// Daily activity index
//
// A session log is a concatenation of independent zstd frames; each frame holds
// one or more JSONL events carrying `time` (epoch ms). We walk the frame magic
// and decompress frame by frame, which keeps the scan streaming-free and lets us
// reuse per-file results. Results are cached on disk keyed by size+mtime, so a
// request only re-reads sessions that changed since the previous scan.
// ---------------------------------------------------------------------------

function pad2(n) {
  return n < 10 ? '0' + n : String(n)
}

function localDay(ms) {
  const d = new Date(ms)
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

function listSessionFiles(root) {
  const out = []
  const stack = [root]
  while (stack.length) {
    const dir = stack.pop()
    let ents
    try {
      ents = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of ents) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) stack.push(full)
      else if (e.name.endsWith('.zstd')) out.push(full)
    }
  }
  return out
}

function scanSessionFile(buf) {
  const offsets = []
  let i = 0
  while ((i = buf.indexOf(ZSTD_MAGIC, i)) !== -1) {
    offsets.push(i)
    i += 4
  }
  const days = new Set()
  const errors = []
  let header
  let title
  for (let k = 0; k < offsets.length; k++) {
    const start = offsets[k]
    let decoded
    // A false magic inside compressed payload is possible; retry against the
    // next boundary before giving up on this frame.
    for (let n = k + 1; n <= Math.min(offsets.length, k + 3); n++) {
      const end = n < offsets.length ? offsets[n] : buf.length
      try {
        decoded = decompressFrame(buf.subarray(start, end))
        break
      } catch (error) {
        if (errors.length < 3) errors.push(String(error && error.message ? error.message : error))
      }
    }
    if (decoded === undefined) continue
    const text = decoded
    for (const m of text.matchAll(/"time"\s*:\s*(\d{13})/g)) days.add(localDay(Number(m[1])))
    if (!title && text.indexOf('"type":"session/title"') !== -1) {
      const tm = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(text)
      if (tm) {
        try {
          title = JSON.parse('"' + tm[1] + '"')
        } catch {
          /* keep an empty title */
        }
      }
    }
    if (!header) {
      const hm = /^\{"type":"session".*?\}/.exec(text)
      if (hm) {
        try {
          header = JSON.parse(hm[0])
        } catch {
          /* header stays undefined */
        }
      }
    }
  }
  return { header, days: [...days].sort(), title: title || '', errors }
}

let zstdDecompress = null
function decompressFrame(slice) {
  if (zstdDecompress === null) {
    try {
      // Node 22.15+ exposes zstd in node:zlib.
      const zlib = process.getBuiltinModule('node:zlib')
      zstdDecompress = typeof zlib.zstdDecompressSync === 'function' ? zlib.zstdDecompressSync : false
    } catch {
      zstdDecompress = false
    }
    if (!zstdDecompress) throw new Error('zstd decompression is unavailable in this runtime')
  }
  return zstdDecompress(slice).toString('utf8')
}

function activityCachePath(home) {
  return path.join(home, 'cache', 'workspace-insight', 'session-days.v3.json')
}

function loadActivityCache(home) {
  const doc = readJson(activityCachePath(home))
  if (doc && doc.version === 3 && doc.files && typeof doc.files === 'object') return doc
  return { version: 3, files: {} }
}

function saveActivityCache(home, doc) {
  try {
    const file = activityCachePath(home)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(doc))
  } catch {
    /* a cache write failure must not fail the request */
  }
}

async function buildActivity() {
  const now = Date.now()
  const home = homeDir()
  const { workspaces, warning: registryWarning } = readRegistry(home)
  const wsByPath = new Map(workspaces.map((w) => [w.path, w]))
  const { list: sessions, warning: sessionWarning } = readSessions(home)
  const titleById = new Map(sessions.map((s) => [s.id, s.title]))
  const cacheDoc = loadActivityCache(home)
  const files = listSessionFiles(path.join(home, 'sessions'))
  const scanCache = {}
  const daySession = [] // { d, w, s }
  const sessionDays = new Map()
  const sessionCwd = new Map()
  const newestByWorkspace = new Map()
  let reScanned = 0
  let skippedLogs = 0

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex]
    // 会话日志文件名带格式版本（session.v4.jsonl.zstd）；未知版本直接跳过，不去猜格式。
    const versionMatch = /session\.v(\d+)\.jsonl\.zstd$/.exec(file)
    if (versionMatch && !SUPPORTED_LOG_VERSIONS.has(Number(versionMatch[1]))) {
      skippedLogs += 1
      continue
    }
    let stat
    try {
      stat = fs.statSync(file)
    } catch {
      continue
    }
    const prev = cacheDoc.files[file]
    let entry = prev
    if (!prev || prev.size !== stat.size || prev.mtimeMs !== stat.mtimeMs) {
      let buf
      try {
        buf = fs.readFileSync(file)
      } catch {
        continue
      }
      const scanned = scanSessionFile(buf)
      const header = scanned.header
      entry = {
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        id: header && typeof header.id === 'string' ? header.id : sessionIdOf(file),
        cwd: header && typeof header.cwd === 'string' ? header.cwd : null,
        createdAt: header && typeof header.createdAt === 'number' ? header.createdAt : null,
        days: scanned.days,
        title: scanned.title || '',
      }
      reScanned++
    }
    scanCache[file] = entry
    if (!entry.days || entry.days.length === 0) continue
    const owner = (entry.cwd && wsByPath.get(entry.cwd)) || null
    const workspaceId = owner ? owner.id : '__unassigned__'
    const title = titleById.get(entry.id) || entry.title || ''
    if (entry.createdAt) {
      const prev = newestByWorkspace.get(workspaceId) || 0
      if (entry.createdAt > prev) newestByWorkspace.set(workspaceId, entry.createdAt)
    }
    if (entry.cwd && !sessionCwd.has(entry.id)) sessionCwd.set(entry.id, entry.cwd)
    sessionDays.set(entry.id, { days: entry.days, title, workspaceId, cwd: entry.cwd || '' })
    for (const d of entry.days) daySession.push({ d, w: workspaceId, s: entry.id })
    if ((fileIndex + 1) % 40 === 0) await new Promise((resolve) => setImmediate(resolve))
  }

  if (reScanned > 0 || Object.keys(cacheDoc.files).length !== Object.keys(scanCache).length) {
    saveActivityCache(home, { version: 3, files: scanCache })
  }

  const usedWorkspaces = new Set(daySession.map((r) => r.w))
  const sessionList = [...sessionDays.entries()].map(([id, v]) => ({
    id,
    title: v.title || id,
    workspaceId: v.workspaceId,
    cwd: v.cwd,
    days: v.days,
  }))
  const warnings = [registryWarning, sessionWarning].filter(Boolean)
  if (skippedLogs > 0) {
    warnings.push(skippedLogs + ' session logs use an unsupported format version')
  }

  const days = [...new Set(daySession.map((r) => r.d))].sort()
  const workspaceRows = workspaces.map((w) => ({
    id: w.id,
    title: w.title,
    path: w.path,
    exists: existsDir(w.path),
    createdAt: w.createdAt ?? null,
    newestSessionAt: newestByWorkspace.get(w.id) ?? null,
  }))
  if (usedWorkspaces.has('__unassigned__')) {
    workspaceRows.push({
      id: '__unassigned__',
      title: '未登记目录',
      path: '',
      exists: true,
      createdAt: null,
      newestSessionAt: newestByWorkspace.get('__unassigned__') ?? null,
    })
  }
  return {
    generatedAt: now,
    warnings,
    scannedFiles: files.length,
    reScanned,
    workspaces: workspaceRows,
    sessions: sessionList,
    records: daySession,
    range: { from: days[0] ?? null, to: days[days.length - 1] ?? null },
  }
}

function getActivity(force) {
  const now = Date.now()
  if (!force && activityCache.doc && now - activityCache.at < ACTIVITY_TTL_MS) return Promise.resolve(activityCache.doc)
  if (activityCache.building) return activityCache.building
  activityCache.building = Promise.resolve()
    .then(() => buildActivity())
    .then((doc) => {
      activityCache = { at: Date.now(), doc, building: null }
      return doc
    })
    .catch((error) => {
      activityCache = { at: 0, doc: null, building: null }
      throw error
    })
  return activityCache.building
}

function serveJson(req, res, getter, connection) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' })
    res.end()
    return
  }
  // Two independent guards: the Host's own peer admission (cookie/trust policy)
  // and a same-origin header a cross-origin page cannot set. Either admits the
  // request; both are checked when present.
  let admitted = false
  if (connection && typeof connection.admit === 'function') {
    try {
      const admission = connection.admit(req)
      if (admission && !('rejection' in admission)) admitted = true
    } catch {
      admitted = false
    }
  }
  if (!admitted && req.headers['x-workspace-insight'] !== '1') {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('forbidden')
    return
  }
  const force = typeof req.url === 'string' && req.url.includes('refresh=1')
  Promise.resolve()
    .then(() => getter(force))
    .then((doc) => {
      const body = JSON.stringify(doc)
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      })
      if (req.method === 'HEAD') res.end()
      else res.end(body)
    })
    .catch((error) => {
      res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: String(error && error.message ? error.message : error) }))
    })
}


export function apply(ctx) {
  const connection = typeof ctx.get === 'function' ? ctx.get('connection') : undefined
  const route = {
    kind: 'exact',
    path: ROUTE,
    handler: (req, res) => serveJson(req, res, (force) => getDoc(force), connection),
  }
  const activityRoute = {
    kind: 'exact',
    path: ACTIVITY_ROUTE,
    handler: (req, res) => serveJson(req, res, (force) => getActivity(force), connection),
  }
  ctx.effect(() => ctx.webServer.register(route), 'workspace-insight: data route')
  ctx.effect(() => ctx.webServer.register(activityRoute), 'workspace-insight: activity route')
  ctx.effect(
    () => () => {
      cache = { at: 0, doc: null }
      activityCache = { at: 0, doc: null, building: null }
    },
    'workspace-insight: drop cache',
  )
}


