# 验证报告

日期：2026-10-09（Asia/Shanghai）。

## 已执行并通过

- `npm install`：安装成功；使用项目内缓存下载依赖。
- `npm run build`：TypeScript 类型检查及 Vite 生产构建成功，输出至 `dist/`。
- `npm test`：1 个测试文件，13 项通过。
- 测试包含：开盒与确认分离、重复确认幂等、父母先提醒/子女延迟通知、事后确认、离线不覆盖状态、子女联系不代确认、跨日生成去重及结束日期、跳过状态、摘要动态更新与引用来源、拒绝篡改、授权撤销、数据序列化、无 Key/异常/错误模型输出降级、合法服务端输出。
- `npm audit`：升级 Vitest 至 5.0.3 后，安装审计报告 0 vulnerabilities。
- `npm run dev -- --port 5173 --strictPort`：Vite 启动成功，http://localhost:5173/。
- 可选 Node 代理：未配置密钥时，POST /api/summary 返回 `{"mode":"mock"}`，测试进程已关闭。
- HTTP 首页返回 200；这只验证服务入口，不代表浏览器渲染验收。

## 限制与未验证项目

- Browser runtime 返回 No browser is available，浏览器列表为空。因此没有实际浏览器点击、截图、移动端视觉或 PDF 输出验收，不能将单元测试和 HTTP 检查表述为端到端 UI 测试。
- 真实模型调用没有配置 API Key，供应商联调未执行。真实模式输出必须严格通过字段与来源匹配，否则降级。
- LocalStorage 序列化保留经自动测试，但浏览器刷新恢复操作尚未现场验证。
- 打印 CSS 与浏览器原生 print 调用已实现；实际 PDF 分页需在浏览器中复核。

## 已解决的环境问题

默认 npm 离线缓存缺包，改用下载方式安装。沙箱阻止 esbuild 子进程（EPERM），在允许子进程的执行环境验证通过。PowerShell JSON BOM 导致 PostCSS 配置读取失败，改为 UTF-8 无 BOM 后构建通过。

## 建议现场验收

按 README 的 A/B/C 路径操作；重点验证撤销授权后回到交接卡、家庭协作及时间线均被限制，设备离线时父母仍可主动确认，以及打印预览只展示交接卡。
