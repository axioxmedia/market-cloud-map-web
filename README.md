# 市场云图（看盘辅助）

本地多市场热力云图：A 股 / ETF / 可转债 / 港股。  
**无需本地服务器**：保持本目录结构完整，双击 `index.html` 即可（`file://`）。

## 如何打开

1. 用资源管理器进入本目录 `web/`
2. **双击** `index.html`，用 Chrome / Edge / Firefox 打开
3. 若浏览器拦截本地脚本：对本页允许文件访问，或从本目录整夹打开（不要只拷贝单个 html）

也可用：

```bash
xdg-open /workspace/market-cloud-map/web/index.html
# 或
open /workspace/market-cloud-map/web/index.html
```

**不要**把 `index.html` 单独挪走；相对路径依赖：

```
web/
  index.html
  css/style.css
  js/app.js
  data/meta.js a.js etf.js cb.js hk.js
  vendor/echarts.min.js
```

## 功能

- 四个市场 Tab 切换
- Treemap：面积 = 规模类指标，颜色 = 涨跌幅（**红涨绿跌**）
- 面积指标切换（A/ETF：流通市值 / 总市值 / 成交额；转债：发行规模；港股：成交额）
- 滚轮缩放、拖拽平移（ECharts `roam`）
- 悬停：代码、名称、涨跌幅、最新价、面积字段

## 数据日期与口径

| 项 | 说明 |
|----|------|
| 参考交易日 | **2026-10-16** |
| 快照时间 | 约 2026-10-16 15:31–15:40（Asia/Shanghai） |
| 来源 | AKShare → 东方财富公开行情本地快照（非实时） |
| A 股点数 | 约 5568（有价+涨跌幅且有面积字段） |
| ETF | 约 1653 |
| 可转债 | 约 307（东财比价表 join 一览表发行规模） |
| 港股 | 约 2441（成交额 > 0） |

字段精简键：`c` 代码、`n` 名称、`p` 涨跌幅%、`px` 最新价、`circ`/`tot`/`amt`/`scale` 面积。

## 离线说明

- 图表库为本地 `vendor/echarts.min.js`，**无 CDN**，断网也可打开。
- 数据为 `data/*.js` 全局变量注入（避免 `file://` 下 `fetch` JSON 被浏览器拦截）。

## 刷新数据

在项目根目录：

```bash
cd /workspace/market-cloud-map
.venv/bin/python fetch_spot.py          # 重新拉取上游快照到 data/
.venv/bin/python build_web_data.py      # 重新生成 web/data/*.js
```

然后重新打开（或刷新）`index.html`。

## 已知限制

1. 一日静态快照，非盘中推送。
2. 港股无市值，面积仅成交额；部分标的无成交额已过滤。
3. 可转债行情条数少于全市场一览（东财比价表覆盖在市约 300+）。
4. A 股未做行业分层（板块成分需另任务）。
5. 上游接口限流 / ToS：仅作个人看盘辅助与学习，请自行评估使用合规性。
6. 本工具为自写实现，**未逆向**任何第三方云图网站。
