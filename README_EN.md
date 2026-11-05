# dsh-workspace-insight

[![npm version](https://img.shields.io/npm/v/dsh-workspace-insight.svg)](https://www.npmjs.com/package/dsh-workspace-insight) [![license](https://img.shields.io/npm/l/dsh-workspace-insight.svg)](LICENSE)

A workspace and session activity dashboard for the **DSH Web UI**: see which workspaces are alive, what sessions they ran, how much time they took — and which ones you can safely archive.

[中文](README.md) | English

## Why

DSH keeps every conversation, but the sidebar only shows the latest state. Once you have dozens of workspaces and hundreds of sessions, three questions get hard:

1. Which workspaces am I still using?
2. Which days did I work, and on what?
3. Which sessions can I archive — and what am I archiving?

This plugin answers all three from local data only. Nothing leaves the machine.

## Install

```sh
dsh plugin --profile web add dsh-workspace-insight
```

Then hard-refresh the Web UI (Ctrl/Cmd + Shift + R). A bar-chart icon appears in the left rail; clicking it switches the main area to **Workspace insight**. The same page is also available under Settings.

Uninstall:

```sh
dsh plugin --profile web remove dsh-workspace-insight
```

## Views

### Overview

One row per workspace: last used, session count, turns, model + tool time, 14-day touch sparkline. Workspaces untouched for 20+ days that still hold sessions get an **archive candidate** badge. Expand a row to open / archive / unarchive individual sessions.

### Month

A calendar where each day cell is split **proportionally** by each workspace's session count that day, colored with that workspace's column color and labelled with its name (vertical text). Click a colored band to filter to that workspace; click elsewhere to select the day. The summary line shows active days, conversations, workspaces, longest streak and month-over-month change.

### Timeline

Rows are calendar days (continuous — no skipped days), columns are workspaces (fixed color, grouped by recency band ≤7 / 8–14 / 15–21 / 21+ days, sorted by newest session inside a band). Weekly boundaries are dashed, month starts are solid. Each cell lists that day's conversations; hover shows the full title, click opens the session. `Show all` expands every conversation, `Columns n/40` hides columns, zoom is continuous (Ctrl/Cmd + wheel), wheel scrolls, drag pans.

## Data (read-only)

| Source | Used for |
|---|---|
| `$DSH_HOME/storages/workspace.json` | workspaces, session membership, archived session ids |
| `$DSH_HOME/storages/session_projcache/sessions/*.json` | title, createdAt, turns, llmMs/toolMs, tokens, last prompt time |
| `$DSH_HOME/sessions/**/*.zstd` | session logs; frame-by-frame zstd decompression to extract per-day activity |

- The plugin never writes session or workspace state. Archive actions go through DSH's own `uiWorkspace` service.
- Daily index cache: `$DSH_HOME/cache/workspace-insight/session-days.v3.json`, updated incrementally by file size + mtime. First scan takes roughly 5–10 s; later loads are ~100–300 ms. The scan yields to the event loop every 40 files.
- Overview recomputes at most once a minute, the activity index once every 5 minutes (`?refresh=1` forces a refresh).

## Limits

- Only sessions that exist in `session_projcache` are counted.
- Units are "session-days", not message counts; one conversation used on 3 days counts as 3.
- `llmMs/toolMs` is local timing, not billing.
- The plugin reads DSH internal storage. A major DSH storage-format change will surface a warning instead of wrong numbers — patches welcome.
- Requires Node ≥ 20 for the Host half (zstd support).

## License

MIT
