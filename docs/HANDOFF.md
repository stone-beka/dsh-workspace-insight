# 交接：宣传视频（新会话从这里开始）

> 这个文件是给「做宣传视频」的新会话看的。插件本身在 `C:\Users\23077\Desktop\work_place\dsh-plugins\workspace-insight`（不是当前工作区「智慧树」）。

## 宣传片已完成（2026-11-05）

- 成片：`docs/launch/promo.mp4`（1920×1080 · 30fps · 31s · −14 LUFS），封面 `docs/launch/promo-cover.png`
- 源码工程：`C:\Users\23077\Desktop\work_place\dsh-plugins\workspace-insight-promo\`
  （`brief.md` 分镜、`index.html`/`views.js` 画面、`timeline.js` 时钟、`score.mjs` 配乐）
- 重建：`cd <promo> && sh build.sh --dpr 2`（先跑确定性检查，再出片 + 文字框景 + 技术验收，约 4–5 分钟）
- B 站文案：promo 工程的 `docs/b站文案.md`
- **画面全部用 Canvas 重绘的示意界面，没有录屏；工作区名/会话/日期分布都是编的**，只有「≈40 个工作区、84 天、400+ 段对话」这个量级来自本仓库 README。改文案时别把这些说成真实数据。
- 技术验收全 PASS（尺寸/帧率/时长/音轨/无黑帧/响度/真峰值）；`qa/` 下有接触表、手机尺寸抽帧和审片材料。

## 一句话现状

插件 **已开源发布**：npm `0.2.1` 是 `latest`（含「今日热力」+ 月视图重做），GitHub 仓库和 `v0.2.1` Release 都在，本机以 `link:` 方式装在 `desktop` profile 里，改代码即时生效。

- 仓库：https://github.com/stone-beka/dsh-workspace-insight
- npm：https://www.npmjs.com/package/dsh-workspace-insight
- Release：https://github.com/stone-beka/dsh-workspace-insight/releases/tag/v0.2.1
- 最新提交：`0183c66`（`main` 与远端同步，工作区干净）

## 发布出去的包

- 包名 `dsh-workspace-insight`，版本 `0.2.1`，11 个文件 / 39.5 kB
- 安装：`dsh plugin --profile web add dsh-workspace-insight`（装完硬刷新）
- 许可 MIT；Host 端需要 Node ≥ 20

## 视频怎么演示（镜头清单）

入口：左侧栏柱状图图标 → 主区域切到「工作区洞察」；设置 → 工作区洞察也能进。

| 顺序 | 画面 | 要说的话 | 建议时长 |
|---|---|---|---|
| 1 | 总览默认页，慢慢往下滚 | 几十个工作区一行一个，最近使用、会话数、耗时；超 20 天没动的有「建议归档」徽标 | 8–10s |
| 2 | 点开一行，露出会话列表 | 能直接打开/归档，归档走 DSH 自己的服务 | 5s |
| 3 | 切月视图，指格子 | 每天格子按当天各工作区对话数**比例分色**，竖排写着工作区名；点某一段就筛这个工作区 | 10s |
| 4 | 月视图顶部摘要 | 活跃天数、对话数、连续活跃、环比上月 | 4s |
| 5 | 切时间轴 | 行是连续 84 天、列是 40 个工作区，列有固定色；周与周之间虚线、月份实线 | 10s |
| 6 | 时间轴：悬停 → 点击某条对话 | 悬停看完整标题，点击直达会话 | 6s |
| 7 | Ctrl+滚轮缩放 / 左键拖动 | 缩放看密度，拖动平移 | 5s |
| 8 | 收尾画面 | 一条命令安装，只读本地、不联网、MIT | 5s |

**录屏注意**：会话标题可能含私人内容，挑一个不敏感的月份演示，或者事后打码。

## 文案素材（都在 `docs/launch/`）

- `README.md` — 发布清单、截图怎么截、统一口径
- `v2ex.md` / `jike.md` / `sspai.md` / `dshfind.md` / `bilibili.md` — 各平台文案，B 站那份含 30 秒口播稿和时间轴章节
- 截图放 `docs/launch/img/`：`overview.png`、`month.png`、`timeline.png`

## 发 npm（0.2.1 踩过的坑，下次照这个来）

账号开了 2FA，方式是 **security key**（没有验证器 App，所以没有 6 位码）。`npm publish` 必须过一道浏览器授权：

1. 在**真实控制台**里跑 `npm publish --access public`（PowerShell/CMD 窗口都行）。**不要**把输出重定向到文件、也不要用隐藏窗口——npm 拿不到 TTY 就直接 `EOTP` 失败，连授权页都不给你。
2. 看到 `Press ENTER to open in the browser…` 后回车，浏览器会打开 `https://www.npmjs.com/auth/cli/...`，用安全密钥（Windows Hello 指纹/PIN，或硬件钥匙）完成验证。
3. 成功后 npm 返回 `202` + “Your package is being processed”，**registry 里要 1–2 分钟**才出现新版本、`dist-tags.latest` 随后才更新，别急着查。
4. 自己写脚本轮询 `/-/v1/done?authId=` **行不通**：授权会话绑在活着的 CLI 进程上，CLI 一退出就 404。
5. 长期方案：给包配 **Trusted Publishing**（GitHub OIDC）——workflow 用 `id-token: write` + `npm publish --provenance`，推 tag 自动发版，不需要安全密钥。

## 只剩这些待办

1. 截图/GIF（需要有界面的人来截）
2. **撤销聊天里暴露的 npm token**：https://www.npmjs.com/settings/~/tokens （本机 `.npmrc` 现在用的是 0.2.1 发布时 `npm login --auth-type=web` 新发的 session token；旧 token 还在的话要删）
3. 配 **Trusted Publishing**（GitHub Actions OIDC）替代 `NPM_TOKEN`：npm 包设置里加 trusted publisher，workflow 改成 Node 22 + `--provenance`（工作流已带守卫，未配置时不会失败）
4. 清掉 npm 上的 `0.0.0-stage` 占位：`npm unpublish dsh-workspace-insight@0.0.0-stage`
5. 提交插件目录（`docs/launch/dshfind.md`）

## 排障速查

- **改了 Host 代码**（`index.js`）：需重启该插件行（`include:workspace-insight` off → on）才生效
- **改了 Client 代码**（`client.js`）：自动重建，浏览器硬刷新即可
- **首次打开很慢**：日索引首次扫描 5–10 秒，之后 100–300ms
- **出现黄色警告条**：存储格式探测命中（注册表/投影缓存/日志版本），先看警告文字
- **插件入口不见了**：确认 Settings → Plugins 里 `dsh-workspace-insight` 是启用状态
