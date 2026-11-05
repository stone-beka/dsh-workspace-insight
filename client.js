/**
 * Client half of the workspace-insight bundle.
 *
 * Two views over the same data:
 *  - Overview: every workspace by recency, work time, 14-day sparkline, sessions.
 *  - Month:    a calendar where each day shows how many conversations were used,
 *              filterable to one workspace, with per-day session drill-down.
 *
 * Host data: GET /workspace-insight/data and GET /workspace-insight/activity
 * (same origin, guarded by the x-workspace-insight header).
 */
window.__ModuleLoader__.load({
  id: 'dsh-workspace-insight',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useCallback, useMemo, useRef } = React

    const DATA_PATH = '/workspace-insight/data'
    const ACTIVITY_PATH = '/workspace-insight/activity'
    const HEADERS = { accept: 'application/json', 'x-workspace-insight': '1' }
    const DAY = 86_400_000

    const ZH = {
      nav: '工作区洞察',
      title: '工作区洞察',
      subtitle: '哪些工作区还活着、哪些该归档，一眼看完',
      tabOverview: '总览',
      tabMonth: '月视图',
      refresh: '刷新',
      loading: '正在读取会话统计…',
      loadingScan: '首次统计需要解压会话日志，约 5–10 秒…',
      error: '读取失败：',
      all: '全部',
      active: '活跃（7 天内）',
      warm: '半活跃（8–20 天）',
      cold: '沉睡（20 天以上）',
      unassigned: '未登记目录',
      colWorkspace: '工作区',
      colLast: '最近使用',
      colSessions: '会话',
      colTurns: '轮次',
      colWork: '模型+工具耗时',
      colTrend: '近 14 天',
      colActions: '操作',
      suggestArchive: '建议归档',
      dirMissing: '目录不存在',
      archived: '已归档',
      archive: '归档',
      unarchive: '取消归档',
      open: '打开',
      expand: '展开会话',
      collapse: '收起',
      noSessions: '这个工作区还没有会话记录。',
      totalWorkspaces: '工作区',
      totalSessions: '会话',
      activeWorkspaces: '近 7 天活跃',
      sleeping: '沉睡中',
      archivedSessions: '已归档会话',
      generatedAt: '统计时间',
      cachedHint: '总览每 60 秒、月视图每 5 分钟最多重算一次',
      sortRecent: '按最近使用',
      sortWork: '按耗时',
      sortCount: '按会话数',
      today: '今天',
      todayPill: '今日',
      todayNew: '今天新开',
      todayHint: '绿色越深 = 今天在这个工作区新开 / 再用的对话越多',
      onlyThisWs: '只看这个工作区',
      inTimeline: '在时间轴看',
      monthAll: '全部工作区',
      prevMonth: '上个月',
      nextMonth: '下个月',
      thisMonth: '回到本月',
      monthSummary: '本月活跃',
      days: '天',
      conversations: '个对话',
      workspacesUsed: '个工作区',
      pickDay: '点击某一天查看当天用了哪些工作区、哪些对话',
      noActivity: '这个月没有记录。',
      dayTitle: '当天记录',
      monthSessions: '本月对话',
      filterHint: '只看指定工作区',
      tabTimeline: '时间轴',
      dayCol: '日期',
      clickToOpen: '点击打开这个对话',
      showAll: '显示全部',
      showAllHint: '格子里不折叠，全部对话都显示出来',
      columns: '列',
      selectAll: '全选',
      selectNone: '全不选',
      band7: '7 天内',
      band14: '8–14 天',
      band21: '15–21 天',
      bandOlder: '21 天以上',
      monthActiveDays: '活跃',
      streak: '最长连续活跃',
      momFlat: '与上月持平',
      momCompare: '较上月',
      jumpTimeline: '在时间轴只看这个工作区',
      showAllColumns: '显示所有列',
      monthEmptyForWs: '这个工作区本月没有记录，换个月份或取消筛选。',
      range14: '最近 14 天',
      range30: '最近 30 天',
      range60: '最近 60 天',
      range90: '最近 90 天',
      rangeAll: '全部',
      today: '今天',
      timelineHint: '行=日期（连续）、列=工作区；滚轮上下 · 左键拖动平移 · Ctrl+滚轮缩放',
      noDay: '无记录',
      more: '还有',
      weekdayMon: '一',
      weekdayTue: '二',
      weekdayWed: '三',
      weekdayThu: '四',
      weekdayFri: '五',
      weekdaySat: '六',
      weekdaySun: '日',
    }
    const EN = {
      nav: 'Workspace insight',
      title: 'Workspace insight',
      subtitle: 'Which workspaces are alive, and which ones to archive',
      tabOverview: 'Overview',
      tabMonth: 'Month',
      refresh: 'Refresh',
      loading: 'Reading session statistics…',
      loadingScan: 'The first scan decompresses session logs; about 5–10 s…',
      error: 'Failed to load: ',
      all: 'All',
      active: 'Active (7 days)',
      warm: 'Warm (8–20 days)',
      cold: 'Sleeping (20+ days)',
      unassigned: 'Unregistered directories',
      colWorkspace: 'Workspace',
      colLast: 'Last used',
      colSessions: 'Sessions',
      colTurns: 'Turns',
      colWork: 'Model + tool time',
      colTrend: 'Last 14 days',
      colActions: 'Actions',
      suggestArchive: 'Archive candidate',
      dirMissing: 'Directory missing',
      archived: 'Archived',
      archive: 'Archive',
      unarchive: 'Unarchive',
      open: 'Open',
      expand: 'Show sessions',
      collapse: 'Hide sessions',
      noSessions: 'No sessions recorded yet.',
      totalWorkspaces: 'Workspaces',
      totalSessions: 'Sessions',
      activeWorkspaces: 'Active in 7 days',
      sleeping: 'Sleeping',
      archivedSessions: 'Archived sessions',
      generatedAt: 'Generated',
      cachedHint: 'Overview recomputes at most every 60 s, the month view every 5 min',
      sortRecent: 'By recency',
      sortWork: 'By work time',
      sortCount: 'By sessions',
      today: 'Today',
      todayPill: 'Today',
      todayNew: 'new today',
      todayHint: 'Darker green = more conversations started or reused in that workspace today',
      onlyThisWs: 'Only this workspace',
      inTimeline: 'In timeline',
      monthAll: 'All workspaces',
      prevMonth: 'Previous month',
      nextMonth: 'Next month',
      thisMonth: 'Back to this month',
      monthSummary: 'Active this month',
      days: 'days',
      conversations: 'conversations',
      workspacesUsed: 'workspaces',
      pickDay: 'Click a day to see its workspaces and conversations',
      noActivity: 'No activity recorded this month.',
      dayTitle: 'That day',
      monthSessions: 'Conversations this month',
      filterHint: 'Filter to one workspace',
      tabTimeline: 'Timeline',
      dayCol: 'Day',
      clickToOpen: 'Click to open this conversation',
      showAll: 'Show all',
      showAllHint: 'Do not fold cell content; list every conversation',
      columns: 'Columns',
      selectAll: 'All',
      selectNone: 'None',
      band7: 'Within 7 days',
      band14: '8–14 days',
      band21: '15–21 days',
      bandOlder: 'Over 21 days',
      monthActiveDays: 'Active',
      streak: 'Longest streak',
      momFlat: 'Same as last month',
      momCompare: 'vs last month',
      jumpTimeline: 'Show only this workspace in the timeline',
      showAllColumns: 'All columns',
      monthEmptyForWs: 'This workspace has no activity this month. Pick another month or clear the filter.',
      range14: 'Last 14 days',
      range30: 'Last 30 days',
      range60: 'Last 60 days',
      range90: 'Last 90 days',
      rangeAll: 'All',
      today: 'Today',
      timelineHint: 'Darker square = more conversations · click a square for details · wheel scrolls · drag pans · Ctrl+wheel zooms',
      noDay: 'No activity',
      more: 'more',
      weekdayMon: 'M',
      weekdayTue: 'T',
      weekdayWed: 'W',
      weekdayThu: 'T',
      weekdayFri: 'F',
      weekdaySat: 'S',
      weekdaySun: 'S',
    }

    const COLOR = {
      text: 'var(--dsw-alias-label-primary)',
      dim: 'var(--dsw-alias-label-secondary)',
      border: 'var(--dsw-alias-border-l1)',
      borderStrong: 'var(--dsw-alias-border-l2)',
      layer1: 'var(--dsw-alias-bg-layer-1)',
      layer2: 'var(--dsw-alias-bg-layer-2)',
      brand: 'var(--dsw-alias-brand-primary)',
      warn: 'var(--dsw-alias-state-warn-primary)',
      error: 'var(--dsw-alias-state-error-primary)',
      idle: 'var(--dsw-alias-state-idle-primary)',
    }

    // Stable chart palette for workspace dots (data colour, not theme chrome).
    const PALETTE = ['#1f6feb', '#0ea5a4', '#7c3aed', '#d97706', '#db2777', '#059669', '#dc2626', '#64748b']

    // 周一到周日各一种颜色，同一个星期几在全表里保持同色。
    const WEEK_PALETTE = ['#e5484d', '#f2994a', '#d4b106', '#27ae60', '#2d9cdb', '#5b5bd6', '#9b51e0']

    // 今日热度用这一个绿，不跟工作区身份色混。
    const HEAT = '#1e9e5a'

    function weekdayIndex(key) {
      return (parseDay(key).getDay() + 6) % 7
    }

    function hueColor(key) {
      let sum = 0
      for (let i = 0; i < key.length; i++) sum = (sum * 31 + key.charCodeAt(i)) >>> 0
      return 'hsl(' + (sum % 360) + ', 70%, 55%)'
    }

    function hashColor(key) {
      let sum = 0
      for (let i = 0; i < key.length; i++) sum = (sum * 31 + key.charCodeAt(i)) >>> 0
      return PALETTE[sum % PALETTE.length]
    }

    function pad2(n) {
      return n < 10 ? '0' + n : String(n)
    }

    function dayKeyOf(d) {
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
    }

    function parseDay(key) {
      const [y, m, d] = key.split('-').map(Number)
      return new Date(y, m - 1, d)
    }

    function monthOf(date) {
      return date.getFullYear() + '-' + pad2(date.getMonth() + 1)
    }

    function shiftMonth(month, delta) {
      const [y, m] = month.split('-').map(Number)
      const d = new Date(y, m - 1 + delta, 1)
      return monthOf(d)
    }

    function monthLabel(month) {
      const [y, m] = month.split('-').map(Number)
      return y + ' 年 ' + m + ' 月'
    }

    function rel(ms, now) {
      if (!ms) return '—'
      const d = Math.max(0, now - ms)
      if (d < 60_000) return '刚刚'
      if (d < 3_600_000) return Math.floor(d / 60_000) + ' 分钟前'
      if (d < DAY) return Math.floor(d / 3_600_000) + ' 小时前'
      return Math.floor(d / DAY) + ' 天前'
    }

    function dur(ms) {
      if (!ms) return '—'
      const min = Math.round(ms / 60_000)
      if (min < 60) return min + ' 分钟'
      const hours = Math.floor(min / 60)
      const rest = min % 60
      return rest ? hours + ' 小时 ' + rest + ' 分' : hours + ' 小时'
    }

    function useJson(url, enabled) {
      const [state, setState] = useState({ loading: false, error: null, data: null })
      const load = useCallback(
        (force) => {
          if (!enabled) return
          setState((s) => ({ ...s, loading: true, error: null }))
          fetch(url + (force ? '?refresh=1' : ''), { headers: HEADERS })
            .then((r) => {
              if (!r.ok) throw new Error('HTTP ' + r.status)
              return r.json()
            })
            .then((data) => setState({ loading: false, error: null, data }))
            .catch((e) => setState({ loading: false, error: String(e && e.message ? e.message : e), data: null }))
        },
        [url, enabled],
      )
      useEffect(() => {
        if (enabled) load(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [enabled])
      return { ...state, load }
    }

    function Spark({ values }) {
      const max = Math.max(1, ...values)
      const width = values.length * 5
      return h(
        'svg',
        { width, height: 20, viewBox: '0 0 ' + width + ' 20', style: { display: 'block', overflow: 'visible' } },
        values.map((v, i) =>
          h('rect', {
            key: i,
            x: i * 5,
            y: 20 - Math.max(1, Math.round((v / max) * 18)),
            width: 3,
            height: Math.max(1, Math.round((v / max) * 18)),
            rx: 1,
            fill: v > 0 ? COLOR.brand : COLOR.border,
            opacity: v > 0 ? 0.35 + 0.65 * (v / max) : 1,
          }),
        ),
      )
    }

    function Badge({ label, color }) {
      return h(
        'span',
        {
          style: {
            display: 'inline-block',
            padding: '1px 6px',
            borderRadius: 999,
            border: '1px solid ' + color,
            color,
            fontSize: 11,
            lineHeight: '16px',
            whiteSpace: 'nowrap',
          },
        },
        label,
      )
    }

    function StatCard({ label, value, hint }) {
      return h(
        'div',
        {
          style: {
            flex: '1 1 120px',
            minWidth: 110,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid ' + COLOR.border,
            background: COLOR.layer1,
          },
        },
        h('div', { style: { fontSize: 12, color: COLOR.dim } }, label),
        h('div', { style: { fontSize: 20, fontWeight: 600, marginTop: 2 } }, value),
        hint ? h('div', { style: { fontSize: 11, color: COLOR.dim, marginTop: 2 } }, hint) : null,
      )
    }

    function btnStyle(primary) {
      return {
        padding: '3px 10px',
        fontSize: 12,
        borderRadius: 6,
        cursor: 'pointer',
        border: '1px solid ' + (primary ? COLOR.brand : COLOR.borderStrong),
        background: 'transparent',
        color: primary ? COLOR.brand : COLOR.text,
      }
    }

    function SessionRow({ sessionId, title, days, t, act, busy }) {
      return h(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            gap: 8,
            alignItems: 'center',
            padding: '5px 8px',
            borderTop: '1px solid ' + COLOR.border,
            fontSize: 12,
          },
        },
        h(
          'div',
          { style: { minWidth: 0 } },
          h(
            'div',
            {
              style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
              title: title,
            },
            title,
          ),
          days && days.length
            ? h(
                'div',
                { style: { fontSize: 11, color: COLOR.dim, marginTop: 1 } },
                days.map((d) => d.slice(5)).join(' · '),
              )
            : null,
        ),
        h(
          'button',
          { style: btnStyle(false), onClick: () => act(sessionId, 'open'), disabled: !!busy },
          t('open'),
        ),
        h(
          'button',
          { style: btnStyle(false), onClick: () => act(sessionId, 'archive'), disabled: !!busy },
          t('archive'),
        ),
      )
    }

    function Overview({ doc, t, act, busy }) {
      const [filter, setFilter] = useState('all')
      const [sort, setSort] = useState('recent')
      const [expanded, setExpanded] = useState({})
      const [hoverToday, setHoverToday] = useState(null)
      const now = Date.now()

      // ── 今日：今天用过 / 今天新开的对话，按工作区聚合 ──────────────────
      const dayStart = new Date()
      dayStart.setHours(0, 0, 0, 0)
      const todayStart = dayStart.getTime()
      const todayEnd = todayStart + 86400000
      const inToday = (ts) => typeof ts === 'number' && ts >= todayStart && ts < todayEnd

      const wsColor = useMemo(() => overviewColors(doc), [doc])

      const titleOf = useMemo(() => {
        const m = new Map()
        for (const w of doc.workspaces.concat(doc.unassigned || [])) m.set(w.id || w.path, w.title)
        return m
      }, [doc])

      const today = useMemo(() => {
        const byKey = new Map()
        let sessions = 0
        let created = 0
        const all = doc.workspaces.concat(doc.unassigned || [])
        for (const r of all) {
          const key = r.id || r.path
          const items = []
          let fresh = 0
          for (const s of r.sessionList) {
            if (!inToday(s.lastAt)) continue
            const isNew = inToday(s.createdAt)
            if (isNew) fresh += 1
            items.push({ id: s.id, title: s.title, lastAt: s.lastAt, isNew })
          }
          if (!items.length) continue
          items.sort((a, b) => b.lastAt - a.lastAt)
          byKey.set(key, { total: items.length, fresh, items })
          sessions += items.length
          created += fresh
        }
        return { byKey, sessions, created, workspaces: byKey.size }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [doc, todayStart])

      const heatOf = (n) => (n >= 6 ? 26 : n >= 3 ? 16 : 8)

      const rows = useMemo(() => {
        let list = doc.workspaces.slice()
        if (filter === 'active') list = list.filter((r) => r.days !== null && r.days <= 7)
        else if (filter === 'warm') list = list.filter((r) => r.days !== null && r.days > 7 && r.days <= 20)
        else if (filter === 'cold') list = list.filter((r) => r.days !== null && r.days > 20)
        if (sort === 'work') list.sort((a, b) => b.workMs - a.workMs)
        else if (sort === 'count') list.sort((a, b) => b.sessions - a.sessions)
        else list.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0))
        return list
      }, [doc, filter, sort])

      const chips = [
        ['all', t('all')],
        ['active', t('active')],
        ['warm', t('warm')],
        ['cold', t('cold')],
      ]

      const renderSession = (s) => {
        const todaySession = inToday(s.lastAt)
        const isNew = todaySession && inToday(s.createdAt)
        return h(
          'div',
          {
            key: s.id,
            style: {
              display: 'grid',
              gridTemplateColumns: '1fr 92px 60px 92px 96px',
              gap: 8,
              alignItems: 'center',
              padding: '6px 8px',
              borderTop: '1px solid ' + COLOR.border,
              fontSize: 12,
              opacity: s.archived ? 0.55 : 1,
              background: todaySession ? 'color-mix(in srgb, ' + HEAT + ' 8%, transparent)' : 'transparent',
              boxShadow: todaySession ? 'inset 3px 0 0 color-mix(in srgb, ' + HEAT + ' 55%, transparent)' : 'none',
            },
          },
          h(
            'div',
            { style: { minWidth: 0 } },
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 } },
              todaySession
                ? h(
                    'span',
                    {
                      style: {
                        flex: '0 0 auto',
                        fontSize: 10.5,
                        fontWeight: 600,
                        borderRadius: 5,
                        padding: '1px 6px',
                        color: 'color-mix(in srgb, ' + HEAT + ' 72%, ' + COLOR.text + ')',
                        background: 'color-mix(in srgb, ' + HEAT + ' 16%, transparent)',
                      },
                    },
                    isNew ? t('todayNew') : t('today'),
                  )
                : null,
              h(
                'div',
                { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }, title: s.title },
                s.title,
              ),
            ),
            s.archived ? h('div', { style: { marginTop: 2 } }, h(Badge, { label: t('archived'), color: COLOR.idle })) : null,
          ),
          h('div', { style: { color: COLOR.dim } }, rel(s.lastAt, now)),
          h('div', { style: { color: COLOR.dim } }, String(s.turns)),
          h('div', { style: { color: COLOR.dim } }, dur(s.workMs)),
          h(
            'div',
            { style: { display: 'flex', gap: 6, justifyContent: 'flex-end' } },
            h('button', { style: btnStyle(false), onClick: () => act(s.id, 'open'), disabled: !!busy }, t('open')),
            h(
              'button',
              { style: btnStyle(!s.archived), onClick: () => act(s.id, s.archived ? 'unarchive' : 'archive'), disabled: !!busy },
              s.archived ? t('unarchive') : t('archive'),
            ),
          ),
        )
      }

      const renderRow = (r) => {
        const open = expanded[r.id] === true
        const suggest = r.days !== null && r.days > 20 && r.sessions > 0
        return h(
          'div',
          {
            key: (r.id || 'unassigned') + r.path,
            style: {
              position: 'relative',
              border: '1px solid ' + COLOR.border,
              borderRadius: 10,
              background: COLOR.layer1,
              marginBottom: 8,
              overflow: 'hidden',
            },
          },
          h('div', {
            style: {
              position: 'absolute',
              left: 0,
              top: 8,
              bottom: 8,
              width: 3,
              borderRadius: 2,
              background: (() => {
                const c = wsColor.get(r.id || r.path)
                if (!c) return 'transparent'
                return today.byKey.get(r.id || r.path)
                  ? c
                  : 'color-mix(in srgb, ' + c + ' 30%, transparent)'
              })(),
            },
          }),
          h(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: 'minmax(200px, 1fr) 92px 74px 64px 108px 86px 88px 150px',
                gap: 10,
                alignItems: 'center',
                padding: '9px 12px',
                cursor: 'pointer',
              },
              onClick: () => setExpanded((e) => ({ ...e, [r.id || r.path]: !open })),
            },
            h(
              'div',
              { style: { minWidth: 0 } },
              h(
                'div',
                { style: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: r.path },
                r.title,
              ),
              h(
                'div',
                { style: { fontSize: 11, color: COLOR.dim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: r.path },
                r.path,
              ),
              h(
                'div',
                { style: { marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' } },
                !r.exists ? h(Badge, { label: t('dirMissing'), color: COLOR.error }) : null,
                suggest ? h(Badge, { label: t('suggestArchive'), color: COLOR.warn }) : null,
                r.archivedSessions ? h(Badge, { label: t('archived') + ' ' + r.archivedSessions, color: COLOR.idle }) : null,
              ),
            ),
            h('div', { style: { fontSize: 12 } }, rel(r.lastAt, now)),
            h('div', { style: { fontSize: 12 } }, r.archivedSessions ? r.liveSessions + ' / ' + r.sessions : String(r.sessions)),
            h('div', { style: { fontSize: 12, color: COLOR.dim } }, String(r.turns)),
            h('div', { style: { fontSize: 12 } }, dur(r.workMs)),
            h('div', { style: { display: 'flex', alignItems: 'center' } }, h(Spark, { values: r.trend })),
            (() => {
              const td = today.byKey.get(r.id || r.path)
              if (!td) return h('div', { style: { fontSize: 12, color: COLOR.borderStrong } }, '—')
              return h(
                'div',
                { style: { display: 'flex' } },
                h(
                  'span',
                  {
                    onMouseEnter: (e) => setHoverToday({ key: r.id || r.path, x: e.clientX, y: e.clientY }),
                    onMouseLeave: () => setHoverToday(null),
                    style: {
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 52,
                      padding: '3px 8px',
                      borderRadius: 7,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'help',
                      color: 'color-mix(in srgb, ' + HEAT + ' 72%, ' + COLOR.text + ')',
                      background: 'color-mix(in srgb, ' + HEAT + ' ' + heatOf(td.total) + '%, transparent)',
                    },
                  },
                  t('todayPill') + ' ' + td.total,
                ),
              )
            })(),
            h('div', { style: { fontSize: 11, color: COLOR.dim, textAlign: 'right' } }, open ? t('collapse') : t('expand')),
          ),
          open
            ? h(
                'div',
                { style: { padding: '2px 12px 10px 12px', background: COLOR.layer2 } },
                r.sessionList.length
                  ? r.sessionList.map(renderSession)
                  : h('div', { style: { padding: '10px 4px', color: COLOR.dim, fontSize: 12 } }, t('noSessions')),
              )
            : null,
        )
      }

      // 悬停「今日 N」：浮层列出今天在这个工作区用过的对话（数量、新开、时间）
      const renderTodayTip = () => {
        const rec = today.byKey.get(hoverToday.key)
        if (!rec) return null
        const shown = rec.items.slice(0, 6)
        const width = 300
        const height = 44 + shown.length * 22 + (rec.items.length > 6 ? 20 : 0)
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800
        const left = Math.max(8, Math.min(hoverToday.x + 14, vw - width - 8))
        const top = hoverToday.y + height + 22 > vh ? Math.max(8, hoverToday.y - height - 14) : hoverToday.y + 18
        const hhmm = (ts) => {
          const d = new Date(ts)
          return pad2(d.getHours()) + ':' + pad2(d.getMinutes())
        }
        return h(
          'div',
          {
            key: 'today-tip',
            style: {
              position: 'fixed',
              left,
              top,
              zIndex: 1000,
              width,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid ' + COLOR.borderStrong,
              background: COLOR.layer1,
              boxShadow: '0 14px 36px rgba(0, 0, 0, 0.20)',
              pointerEvents: 'none',
            },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 } },
            h(
              'div',
              { style: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
              titleOf.get(hoverToday.key) || '',
            ),
            h(
              'span',
              { style: { flex: '0 0 auto', fontSize: 11, fontWeight: 600, color: 'color-mix(in srgb, ' + HEAT + ' 72%, ' + COLOR.text + ')' } },
              t('todayPill') + ' ' + rec.total,
            ),
          ),
          h(
            'div',
            { style: { fontSize: 11, color: COLOR.dim, marginBottom: 6 } },
            rec.fresh ? t('todayNew') + ' ' + rec.fresh : t('todayHint'),
          ),
          shown.map((s) =>
            h(
              'div',
              { key: s.id, style: { display: 'flex', alignItems: 'center', gap: 8, height: 22 } },
              h(
                'span',
                { style: { flex: '0 0 auto', fontSize: 10.5, color: COLOR.dim, fontVariantNumeric: 'tabular-nums' } },
                hhmm(s.lastAt),
              ),
              h(
                'span',
                { style: { flex: 1, minWidth: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                s.title,
              ),
              s.isNew
                ? h(
                    'span',
                    {
                      style: {
                        flex: '0 0 auto',
                        fontSize: 10,
                        borderRadius: 4,
                        padding: '0 4px',
                        color: 'color-mix(in srgb, ' + HEAT + ' 72%, ' + COLOR.text + ')',
                        background: 'color-mix(in srgb, ' + HEAT + ' 16%, transparent)',
                      },
                    },
                    t('todayNew'),
                  )
                : null,
            ),
          ),
          rec.items.length > 6
            ? h('div', { style: { fontSize: 11, color: COLOR.dim, marginTop: 4 } }, '+' + (rec.items.length - 6) + ' ' + t('conversations'))
            : null,
        )
      }

      return h(
        'div',
        null,
        h(
          'div',
          { style: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' } },
          h(StatCard, { label: t('totalWorkspaces'), value: String(doc.totals.workspaces) }),
          h(StatCard, { label: t('totalSessions'), value: String(doc.totals.sessions) }),
          h(StatCard, { label: t('activeWorkspaces'), value: String(doc.totals.active7) }),
          h(StatCard, { label: t('sleeping'), value: String(doc.totals.sleeping) }),
          h(StatCard, { label: t('archivedSessions'), value: String(doc.totals.archivedSessions) }),
        ),
        today.sessions
          ? h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' } },
              h(
                'span',
                {
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 9px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'color-mix(in srgb, ' + HEAT + ' 72%, ' + COLOR.text + ')',
                    background: 'color-mix(in srgb, ' + HEAT + ' 14%, transparent)',
                  },
                },
                '● ' +
                  t('today') +
                  ' ' +
                  today.workspaces +
                  ' ' +
                  t('workspacesUsed') +
                  ' · ' +
                  today.sessions +
                  ' ' +
                  t('conversations') +
                  (today.created ? ' (' + t('todayNew') + ' ' + today.created + ')' : ''),
              ),
              h('span', { style: { fontSize: 11.5, color: COLOR.dim } }, t('todayHint')),
            )
          : null,
        h(
          'div',
          { style: { display: 'flex', gap: 6, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' } },
          chips.map(([id, label]) =>
            h(
              'button',
              {
                key: id,
                onClick: () => setFilter(id),
                style: {
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 999,
                  cursor: 'pointer',
                  border: '1px solid ' + (filter === id ? COLOR.brand : COLOR.border),
                  color: filter === id ? COLOR.brand : COLOR.text,
                  background: 'transparent',
                },
              },
              label,
            ),
          ),
          h('span', { style: { flex: 1 } }),
          h(
            'select',
            {
              value: sort,
              onChange: (e) => setSort(e.target.value),
              style: {
                fontSize: 12,
                padding: '3px 6px',
                borderRadius: 6,
                border: '1px solid ' + COLOR.border,
                background: COLOR.layer1,
                color: COLOR.text,
              },
            },
            h('option', { value: 'recent' }, t('sortRecent')),
            h('option', { value: 'work' }, t('sortWork')),
            h('option', { value: 'count' }, t('sortCount')),
          ),
        ),
        h('div', { style: { marginTop: 14 } }, rows.map(renderRow)),
        doc.unassigned.length
          ? h(
              'div',
              { style: { marginTop: 22 } },
              h(
                'div',
                { style: { fontSize: 12, fontWeight: 600, color: COLOR.dim, marginBottom: 6 } },
                t('unassigned') + '（' + doc.unassigned.length + '）',
              ),
              doc.unassigned.map(renderRow),
            )
          : null,
        hoverToday ? renderTodayTip() : null,
      )
    }

    // 与时间轴一致的列配色：按最近活跃分段、段内按最新会话创建时间排序后分配色相
    function columnColorsFor(activity, todayTs) {
      const used = new Set(activity.records.map((r) => r.w))
      const lastDay = new Map()
      for (const r of activity.records) {
        const cur = lastDay.get(r.w)
        if (!cur || r.d > cur) lastDay.set(r.w, r.d)
      }
      const list = activity.workspaces
        .filter((w) => used.has(w.id))
        .map((w) => {
          const ld = lastDay.get(w.id) || ''
          let age = 999
          if (ld) {
            const parts = ld.split('-').map(Number)
            age = Math.max(0, Math.round((todayTs - Date.UTC(parts[0], parts[1] - 1, parts[2])) / 86400000))
          }
          return {
            id: w.id,
            title: w.title,
            lastDay: ld,
            age,
            newest: w.newestSessionAt || 0,
            bucket: age <= 7 ? 0 : age <= 14 ? 1 : age <= 21 ? 2 : 3,
          }
        })
        .sort(
          (a, b) =>
            a.bucket - b.bucket ||
            b.newest - a.newest ||
            b.lastDay.localeCompare(a.lastDay) ||
            String(a.title).localeCompare(String(b.title)),
        )
      const map = new Map()
      list.forEach((c, i) => map.set(c.id, 'hsl(' + Math.round((i * 137.508) % 360) + ', 62%, 52%)'))
      return map
    }

    // 总览里的工作区身份色：沿用月视图 / 时间轴那套「按活跃度分段 + 黄金角取色」，
    // 让同一个工作区在各视图里尽量是同一个颜色（总览拿不到 activity，用 lastAt 近似排序）。
    function overviewColors(doc) {
      const bucketOf = (age) => (age === null || age === undefined ? 3 : age <= 7 ? 0 : age <= 14 ? 1 : age <= 21 ? 2 : 3)
      const list = doc.workspaces
        .concat(doc.unassigned || [])
        .filter((r) => r.sessions > 0 && r.lastAt)
        .map((r) => ({ id: r.id || r.path, age: r.days, lastAt: r.lastAt || 0, title: r.title }))
        .sort(
          (a, b) =>
            bucketOf(a.age) - bucketOf(b.age) ||
            b.lastAt - a.lastAt ||
            String(a.title).localeCompare(String(b.title)),
        )
      const map = new Map()
      list.forEach((c, i) => map.set(c.id, 'hsl(' + Math.round((i * 137.508) % 360) + ', 62%, 52%)'))
      return map
    }

    function MonthView({ activity, t, act, busy, goTimeline }) {
      const now = new Date()
      const todayKey = dayKeyOf(now)
      const todayTs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
      const currentMonth = monthOf(now)
      const [month, setMonth] = useState(currentMonth)
      const [wsFilter, setWsFilter] = useState('')
      const [selectedDay, setSelectedDay] = useState(null)
      // 只有一种浮层：悬停预览（{ day, wsId, rect }），只在悬停彩色段时出现
      // 选中某天的输出是下面的「当天记录」面板，不弹浮层
      const [peek, setPeek] = useState(null)
      const [hoverRow, setHoverRow] = useState(null)
      const peekKeyRef = useRef(null)
      const detailRef = useRef(null)
      const peekTimer = useRef(null)
      const keepPeek = useCallback(() => {
        if (peekTimer.current) {
          clearTimeout(peekTimer.current)
          peekTimer.current = null
        }
      }, [])
      // 软浮层贴在段旁边而不是跟着鼠标，所以离开格子后要留一点时间给指针移进浮层
      const clearPeekSoon = useCallback(() => {
        if (peekTimer.current) clearTimeout(peekTimer.current)
        peekTimer.current = setTimeout(() => {
          peekKeyRef.current = null
          setPeek(null)
        }, 260)
      }, [])
      useEffect(() => () => {
        if (peekTimer.current) clearTimeout(peekTimer.current)
      }, [])

      const colorMap = useMemo(() => columnColorsFor(activity, todayTs), [activity, todayTs])

      const wsTitle = useMemo(() => {
        const m = new Map()
        for (const w of activity.workspaces) m.set(w.id, w.title)
        return m
      }, [activity])

      const sessInfo = useMemo(() => {
        const m = new Map()
        for (const s of activity.sessions) m.set(s.id, s)
        return m
      }, [activity])

      const monthIndex = useMemo(() => {
        const byDay = new Map()
        const wsDays = new Map()
        for (const r of activity.records) {
          if (r.d.slice(0, 7) !== month) continue
          let day = byDay.get(r.d)
          if (!day) {
            day = new Map()
            byDay.set(r.d, day)
          }
          let set = day.get(r.w)
          if (!set) {
            set = new Set()
            day.set(r.w, set)
          }
          set.add(r.s)
          let ws = wsDays.get(r.w)
          if (!ws) {
            ws = new Map()
            wsDays.set(r.w, ws)
          }
          let perWs = ws.get(r.d)
          if (!perWs) {
            perWs = new Set()
            ws.set(r.d, perWs)
          }
          perWs.add(r.s)
        }
        return { byDay, wsDays }
      }, [activity, month])

      const monthRecords = useMemo(
        () => activity.records.filter((r) => r.d.slice(0, 7) === month),
        [activity, month],
      )

      const usedWs = useMemo(() => {
        const ids = new Set()
        for (const r of monthRecords) ids.add(r.w)
        return [...ids].sort((a, b) => {
          const ca = monthRecords.filter((r) => r.w === a).length
          const cb = monthRecords.filter((r) => r.w === b).length
          return cb - ca
        })
      }, [monthRecords])

      const cells = useMemo(() => {
        const [y, m] = month.split('-').map(Number)
        const first = new Date(y, m - 1, 1)
        const offset = (first.getDay() + 6) % 7
        const total = new Date(y, m, 0).getDate()
        const out = []
        for (let i = 0; i < offset; i++) out.push(null)
        for (let d = 1; d <= total; d++) out.push(month + '-' + pad2(d))
        while (out.length % 7 !== 0) out.push(null)
        return out
      }, [month])

      const daySessions = useCallback(
        (day) => {
          const dayMap = monthIndex.byDay.get(day)
          if (!dayMap) return []
          const out = []
          for (const [wsId, set] of dayMap) {
            if (wsFilter && wsId !== wsFilter) continue
            for (const sid of set) out.push({ wsId, sid })
          }
          return out
        },
        [monthIndex, wsFilter],
      )

      const dayCount = useCallback((day) => daySessions(day).length, [daySessions])

      const dayWorkspaces = useCallback(
        (day) => {
          // the calendar keeps every workspace on a day even while one is filtered:
          // the filtered one stays solid, the others fade, so the month shape is still readable
          const dayMap = monthIndex.byDay.get(day)
          if (!dayMap) return []
          const out = []
          for (const [wsId, set] of dayMap) {
            out.push({ wsId, count: set.size })
          }
          return out.sort((a, b) => b.count - a.count)
        },
        [monthIndex],
      )

      const activeDays = useMemo(() => cells.filter((c) => c && dayCount(c) > 0), [cells, dayCount])
      const filteredMonth = useMemo(
        () => monthRecords.filter((r) => !wsFilter || r.w === wsFilter),
        [monthRecords, wsFilter],
      )
      const monthSessionCount = useMemo(() => new Set(filteredMonth.map((r) => r.s)).size, [filteredMonth])
      const monthWsCount = useMemo(() => new Set(filteredMonth.map((r) => r.w)).size, [filteredMonth])

      // 最长连续活跃天数
      const streak = useMemo(() => {
        const days = cells.filter((c) => c && dayCount(c) > 0)
        if (!days.length) return 0
        let best = 1
        let cur = 1
        for (let i = 1; i < days.length; i++) {
          const prev = parseDay(days[i - 1]).getTime()
          const next = parseDay(days[i]).getTime()
          if (next - prev === 86400000) {
            cur += 1
            if (cur > best) best = cur
          } else cur = 1
        }
        return best
      }, [cells, dayCount])

      // 环比上月对话数
      const mom = useMemo(() => {
        const [y, m] = month.split('-').map(Number)
        const prev = new Date(y, m - 2, 1)
        const prevKey = prev.getFullYear() + '-' + pad2(prev.getMonth() + 1)
        const prevRecords = activity.records.filter(
          (r) => r.d.slice(0, 7) === prevKey && (!wsFilter || r.w === wsFilter),
        )
        const prevSessions = new Set(prevRecords.map((r) => r.s)).size
        return { prevSessions, diff: monthSessionCount - prevSessions }
      }, [activity, month, wsFilter, monthSessionCount])

      useEffect(() => {
        // 翻月时收起悬停预览
        setPeek(null)
        peekKeyRef.current = null
      }, [month])

      useEffect(() => {
        const has = (d) => dayCount(d) > 0
        if (has(todayKey) && todayKey.slice(0, 7) === month) setSelectedDay(todayKey)
        else setSelectedDay(activeDays[0] ?? null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [month, wsFilter, activity])

      const detailSessions = selectedDay ? daySessions(selectedDay) : []
      const detailByWs = useMemo(() => {
        const m = new Map()
        for (const { wsId, sid } of detailSessions) {
          let list = m.get(wsId)
          if (!list) {
            list = []
            m.set(wsId, list)
          }
          list.push(sid)
        }
        return m
      }, [detailSessions])

      const weekdays = [t('weekdayMon'), t('weekdayTue'), t('weekdayWed'), t('weekdayThu'), t('weekdayFri'), t('weekdaySat'), t('weekdaySun')]

      const momText =
        mom.diff === 0 ? t('momFlat') : (mom.diff > 0 ? '+' : '') + mom.diff + ' ' + t('momCompare')

      // 只有一种浮层：悬停彩色段 → 这个工作区当天的会话列表（行可点 = 跳转到那个对话）
      // 悬停日期 / 格子空白不再弹浮层（当天忙不忙一眼能看出来，完整列表在下方「当天记录」里）
      const renderTip = () => {
        if (!peek || !peek.wsId) return null
        const day = peek.day
        const dayMap = monthIndex.byDay.get(day)
        const set = dayMap && dayMap.get(peek.wsId)
        if (!set || !set.size) return null
        const ids = [...set]
        const anchor = peek.rect
        const ROW = 24
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800
        const bodyH = ids.length * ROW
        const footerH = 38
        const width = 340
        // 贴在格子下方（鼠标从段里往下移出来，不会经过别的段，才能点到浮层里的行）
        const spaceBelow = (anchor ? vh - anchor.bottom : vh) - 14
        const spaceAbove = (anchor ? anchor.top : vh) - 14
        const listMax = Math.max(112, Math.min(bodyH, Math.max(spaceBelow, spaceAbove) - 46))
        const height = 40 + Math.min(bodyH, listMax) + footerH
        let left = anchor ? Math.min(Math.max(8, anchor.left), Math.max(8, vw - width - 8)) : 8
        let top = anchor ? anchor.bottom + 6 : 8
        if (anchor && top + height > vh - 8) top = Math.max(8, anchor.top - height - 6)
        const dayLabel =
          Number(day.slice(5, 7)) + ' 月 ' + Number(day.slice(8)) + ' 日' + (day === todayKey ? ' · ' + t('today') : '')
        const headLabel = (wsTitle.get(peek.wsId) || peek.wsId) + ' · ' + dayLabel
        const dot = (wsId) =>
          h('span', {
            style: {
              width: 7,
              height: 7,
              borderRadius: 4,
              flex: '0 0 auto',
              background: colorMap.get(wsId) || COLOR.brand,
            },
          })
        const openSession = (sid) => {
          setPeek(null)
          peekKeyRef.current = null
          if (act) act(sid, 'open')
        }
        const focusWs = (wsId) => {
          setPeek(null)
          peekKeyRef.current = null
          setWsFilter(wsId === wsFilter ? '' : wsId)
        }
        const tipRow = (key, wsId, label, right, onPick) =>
          h(
            'div',
            {
              key,
              onClick: onPick,
              onMouseEnter: () => setHoverRow(key),
              onMouseLeave: () => setHoverRow(null),
              title: label,
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: ROW - 2,
                padding: '0 6px',
                marginLeft: -6,
                borderRadius: 6,
                cursor: 'pointer',
                background: hoverRow === key ? 'color-mix(in srgb, ' + COLOR.brand + ' 8%, transparent)' : 'transparent',
              },
            },
            dot(wsId),
            h(
              'span',
              { style: { flex: 1, minWidth: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
              label,
            ),
            right
              ? h('span', { style: { flex: '0 0 auto', fontSize: 10.5, color: COLOR.dim } }, right)
              : h(
                  'span',
                  {
                    style: {
                      flex: '0 0 auto',
                      fontSize: 10.5,
                      color: hoverRow === key ? COLOR.brand : COLOR.dim,
                      opacity: hoverRow === key ? 1 : 0.6,
                    },
                  },
                  t('open') + ' ›',
                ),
          )

        return h(
          'div',
          {
            key: 'day-tip',
            style: {
              position: 'fixed',
              left,
              top,
              zIndex: 1000,
              width,
              padding: '9px 12px 10px',
              borderRadius: 10,
              border: '1px solid ' + COLOR.borderStrong,
              background: COLOR.layer1,
              boxShadow: '0 14px 36px rgba(0, 0, 0, 0.20)',
              pointerEvents: 'auto',
            },
            onMouseEnter: () => keepPeek(),
            onMouseLeave: () => clearPeekSoon(),
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 } },
            h('div', { style: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, headLabel),
            h(
              'span',
              { style: { flex: '0 0 auto', fontSize: 11, color: COLOR.dim } },
              ids.length + ' ' + t('conversations'),
            ),
          ),
          h(
            'div',
            { style: { maxHeight: listMax, overflowY: 'auto', overflowX: 'hidden', marginRight: -6, paddingRight: 6 } },
            ids.map((sid) => tipRow(sid, peek.wsId, (sessInfo.get(sid) || {}).title || sid, null, () => openSession(sid))),
          ),
          h(
            'div',
            { style: { display: 'flex', gap: 6, marginTop: 6, paddingTop: 6, borderTop: '1px solid ' + COLOR.border } },
            h('button', { style: btnStyle(true), onClick: () => focusWs(peek.wsId) }, t('onlyThisWs')),
            goTimeline
              ? h(
                  'button',
                  {
                    style: btnStyle(false),
                    onClick: () => {
                      setPeek(null)
                      peekKeyRef.current = null
                      goTimeline(peek.wsId)
                    },
                  },
                  t('inTimeline'),
                )
              : null,
          ),
        )
      }

      return h(
        'div',
        null,
        h(
          'div',
          { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' } },
          h('button', { style: btnStyle(false), onClick: () => setMonth(shiftMonth(month, -1)) }, '◀'),
          h('div', { style: { fontSize: 15, fontWeight: 600, minWidth: 120, textAlign: 'center' } }, monthLabel(month)),
          h('button', { style: btnStyle(false), onClick: () => setMonth(shiftMonth(month, 1)) }, '▶'),
          month !== currentMonth
            ? h('button', { style: btnStyle(true), onClick: () => setMonth(currentMonth) }, t('thisMonth'))
            : null,
          h('span', { style: { flex: 1 } }),
          h('span', { style: { fontSize: 11, color: COLOR.dim } }, t('filterHint') + '：'),
          h(
            'select',
            {
              value: wsFilter,
              onChange: (e) => setWsFilter(e.target.value),
              style: {
                fontSize: 12,
                padding: '3px 6px',
                borderRadius: 6,
                border: '1px solid ' + COLOR.border,
                background: COLOR.layer1,
                color: COLOR.text,
                maxWidth: 280,
              },
            },
            h('option', { value: '' }, t('monthAll')),
            usedWs.map((id) => h('option', { key: id, value: id }, wsTitle.get(id) || id)),
          ),
          wsFilter
            ? (() => {
                const chipColor = colorMap.get(wsFilter) || COLOR.brand
                return h(
                  'span',
                  {
                    style: {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 7px 3px 8px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      color: COLOR.text,
                      background: 'color-mix(in srgb, ' + chipColor + ' 14%, transparent)',
                      border: '1px solid color-mix(in srgb, ' + chipColor + ' 32%, transparent)',
                    },
                  },
                  h('span', {
                    style: { width: 7, height: 7, borderRadius: 4, background: chipColor },
                  }),
                  wsTitle.get(wsFilter) || wsFilter,
                  h(
                    'button',
                    {
                      style: {
                        background: 'none',
                        border: 0,
                        padding: '0 1px',
                        color: COLOR.dim,
                        cursor: 'pointer',
                        fontSize: 13,
                        lineHeight: 1,
                      },
                      onClick: () => setWsFilter(''),
                      title: t('monthAll'),
                    },
                    '×',
                  ),
                )
              })()
            : null,
        ),
        h(
          'div',
          { style: { display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', fontSize: 12, color: COLOR.dim } },
          h('span', null, t('monthActiveDays') + ' ' + activeDays.length + ' ' + t('days')),
          h('span', null, '· ' + monthSessionCount + ' ' + t('conversations')),
          h('span', null, '· ' + monthWsCount + ' ' + t('workspacesUsed')),
          h('span', null, '· ' + t('streak') + ' ' + streak + ' ' + t('days')),
          h('span', { style: { color: mom.diff >= 0 ? COLOR.brand : COLOR.error } }, '· ' + momText),
        ),
        wsFilter && !monthRecords.filter((r) => r.w === wsFilter).length
          ? h(
              'div',
              { style: { marginTop: 10, padding: '8px 10px', border: '1px solid ' + COLOR.border, borderRadius: 8, fontSize: 12, color: COLOR.dim } },
              t('monthEmptyForWs'),
            )
          : null,
        h(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(86px, 1fr))',
              gap: 7,
              marginTop: 10,
              overflowX: 'auto',
            },
          },
          weekdays.map((w, i) =>
            h(
              'div',
              {
                key: 'w' + i,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: WEEK_PALETTE[i],
                  background: 'color-mix(in srgb, ' + WEEK_PALETTE[i] + ' 9%, transparent)',
                  borderRadius: 8,
                  padding: '5px 0',
                },
              },
              w,
            ),
          ),
          cells.map((day, i) => {
            if (!day) return h('div', { key: 'e' + i })
            const c = dayCount(day)
            const selected = selectedDay === day
            const isToday = day === todayKey
            const wd = weekdayIndex(day)
            const isWeekend = wd >= 5
            const wsOnDay = dayWorkspaces(day)
            const active = isToday || selected
            return h(
              'div',
              {
                key: day,
                onClick: () => {
                  setSelectedDay(day)
                  setPeek(null)
                  peekKeyRef.current = null
                  // 选中某天的输出是下面那块「当天记录」：把它滚进视野
                  const el = detailRef.current
                  if (el && el.scrollIntoView) {
                    try {
                      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                    } catch {
                      el.scrollIntoView()
                    }
                  }
                },
                onMouseMove: (e) => {
                  keepPeek()
                  const hit = e.target && e.target.closest ? e.target.closest('[data-insight-ws]') : null
                  // 段之间的缝隙 / 格子内边距：保持当前预览不动，指针才能顺利移到浮层上；
                  // 但换到别的日子时旧预览要收掉
                  if (!hit) {
                    if (peek && peek.day !== day) {
                      peekKeyRef.current = null
                      setPeek(null)
                    }
                    return
                  }
                  const ws = hit.getAttribute('data-insight-ws')
                  const next = 'segment|' + day + '|' + ws
                  if (next === peekKeyRef.current) return
                  peekKeyRef.current = next
                  const r = hit.getBoundingClientRect()
                  setPeek({
                    day,
                    wsId: ws,
                    rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
                  })
                },
                onMouseLeave: () => {
                  clearPeekSoon()
                },
                style: {
                  height: 118,
                  borderRadius: 10,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  background: isToday
                    ? 'color-mix(in srgb, ' + COLOR.brand + ' 7%, transparent)'
                    : isWeekend
                      ? 'color-mix(in srgb, ' + COLOR.dim + ' 9%, transparent)'
                      : 'color-mix(in srgb, ' + COLOR.dim + ' 4%, transparent)',
                  border: '1px solid transparent',
                  boxShadow: active
                    ? 'inset 0 0 0 1.5px ' + (isToday ? COLOR.brand : COLOR.borderStrong)
                    : 'none',
                },
              },
              // date row: weekday-coloured number + how many conversations that day
              h(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    padding: '5px 8px 1px',
                    flex: '0 0 auto',
                  },
                },
                h(
                  'span',
                  {
                    style: {
                      fontSize: 13,
                      fontWeight: active ? 700 : 600,
                      color: isToday ? COLOR.brand : WEEK_PALETTE[wd],
                      lineHeight: 1.15,
                    },
                  },
                  String(Number(day.slice(8))),
                ),
                c ? h('span', { style: { fontSize: 10.5, color: COLOR.dim } }, String(c)) : null,
              ),
              // proportional colour segments, inset from the cell edges like the design frame
              h(
                'div',
                {
                  style: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 3,
                    minHeight: 0,
                    minWidth: 0,
                    padding: '3px 6px 8px',
                  },
                },
                wsOnDay.length
                  ? wsOnDay.map((x) => {
                      const color = colorMap.get(x.wsId) || COLOR.brand
                      const label = String(wsTitle.get(x.wsId) || x.wsId)
                      const dimmed = wsFilter && x.wsId !== wsFilter
                      return h(
                        'div',
                        {
                          key: x.wsId,
                          ref: (el) => {
                            if (el) el.setAttribute('data-insight-ws', x.wsId)
                          },
                          onClick: (event) => {
                            event.stopPropagation()
                            setSelectedDay(day)
                            setWsFilter(x.wsId === wsFilter ? '' : x.wsId)
                          },
                          title: label + ' · ' + x.count + ' ' + t('conversations'),
                          style: {
                            flexGrow: x.count,
                            flexBasis: 0,
                            minWidth: 8,
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 4,
                            background: 'color-mix(in srgb, ' + color + ' 78%, transparent)',
                            opacity: dimmed ? 0.22 : 1,
                            overflow: 'hidden',
                            cursor: 'pointer',
                          },
                        },
                        h(
                          'span',
                          {
                            style: {
                              writingMode: 'vertical-rl',
                              textOrientation: 'mixed',
                              fontSize: 10.5,
                              lineHeight: 1.05,
                              color: '#fff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
                            },
                          },
                          label,
                        ),
                      )
                    })
                  : null,
              ),
            )
          }),
        ),

        !activeDays.length
          ? h('div', { style: { padding: 16, color: COLOR.dim, fontSize: 12 } }, t('noActivity'))
          : null,
        h(
          'div',
          {
            ref: detailRef,
            style: { marginTop: 14, border: '1px solid ' + COLOR.border, borderRadius: 10, background: COLOR.layer1, overflow: 'hidden' },
          },
          h(
            'div',
            { style: { padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', justifyContent: 'space-between' } },
            h('span', null, selectedDay ? Number(selectedDay.slice(5, 7)) + ' 月 ' + Number(selectedDay.slice(8)) + ' 日 · ' + t('dayTitle') : t('pickDay')),
            h('span', { style: { color: COLOR.dim, fontWeight: 400 } }, detailSessions.length + ' ' + t('conversations')),
          ),
          selectedDay && detailSessions.length
            ? [...detailByWs.entries()].map(([wsId, ids]) =>
                h(
                  'div',
                  { key: wsId, style: { borderTop: '1px solid ' + COLOR.border, padding: '6px 12px 8px' } },
                  h(
                    'div',
                    { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 } },
                    h('span', {
                      style: { width: 7, height: 7, borderRadius: 4, background: colorMap.get(wsId) || COLOR.brand },
                    }),
                    h('span', null, wsTitle.get(wsId) || wsId),
                    h('span', { style: { color: COLOR.dim, fontWeight: 400, fontSize: 11 } }, ids.length + ' ' + t('conversations')),
                    h('span', { style: { flex: 1 } }),
                    goTimeline
                      ? h(
                          'button',
                          {
                            style: btnStyle(false),
                            onClick: () => goTimeline(wsId),
                            title: t('jumpTimeline'),
                          },
                          t('jumpTimeline'),
                        )
                      : null,
                  ),
                  ids
                    .map((sid) => sessInfo.get(sid))
                    .filter(Boolean)
                    .map((s) =>
                      h(SessionRow, {
                        key: s.id,
                        sessionId: s.id,
                        title: s.title,
                        days: null,
                        t,
                        act,
                        busy,
                      }),
                    ),
                ),
              )
            : h('div', { style: { padding: '10px 12px', color: COLOR.dim, fontSize: 12 } }, t('pickDay')),
        ),
        wsFilter
          ? h(
              'div',
              { style: { marginTop: 14, border: '1px solid ' + COLOR.border, borderRadius: 10, background: COLOR.layer1, overflow: 'hidden' } },
              h(
                'div',
                { style: { padding: '8px 12px', fontSize: 12, fontWeight: 600 } },
                t('monthSessions') + ' · ' + (wsTitle.get(wsFilter) || wsFilter) + ' · ' + monthSessionCount,
              ),
              [...new Set(filteredMonth.map((r) => r.s))]
                .map((sid) => sessInfo.get(sid))
                .filter(Boolean)
                .sort((a, b) => String(b.days[b.days.length - 1] || '').localeCompare(String(a.days[a.days.length - 1] || '')))
                .map((s) =>
                  h(SessionRow, {
                    key: s.id,
                    sessionId: s.id,
                    title: s.title,
                    days: s.days.filter((d) => d.slice(0, 7) === month),
                    t,
                    act,
                    busy,
                  }),
                ),
            )
          : null,
        peek ? renderTip() : null,
      )
    }

    function Timeline({ activity, t, act, busy, compact, focusWs, onClearFocus }) {
      const sesMap = useMemo(() => {
        const m = new Map()
        for (const s of activity.sessions) m.set(s.id, s)
        return m
      }, [activity])

      const baseWidth = compact ? 132 : 150
      const [zoom, setZoom] = useState(1)
      const [showAll, setShowAll] = useState(false)
      const [hidden, setHidden] = useState(() => new Set())
      const [pickerOpen, setPickerOpen] = useState(false)
      const [hover, setHover] = useState(null)
      const zoomAnchorRef = useRef(null)
      const prevZoomRef = useRef(1)

      const today = new Date()
      const todayTs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
      const DAY = 86_400_000

      // 列 = 工作区：按最近活跃分到 7 / 14 / 21 天以内三段，段内按"最新会话的创建时间"新→旧
      const columnsAll = useMemo(() => {
        const used = new Set(activity.records.map((r) => r.w))
        const lastDay = new Map()
        for (const r of activity.records) {
          const cur = lastDay.get(r.w)
          if (!cur || r.d > cur) lastDay.set(r.w, r.d)
        }
        const list = activity.workspaces
          .filter((w) => used.has(w.id))
          .map((w) => {
            const ld = lastDay.get(w.id) || ''
            let age = 999
            if (ld) {
              const [y, m, d] = ld.split('-').map(Number)
              age = Math.max(0, Math.round((todayTs - Date.UTC(y, m - 1, d)) / DAY))
            }
            return {
              id: w.id,
              title: w.title,
              path: w.path,
              lastDay: ld,
              age,
              newest: w.newestSessionAt || 0,
              bucket: age <= 7 ? 0 : age <= 14 ? 1 : age <= 21 ? 2 : 3,
            }
          })
        list.sort(
          (a, b) =>
            a.bucket - b.bucket ||
            b.newest - a.newest ||
            b.lastDay.localeCompare(a.lastDay) ||
            String(a.title).localeCompare(String(b.title)),
        )
        return list
      }, [activity, todayTs])

      const colorById = useMemo(() => {
        const m = new Map()
        columnsAll.forEach((c, i) => m.set(c.id, 'hsl(' + Math.round((i * 137.508) % 360) + ', 62%, 52%)'))
        return m
      }, [columnsAll])

      useEffect(() => {
        if (!focusWs) return
        setHidden(new Set(columnsAll.filter((c) => c.id !== focusWs).map((c) => c.id)))
      }, [focusWs])

      const columns = columnsAll.filter((c) => !hidden.has(c.id))
      const textMode = zoom >= 0.8
      const colWidth = Math.max(38, Math.round(baseWidth * zoom))
      const dateWidth = Math.max(56, Math.round(86 * Math.max(0.82, zoom)))
      const HEAD_H = Math.max(48, Math.round(64 * Math.min(1, zoom + 0.25)))
      const BAND_H = 20
      const limit = showAll ? Infinity : zoom >= 1.15 ? 5 : 3

      const groups = []
      for (const column of columns) {
        const last = groups[groups.length - 1]
        if (last && last.bucket === column.bucket) last.size += 1
        else groups.push({ bucket: column.bucket, size: 1 })
      }
      const bandLabels = [t('band7'), t('band14'), t('band21'), t('bandOlder')]

      const rows = useMemo(() => {
        const byDay = new Map()
        for (const r of activity.records) {
          let day = byDay.get(r.d)
          if (!day) {
            day = new Map()
            byDay.set(r.d, day)
          }
          let list = day.get(r.w)
          if (!list) {
            list = []
            day.set(r.w, list)
          }
          if (list.indexOf(r.s) === -1) list.push(r.s)
        }
        const from = activity.range && activity.range.from
        const out = []
        if (from) {
          const parts = from.split('-').map(Number)
          let cursor = Date.UTC(parts[0], parts[1] - 1, parts[2])
          while (cursor <= todayTs) {
            const d = new Date(cursor)
            const key = d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate())
            out.push({ d: key, cells: byDay.get(key) || new Map() })
            cursor += DAY
          }
        }
        return out.reverse()
      }, [activity, todayTs])

      const stripRef = useRef(null)
      const dragRef = useRef({ down: false, x: 0, y: 0, left: 0, top: 0, moved: false, captured: false })

      // Ctrl / Cmd + 滚轮 = 缩放视图（以鼠标位置为锚点）；普通滚轮保持浏览器默认的上下滚动。
      useEffect(() => {
        const el = stripRef.current
        if (!el) return undefined
        const onWheel = (event) => {
          if (!(event.ctrlKey || event.metaKey)) return
          event.preventDefault()
          const rect = el.getBoundingClientRect()
          const mx = event.clientX - rect.left
          zoomAnchorRef.current = { mx, contentX: el.scrollLeft + mx }
          setZoom((current) => {
            const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12
            return Math.round(Math.min(1.8, Math.max(0.4, current * factor)) * 100) / 100
          })
        }
        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
      }, [])

      // 缩放后按锚点修正横向滚动，视觉上"以鼠标为中心放大/缩小"
      useEffect(() => {
        const el = stripRef.current
        const anchor = zoomAnchorRef.current
        const previous = prevZoomRef.current
        if (el && anchor && previous !== zoom) {
          el.scrollLeft = Math.max(0, (anchor.contentX * zoom) / previous - anchor.mx)
        }
        prevZoomRef.current = zoom
      }, [zoom])

      const zoomBy = useCallback((delta) => {
        setZoom((current) => Math.round(Math.min(1.8, Math.max(0.4, current + delta)) * 100) / 100)
      }, [])

      const weekdayOf = (key) => {
        const d = parseDay(key)
        return [t('weekdayMon'), t('weekdayTue'), t('weekdayWed'), t('weekdayThu'), t('weekdayFri'), t('weekdaySat'), t('weekdaySun')][
          (d.getDay() + 6) % 7
        ]
      }

      const gridTemplateColumns = dateWidth + 'px repeat(' + columns.length + ', ' + colWidth + 'px)'
      const cellBase = {
        background: COLOR.layer1,
        borderBottom: '1px solid ' + COLOR.border,
        minWidth: 0,
      }
      const children = []

      children.push(
        h(
          'div',
          {
            key: 'band-corner',
            style: {
              ...cellBase,
              position: 'sticky',
              top: 0,
              left: 0,
              zIndex: 6,
              height: BAND_H,
              padding: '2px 6px',
              fontSize: 10,
              color: COLOR.dim,
              borderRight: '1px solid ' + COLOR.borderStrong,
            },
          },
          t('dayCol'),
        ),
      )
      groups.forEach((group, index) => {
        children.push(
          h(
            'div',
            {
              key: 'band:' + index,
              style: {
                ...cellBase,
                position: 'sticky',
                top: 0,
                zIndex: 5,
                gridColumn: 'span ' + group.size,
                height: BAND_H,
                padding: '2px 6px',
                fontSize: 10,
                color: COLOR.dim,
                borderLeft: '2px solid ' + COLOR.borderStrong,
                borderBottom: '2px solid ' + COLOR.borderStrong,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              },
            },
            bandLabels[group.bucket] + ' · ' + group.size,
          ),
        )
      })

      children.push(
        h('div', {
          key: 'head-corner',
          style: {
            ...cellBase,
            position: 'sticky',
            top: BAND_H,
            left: 0,
            zIndex: 6,
            height: HEAD_H,
            borderRight: '1px solid ' + COLOR.borderStrong,
          },
        }),
      )
      columns.forEach((column) => {
        const color = colorById.get(column.id)
        children.push(
          h(
            'div',
            {
              key: 'h:' + column.id,
              title:
                column.title +
                '\n' +
                column.path +
                '\n最后活跃 ' +
                (column.lastDay || '—') +
                ' · ' +
                column.age +
                ' 天前',
              style: {
                ...cellBase,
                position: 'sticky',
                top: BAND_H,
                zIndex: 4,
                height: HEAD_H,
                padding: textMode ? '3px 6px' : '2px',
                fontSize: Math.max(9, Math.round(11 * zoom)),
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: textMode ? 'flex-start' : 'center',
                gap: 5,
                borderLeft: '3px solid ' + color,
                background: 'color-mix(in srgb, ' + color + ' 12%, ' + COLOR.layer1 + ')',
              },
            },
            h('span', {
              style: { width: 7, height: 7, borderRadius: 4, flex: '0 0 auto', background: color },
            }),
            h(
              'div',
              {
                style: {
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  fontSize: 9.5,
                  lineHeight: 1.1,
                  color: COLOR.dim,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  maxHeight: HEAD_H - 8,
                  paddingTop: 2,
                },
              },
              column.title,
            ),
          ),
        )
      })

      // 行是倒序（新→旧），所以"周与周之间"要看相邻两行是否属于同一周
      const mondayKeyOf = (key) => {
        const d = parseDay(key)
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
        return dayKeyOf(d)
      }
      const weekBoundaries = new Set()
      for (let i = 1; i < rows.length; i++) {
        if (mondayKeyOf(rows[i - 1].d) !== mondayKeyOf(rows[i].d)) weekBoundaries.add(rows[i].d)
      }

      for (const row of rows) {
        const weekday = weekdayIndex(row.d)
        const weekdayColor = WEEK_PALETTE[weekday]
        const monthStart = row.d.slice(8) === '01'
        const weekStart = weekBoundaries.has(row.d)
        children.push(
          h(
            'div',
            {
              key: 'd:' + row.d,
              style: {
                ...cellBase,
                position: 'sticky',
                left: 0,
                zIndex: 3,
                padding: '4px 6px',
                whiteSpace: 'nowrap',
                borderRight: '1px solid ' + COLOR.borderStrong,
                borderLeft: '3px solid ' + weekdayColor,
                borderTop: monthStart
                  ? '2px solid ' + COLOR.borderStrong
                  : weekStart
                    ? '1px dashed ' + COLOR.borderStrong
                    : undefined,
              },
            },
            h(
              'div',
              { style: { fontSize: Math.max(10, Math.round(12 * zoom)), fontWeight: 600, color: weekdayColor } },
              textMode ? row.d.slice(5).replace('-', '/') : row.d.slice(5),
            ),
            textMode
              ? h('div', { style: { fontSize: 10, color: weekdayColor, opacity: 0.9 } }, weekdayOf(row.d))
              : null,
          ),
        )
        columns.forEach((column) => {
          const ids = row.cells.get(column.id) || []
          const color = colorById.get(column.id)
          const items = []
          if (!textMode) {
            // 缩略模式：仍保留一行小字标题（截断），只把字号/行高压到最小
            const denseLimit = showAll ? ids.length : 2
            for (const sid of ids.slice(0, denseLimit)) {
              const s = sesMap.get(sid)
              if (!s) continue
              items.push(
                h(
                  'div',
                  {
                    key: sid,
                    onMouseEnter: (event) =>
                      setHover({
                        title: s.title,
                        workspace: column.title,
                        day: row.d,
                        x: event.clientX,
                        y: event.clientY,
                      }),
                    onMouseLeave: () => setHover(null),
                    onClick: () => {
                      setHover(null)
                      if (dragRef.current.moved) {
                        dragRef.current.moved = false
                        return
                      }
                      act(sid, 'open')
                    },
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: 9,
                      lineHeight: '11px',
                      color: COLOR.dim,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    },
                  },
                  h('span', {
                    style: {
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      flex: '0 0 auto',
                      background: hueColor(sid),
                    },
                  }),
                  h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, s.title),
                ),
              )
            }
            if (ids.length > denseLimit) {
              items.push(
                h('div', { key: 'more', style: { fontSize: 8.5, color: COLOR.dim, opacity: 0.85 } }, '+ ' + (ids.length - denseLimit)),
              )
            }
          } else {
            const shown = Number.isFinite(limit) ? ids.slice(0, limit) : ids
            for (const sid of shown) {
              const s = sesMap.get(sid)
              if (!s) continue
              items.push(
                h(
                  'div',
                  {
                    key: sid,
                    onClick: () => {
                      setHover(null)
                      if (dragRef.current.moved) {
                        dragRef.current.moved = false
                        return
                      }
                      act(sid, 'open')
                    },
                    onMouseEnter: (event) =>
                      setHover({
                        title: s.title,
                        workspace: column.title,
                        day: row.d,
                        x: event.clientX,
                        y: event.clientY,
                      }),
                    onMouseLeave: () => setHover(null),
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: Math.max(9, Math.round(10.5 * zoom)),
                      lineHeight: Math.round(15 * Math.max(0.9, zoom)) + 'px',
                      color: COLOR.dim,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    },
                  },
                  h('span', {
                    style: {
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      flex: '0 0 auto',
                      background: hueColor(sid),
                    },
                  }),
                  h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, s.title),
                ),
              )
            }
            if (!showAll && ids.length > limit) {
              items.push(
                h('div', { key: 'more', style: { fontSize: 10, color: COLOR.dim, opacity: 0.8 } }, '+ ' + (ids.length - limit)),
              )
            }
          }
          children.push(
            h(
              'div',
              {
                key: row.d + ':' + column.id,
                style: {
                  ...cellBase,
                  padding: textMode ? '3px 6px' : '2px',
                  minHeight: textMode ? Math.max(18, Math.round(26 * Math.min(1.25, zoom))) : 14,
                  borderTop: monthStart
                    ? '2px solid ' + COLOR.borderStrong
                    : weekStart
                      ? '1px dashed ' + COLOR.borderStrong
                      : undefined,
                  background: 'color-mix(in srgb, ' + color + ' ' + (ids.length ? '8%' : '3%') + ', ' + COLOR.layer1 + ')',
                },
              },
              items.length ? items : null,
            ),
          )
        })
      }

      const toggleColumn = (id) => {
        setHidden((current) => {
          const next = new Set(current)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }

      return h(
        'div',
        null,
        h(
          'div',
          { style: { display: 'flex', gap: 6, alignItems: 'center', marginTop: compact ? 8 : 14, flexWrap: 'wrap' } },
          focusWs
            ? h(
                'button',
                {
                  style: btnStyle(true),
                  onClick: () => {
                    setHidden(new Set())
                    if (onClearFocus) onClearFocus()
                  },
                },
                t('showAllColumns'),
              )
            : null,
          h('button', { style: btnStyle(false), onClick: () => zoomBy(-0.1) }, '−'),
          h(
            'span',
            { style: { fontSize: 11, color: COLOR.dim, minWidth: 42, textAlign: 'center' } },
            Math.round(zoom * 100) + '%',
          ),
          h('button', { style: btnStyle(false), onClick: () => zoomBy(0.1) }, '+'),
          h('button', {
            style: {
              ...btnStyle(false),
              borderColor: showAll ? COLOR.brand : COLOR.borderStrong,
              color: showAll ? COLOR.brand : COLOR.text,
            },
            onClick: () => setShowAll((v) => !v),
            title: t('showAllHint'),
          }, (showAll ? '✓ ' : '') + t('showAll')),
          h(
            'div',
            { style: { position: 'relative' } },
            h(
              'button',
              { style: btnStyle(false), onClick: () => setPickerOpen((v) => !v) },
              t('columns') + ' ' + columns.length + '/' + columnsAll.length + ' ▾',
            ),
            pickerOpen
              ? h(
                  'div',
                  {
                    style: {
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      width: 300,
                      maxHeight: 340,
                      overflow: 'auto',
                      background: COLOR.layer1,
                      border: '1px solid ' + COLOR.borderStrong,
                      borderRadius: 8,
                      padding: 8,
                      zIndex: 40,
                      boxShadow: '0 10px 28px rgba(0, 0, 0, 0.22)',
                    },
                  },
                  h(
                    'div',
                    { style: { display: 'flex', gap: 6, marginBottom: 6 } },
                    h('button', { style: btnStyle(false), onClick: () => setHidden(new Set()) }, t('selectAll')),
                    h(
                      'button',
                      { style: btnStyle(false), onClick: () => setHidden(new Set(columnsAll.map((c) => c.id))) },
                      t('selectNone'),
                    ),
                  ),
                  columnsAll.map((column) =>
                    h(
                      'label',
                      {
                        key: column.id,
                        style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '3px 0', cursor: 'pointer' },
                      },
                      h('input', {
                        type: 'checkbox',
                        checked: !hidden.has(column.id),
                        onChange: () => toggleColumn(column.id),
                      }),
                      h('span', {
                        style: {
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          flex: '0 0 auto',
                          background: colorById.get(column.id),
                        },
                      }),
                      h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, column.title),
                    ),
                  ),
                )
              : null,
          ),
          h('span', { style: { flex: 1 } }),
          h(
            'span',
            { style: { fontSize: 11, color: COLOR.dim } },
            rows.length + ' ' + t('days') + ' · ' + columns.length + ' ' + t('workspacesUsed'),
          ),
        ),
        h(
          'div',
          { style: { display: 'flex', gap: 7, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' } },
          [t('weekdayMon'), t('weekdayTue'), t('weekdayWed'), t('weekdayThu'), t('weekdayFri'), t('weekdaySat'), t('weekdaySun')].map(
            (label, index) =>
              h(
                'span',
                { key: label + index, style: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: COLOR.dim } },
                h('span', {
                  style: { width: 6, height: 6, borderRadius: 3, background: WEEK_PALETTE[index], display: 'inline-block' },
                }),
                label,
              ),
          ),
          h('span', { style: { fontSize: 10.5, color: COLOR.dim, marginLeft: 6 } }, t('timelineHint')),
        ),
        h(
          'div',
          {
            ref: stripRef,
            style: {
              marginTop: 8,
              maxHeight: compact ? 'calc(100vh - 340px)' : '74vh',
              overflow: 'auto',
              border: '1px solid ' + COLOR.border,
              borderRadius: 8,
              cursor: 'grab',
              userSelect: 'none',
              touchAction: 'pan-x pan-y',
            },
            onPointerDown: (event) => {
              const el = stripRef.current
              if (!el || event.button !== 0) return
              dragRef.current = {
                down: true,
                x: event.clientX,
                y: event.clientY,
                left: el.scrollLeft,
                top: el.scrollTop,
                moved: false,
                captured: false,
              }
            },
            onPointerMove: (event) => {
              const el = stripRef.current
              const drag = dragRef.current
              if (!el || !drag.down) return
              const dx = event.clientX - drag.x
              const dy = event.clientY - drag.y
              if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return
              if (!drag.moved) {
                drag.moved = true
                if (!drag.captured) {
                  try {
                    el.setPointerCapture(event.pointerId)
                    drag.captured = true
                  } catch {
                    /* best effort */
                  }
                }
              }
              el.scrollLeft = drag.left - dx
              el.scrollTop = drag.top - dy
            },
            onPointerUp: () => {
              dragRef.current.down = false
            },
            onPointerCancel: () => {
              dragRef.current.down = false
            },
            onPointerLeave: () => {
              dragRef.current.down = false
            },
          },
          h('div', { style: { display: 'grid', gridTemplateColumns, minWidth: 'max-content' } }, children),
        ),
        hover
          ? h(
              'div',
              {
                style: {
                  position: 'fixed',
                  left: Math.min(hover.x + 14, (window.innerWidth || 1200) - 320),
                  top: Math.min(hover.y + 14, (window.innerHeight || 800) - 110),
                  width: 300,
                  zIndex: 70,
                  pointerEvents: 'none',
                  background: COLOR.layer1,
                  border: '1px solid ' + COLOR.borderStrong,
                  borderRadius: 8,
                  padding: '8px 10px',
                  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.22)',
                },
              },
              h(
                'div',
                { style: { fontSize: 12, fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' } },
                hover.title,
              ),
              h('div', { style: { marginTop: 4, fontSize: 11, color: COLOR.dim } }, hover.workspace + ' · ' + hover.day),
              h('div', { style: { marginTop: 6, fontSize: 11, color: COLOR.brand } }, t('clickToOpen')),
            )
          : null,
      )
    }

    function App(props) {
      const ctx = App._ctx
      const t = App._t
      const mode = props && props.mode ? props.mode : 'settings'
      const compact = mode === 'sidebar'
      const [tab, setTab] = useState(compact ? 'timeline' : 'overview')
      const [startedMonth, setStartedMonth] = useState(compact)
      const [busy, setBusy] = useState(null)
      const [timelineFocus, setTimelineFocus] = useState('')
      const overview = useJson(DATA_PATH, true)
      const activity = useJson(ACTIVITY_PATH, startedMonth)

      const act = useCallback(
        async (sessionId, kind) => {
          if (!ctx || !ctx.uiWorkspace) return
          setBusy(sessionId)
          try {
            if (kind === 'archive') await ctx.uiWorkspace.archiveSession(sessionId, { stopActivity: true })
            else if (kind === 'unarchive') await ctx.uiWorkspace.unarchiveSession(sessionId)
            else if (kind === 'open') {
              const layout = typeof ctx.get === 'function' ? ctx.get('layout') : undefined
              try {
                if (layout && typeof layout.selectPanel === 'function') layout.selectPanel('conversation')
              } catch {
                /* the panel may already be the conversation */
              }
              ctx.uiWorkspace.openSession(sessionId)
            }
            if (kind !== 'open') overview.load(true)
          } catch (e) {
            // surfaced by the overview panel on its next load
            console.error('[workspace-insight] action failed:', e)
          } finally {
            setBusy(null)
          }
        },
        [ctx, overview.load],
      )

      const switchTab = useCallback((next) => {
        setTab(next)
        if (next !== 'overview') setStartedMonth(true)
      }, [])

      const loading = overview.loading && !overview.data
      const failed = overview.error && !overview.data
      const tabs = compact
        ? [
            ['month', t('tabMonth')],
            ['timeline', t('tabTimeline')],
          ]
        : [
            ['overview', t('tabOverview')],
            ['month', t('tabMonth')],
            ['timeline', t('tabTimeline')],
          ]

      const rootStyle = {
        padding: compact ? '10px 10px 18px 10px' : '18px 22px 40px 22px',
        color: COLOR.text,
      }
      if (mode === 'panel') {
        rootStyle.height = '100%'
        rootStyle.overflowY = 'auto'
        rootStyle.boxSizing = 'border-box'
      }

      return h(
        'div',
        { style: rootStyle },
        compact
          ? h(
              'div',
              { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
              h(
                'div',
                { style: { fontSize: 12, color: COLOR.dim, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                t('timelineHint'),
              ),
              h(
                'button',
                {
                  style: btnStyle(true),
                  onClick: () => {
                    overview.load(true)
                    if (startedMonth) activity.load(true)
                  },
                  disabled: overview.loading,
                },
                t('refresh'),
              ),
            )
          : h(
              'div',
              { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 } },
              h(
                'div',
                null,
                h('h2', { style: { margin: 0, fontSize: 18, fontWeight: 600 } }, t('title')),
                h('div', { style: { marginTop: 4, fontSize: 12, color: COLOR.dim } }, t('subtitle')),
              ),
              h(
                'div',
                { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                overview.data
                  ? h(
                      'span',
                      { style: { fontSize: 11, color: COLOR.dim } },
                      t('generatedAt') + ' ' + new Date(overview.data.generatedAt).toLocaleTimeString(),
                    )
                  : null,
                h(
                  'button',
                  {
                    style: btnStyle(true),
                    onClick: () => {
                      overview.load(true)
                      if (startedMonth) activity.load(true)
                    },
                    disabled: overview.loading,
                  },
                  t('refresh'),
                ),
              ),
            ),
        h(
          'div',
          { style: { display: 'flex', gap: 4, marginTop: compact ? 6 : 14, borderBottom: '1px solid ' + COLOR.border } },
          tabs.map(([id, label]) =>
            h(
              'button',
              {
                key: id,
                onClick: () => switchTab(id),
                style: {
                  padding: compact ? '5px 10px' : '7px 14px',
                  fontSize: compact ? 12 : 13,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: tab === id ? COLOR.text : COLOR.dim,
                  border: 'none',
                  borderBottom: '2px solid ' + (tab === id ? COLOR.brand : 'transparent'),
                  marginBottom: -1,
                },
              },
              label,
            ),
          ),
        ),
        (overview.data && overview.data.warnings && overview.data.warnings.length) ||
        (activity.data && activity.data.warnings && activity.data.warnings.length)
          ? h(
              'div',
              {
                style: {
                  marginTop: 10,
                  padding: '6px 10px',
                  border: '1px solid ' + COLOR.warn,
                  borderRadius: 8,
                  fontSize: 11,
                  color: COLOR.warn,
                },
              },
              [
                ...new Set([
                  ...((overview.data && overview.data.warnings) || []),
                  ...((activity.data && activity.data.warnings) || []),
                ]),
              ].join(' · '),
            )
          : null,
        tab === 'overview'
          ? loading
            ? h('div', { style: { padding: 24, color: COLOR.dim } }, t('loading'))
            : failed
              ? h(
                  'div',
                  { style: { padding: 24, color: COLOR.error } },
                  t('error') + overview.error,
                  h('button', { onClick: () => overview.load(true), style: { ...btnStyle(true), marginLeft: 12 } }, t('refresh')),
                )
              : overview.data
                ? h(Overview, { doc: overview.data, t, act, busy })
                : null
          : activity.loading && !activity.data
            ? h('div', { style: { padding: 24, color: COLOR.dim } }, t('loadingScan'))
            : activity.error && !activity.data
              ? h(
                  'div',
                  { style: { padding: 24, color: COLOR.error } },
                  t('error') + activity.error,
                  h('button', { onClick: () => activity.load(true), style: { ...btnStyle(true), marginLeft: 12 } }, t('refresh')),
                )
              : activity.data
                ? tab === 'timeline'
                  ? h(Timeline, {
                      activity: activity.data,
                      t,
                      act,
                      busy,
                      compact,
                      focusWs: timelineFocus,
                      onClearFocus: () => setTimelineFocus(''),
                    })
                  : h(MonthView, {
                      activity: activity.data,
                      t,
                      act,
                      busy,
                      goTimeline: (wsId) => {
                        setTimelineFocus(wsId)
                        switchTab('timeline')
                      },
                    })
                : null,
        h('div', { style: { marginTop: compact ? 8 : 16, fontSize: 11, color: COLOR.dim } }, t('cachedHint')),
      )
    }

    return {
      inject: ['slots', 'locale', 'uiWorkspace'],
      apply(ctx) {
        let t = (k) => ZH[k] ?? k
        try {
          if (ctx.locale && typeof ctx.locale.register === 'function') {
            ctx.locale.register('wsInsight', 'zh', ZH)
            ctx.locale.register('wsInsight', 'en', EN)
            t = (k) => {
              try {
                const v = ctx.locale.bind('wsInsight')(k)
                return v == null || v === k ? ZH[k] ?? k : v
              } catch {
                return ZH[k] ?? k
              }
            }
          }
        } catch {
          /* fall back to the local dictionary */
        }
        App._ctx = ctx
        App._t = t
        const TAB_ID = 'dsh-workspace-insight'
        const TAB_KIND = 'workspace-insight'
        const SettingsView = (props) => h(App, { mode: 'settings' })
        const SidebarView = () => h(App, { mode: 'sidebar' })

        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: 'workspace-insight',
              order: 45,
              label: () => t('nav'),
              locale: 'wsInsight',
            },
            SettingsView,
          ),
        )

        // Left-rail entry: the sidebar owns navigation, so the panellist
        // occupant must be a decorative glyph and the page must be a `main`
        // panel registered under the same id. Clicking the rail row switches
        // the main area to that panel; the glyph never handles clicks itself.
        const PANEL_ID = 'workspace-insight'
        const Glyph = ({ size }) =>
          h(
            'svg',
            {
              width: size || 16,
              height: size || 16,
              viewBox: '0 0 16 16',
              'aria-hidden': true,
              style: { display: 'block' },
            },
            h('rect', { x: 2, y: 8, width: 2.6, height: 6, rx: 1, fill: 'currentColor' }),
            h('rect', { x: 6.7, y: 5, width: 2.6, height: 9, rx: 1, fill: 'currentColor', opacity: 0.85 }),
            h('rect', { x: 11.4, y: 2, width: 2.6, height: 12, rx: 1, fill: 'currentColor', opacity: 0.7 }),
          )
        const PanelView = () => h(App, { mode: 'panel' })
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: 'wsInsight' }, PanelView))
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: PANEL_ID, order: 25, locale: 'wsInsight', label: () => t('nav') },
            Glyph,
          ),
        )

        // Optional right-sidebar tab, opened from the right panel's add menu.
        const tabTypes = typeof ctx.get === 'function' ? ctx.get('sidebarRightTabs') : undefined
        const sidebarRight = typeof ctx.get === 'function' ? ctx.get('sidebarRight') : undefined
        if (tabTypes && sidebarRight) {
          ctx.effect(
            () =>
              tabTypes.register({
                id: TAB_ID,
                kind: TAB_KIND,
                title: () => t('nav'),
              }),
            'workspace-insight: sidebar tab type',
          )
          ctx.slots.inject('sidebar.right.pane.tab', () =>
            ctx.slots.register({ name: 'sidebar.right.pane.tab', key: TAB_ID, locale: 'wsInsight' }, SidebarView),
          )
        }

        ctx.effect(
          () => () => {
            App._ctx = null
          },
          'workspace-insight: detach client ctx',
        )
      },
    }
  },
})
