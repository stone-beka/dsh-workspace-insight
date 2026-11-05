# 插件目录提交文案（dshfind / 插件市场 / awesome 列表）

> 大部分目录是表单提交，字段名略有差异，下面按常见字段整理，直接复制对应段落。

## 名称

```
Workspace insight（工作区洞察）
```

## 一句话简介（≤ 60 字）

```
按活跃度、工作时间和归档状态查看 DSH 的全部工作区与会话，支持月历热力与连续日期时间轴。
```

## 英文一句话（≤ 100 字符）

```
Workspace and session activity dashboard for DSH: overview, month heat calendar, continuous timeline.
```

## 详细介绍（200 字内）

```
DSH 侧栏只显示每个工作区的最近状态。这个插件把全局摊开：
· 总览：工作区活跃度、耗时、近 14 天触达，超 20 天未动标记「建议归档」；
· 月视图：日历格内按当天各工作区会话数比例分色并显示工作区名，附月度摘要（连续活跃、环比）；
· 时间轴：连续日期 × 工作区矩阵，周/月分隔线，悬停看全名、点击直达会话。
所有归档动作走 DSH 自身的 uiWorkspace 服务；只读本地数据，不发网络请求。MIT。
```

## 分类 / 标签

- 分类：工具 / 效率 / 数据可视化
- 标签：`dsh`、`dsh-plugin`、`deepseek-harness`、`workspace`、`sessions`、`dashboard`、`heatmap`、`activity`

## 安装命令

```
dsh plugin --profile web add dsh-workspace-insight
```

安装后硬刷新 Web UI；左侧栏柱状图图标进入，或设置 → 工作区洞察。

## 链接

- 仓库：https://github.com/stone-beka/dsh-workspace-insight
- npm：https://www.npmjs.com/package/dsh-workspace-insight
- Release：https://github.com/stone-beka/dsh-workspace-insight/releases/tag/v0.2.0
- 许可：MIT

## 兼容性

- DSH Web profile（在 `0.2.2-rc.1` 验证）
- Host 端 Node ≥ 20（解压会话日志需要 zstd）
- 无构建步骤、无运行时依赖

## 截图清单（提交时一般要求 1–3 张）

1. `overview.png` — 总览（体现多工作区、建议归档徽标）
2. `month.png` — 月视图（体现比例分色与竖排工作区名）
3. `timeline.png` — 时间轴（体现连续日期、列色、周分隔线）

## 隐私 / 安全说明（有该字段时填）

```
只读取 $DSH_HOME 下的本地文件（工作区注册表、会话投影缓存、会话日志），不发起任何网络请求。
唯一写入为日活跃索引缓存 $DSH_HOME/cache/workspace-insight/。数据不出本机。
```
