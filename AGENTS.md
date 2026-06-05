# AGENTS.md

## 协作约束

### 禁止批量删除

禁止批量删除文件或目录。

不要使用：

- `del /s`
- `rd /s`
- `rmdir /s`
- `Remove-Item -Recurse`
- `rm -rf`

需要删除文件时，只能一次删除一个明确路径的文件。

正确示例：

```powershell
Remove-Item "C:\path\to\file.txt"
```

如果需要批量删除文件，应停止操作，并请求用户手动删除。

## 项目概述

这是一个 Chrome 浏览器扩展，名称为 **范围随机定时刷新**。扩展使用 Manifest V3，在用户设置的秒数区间内随机生成下一次刷新时间，并刷新目标标签页。扩展图标角标会显示倒计时秒数。

当前版本：**1.5**

## 当前目录结构

```text
auto-refresh/
├── .git/              # Git 仓库数据
├── AGENTS.md          # 项目说明与协作约束
├── background.js      # Manifest V3 Service Worker，负责调度、刷新和状态持久化
├── manifest.json      # Chrome 扩展清单
├── popup.html         # 扩展弹窗界面
├── popup.js           # 弹窗交互逻辑
└── refresh.png        # 扩展图标
```

项目没有构建脚本、包管理文件或外部依赖，直接作为 Chrome 扩展源码使用。

## manifest.json

- 使用 `manifest_version: 3`。
- 扩展名称：`范围随机定时刷新`。
- 当前版本：`1.5`。
- 后台脚本：`background.js`，以 `service_worker` 方式运行。
- 默认弹窗：`popup.html`。
- 图标文件：`refresh.png`，用于 16、48、128 尺寸以及扩展主图标。
- 权限：
  - `tabs`：查询和刷新标签页。
  - `storage`：持久保存刷新配置和运行状态。
  - `alarms`：在 MV3 Service Worker 生命周期中持久调度下一次刷新。

## background.js 核心逻辑

### 状态模型

默认状态保存在 `DEFAULT_STATE` 中：

- `isRunning`：是否正在运行随机刷新。
- `minSec`：最小秒数，默认 `8`。
- `maxSec`：最大秒数，默认 `10`。
- `targetTabId`：启动刷新时记录的目标标签页 ID。
- `targetWindowId`：启动刷新时记录的目标窗口 ID。
- `nextRefreshAt`：下一次刷新时间戳。

状态通过 `chrome.storage.local` 持久保存。`getState()` 会读取存储并与默认值合并，`saveState()` 用于写入局部状态更新。

### 刷新调度

- 随机秒数算法：`Math.floor(Math.random() * (max - min + 1)) + min`，包含区间两端。
- `scheduleNextRound()` 会读取当前状态，生成下一次刷新时间 `nextRefreshAt`，并同时设置：
  - `chrome.alarms.create()`：作为 Service Worker 被卸载后的唤醒调度。
  - `setTimeout()`：在当前 Service Worker 存活期间尽量精确触发刷新。
  - `setInterval()`：每秒更新扩展图标角标倒计时。
- `handleRefreshDue()` 负责处理到点刷新，并用 `refreshInProgress` 防止 alarm 和 timeout 同时触发造成重复刷新。

### 标签页刷新策略

- 优先刷新启动时记录的 `targetTabId`。
- 如果目标标签页已不存在或刷新失败，会清空目标标签信息。
- 目标标签不可用时，回退刷新 `lastFocusedWindow` 中当前活跃标签页，并把它记录为新的目标标签。

### 消息接口

`background.js` 监听来自弹窗的消息：

- `start`：接收 `min` 和 `max`，记录当前活跃标签页为刷新目标，启动随机刷新。
- `stop`：停止刷新，清理本地 timer、清理 alarm、清空角标，并把运行状态设为停止。
- `getState`：返回当前持久状态，供弹窗打开时恢复输入值。

### 角标显示

- 使用 `chrome.action.setBadgeText()` 显示剩余秒数。
- 使用 `chrome.action.setBadgeBackgroundColor()` 设置角标背景色。
- 当前角标背景色：`#b8a2e8`。
- 停止运行或状态无效时会清空角标。

### 生命周期恢复

文件末尾会调用 `restoreAutoRefresh()`：

- 如果持久状态显示仍在运行，并且存在 `nextRefreshAt`，会重新创建 alarm。
- 如果下一次刷新时间已经到期，会立即进入刷新处理。
- 如果还未到期，会恢复 timeout 和角标倒计时。

## popup.html 界面

- 弹窗宽度：`220px`。
- 背景色：`#f8f5fc`。
- 主色：浅紫色系。
- 标题：`随机定时刷新`。
- 输入框：
  - `minTime`：最小秒数，HTML 默认值 `8`。
  - `maxTime`：最大秒数，HTML 默认值 `10`。
- 按钮：
  - `开始随机刷新`
  - `停止刷新`

## popup.js 交互逻辑

- 打开弹窗时发送 `getState` 消息，从后台读取状态，并把 `minSec`、`maxSec` 填回输入框。
- 输入框变化时调用 `saveInputs()`，把当前输入保存到 `chrome.storage.local`。
- 点击开始按钮时：
  - 读取输入值。
  - 校验：最小值必须大于等于 `1`，最大值必须大于最小值。
  - 发送 `start` 消息给后台。
  - 后台响应成功后关闭弹窗。
  - 失败时恢复按钮并弹出错误提示。
- 点击停止按钮时：
  - 发送 `stop` 消息给后台。
  - 后台响应成功后关闭弹窗。
  - 失败时恢复按钮并弹出错误提示。

## 用户工作流程

1. 用户点击扩展图标，打开 `popup.html`。
2. 弹窗读取已保存设置，默认显示 `8` 到 `10` 秒。
3. 用户点击“开始随机刷新”。
4. 后台记录当前活跃标签页作为刷新目标。
5. 后台随机生成下一次刷新时间。
6. 扩展图标角标每秒显示剩余秒数。
7. 到点后刷新目标标签页。
8. 刷新后重新随机生成下一轮时间。
9. 用户点击“停止刷新”后，后台清理 timer、alarm、运行状态和角标。

## Git 状态

- 当前目录已经初始化为 Git 仓库。
- 默认分支为 `main`。
- 远程仓库为 GitHub：`https://github.com/chdphhdhz/auto-refresh.git`。

## 验证方式

当前项目没有自动化测试脚本。可用以下命令做基础语法检查：

```powershell
node --check background.js
node --check popup.js
Get-Content -Encoding UTF8 manifest.json | ConvertFrom-Json | Out-Null
```

安装或重新加载扩展后，可在 Chrome 的扩展管理页手动验证：

1. 打开 `chrome://extensions/`。
2. 启用开发者模式。
3. 加载此目录作为已解压扩展。
4. 点击扩展图标，确认默认时间为 8 秒和 10 秒。
5. 点击开始，观察角标倒计时和标签页刷新。
6. 点击停止，确认角标清空且不再刷新。

## 已知注意事项

- 该扩展会刷新网页，未保存表单内容可能丢失。
- 当前逻辑优先刷新启动时记录的标签页，而不是每次都刷新当前正在看的标签页。
- Manifest V3 Service Worker 可能被 Chrome 卸载，因此代码同时使用 `chrome.alarms` 和本地 timer。
- Chrome alarm 更适合作为持久唤醒机制；非常短的秒级刷新更依赖 Service Worker 当前存活时的 `setTimeout`。
- 弹窗输入变化会直接写入 `chrome.storage.local` 的 `minSec`、`maxSec`。
