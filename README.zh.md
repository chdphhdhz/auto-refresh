# 范围随机定时刷新

这是一个轻量级 Chrome 扩展，可以在用户设置的时间区间内随机刷新目标标签页。扩展使用 Manifest V3，并会在扩展图标角标上显示剩余倒计时秒数。

## 功能

- 在最小秒数和最大秒数之间随机生成刷新间隔。
- 默认时间范围：8 到 10 秒。
- 扩展图标角标显示倒计时。
- 使用 `chrome.storage.local` 持久保存设置。
- 使用本地 timer 和 `chrome.alarms` 适配 Manifest V3 Service Worker 生命周期。
- 可在弹窗中开始和停止刷新。
- 无外部依赖，无需构建步骤。

## 项目结构

```text
auto-refresh/
├── AGENTS.md
├── README.md
├── README.zh.md
├── background.js
├── manifest.json
├── popup.html
├── popup.js
└── refresh.png
```

## 文件说明

- `manifest.json`：Chrome 扩展清单，包含权限、弹窗、图标和后台 Service Worker 配置。
- `background.js`：核心调度逻辑，负责刷新标签页、更新角标倒计时和保存运行状态。
- `popup.html`：扩展弹窗界面。
- `popup.js`：弹窗输入、校验、设置保存和后台消息交互逻辑。
- `refresh.png`：扩展图标。
- `AGENTS.md`：项目说明和协作约束。

## 安装方式

1. 打开 Chrome，进入 `chrome://extensions/`。
2. 开启右上角的 **开发者模式**。
3. 点击 **加载已解压的扩展程序**。
4. 选择当前项目文件夹。
5. 扩展会出现在 Chrome 工具栏中。

## 使用方法

1. 点击扩展图标。
2. 输入最小刷新秒数和最大刷新秒数。
3. 点击 **开始随机刷新**。
4. 弹窗关闭，扩展图标角标开始显示倒计时。
5. 倒计时归零后，目标标签页会被刷新。
6. 再次点击扩展图标，并点击 **停止刷新**，即可停止刷新循环。

## 运行逻辑

点击开始后，扩展会记录当前活跃标签页作为目标标签页。后续刷新会优先刷新这个记录的标签页。如果该标签页已关闭或不可用，扩展会回退刷新最后聚焦窗口中的当前活跃标签页，并把它记录为新的目标标签页。

扩展会把运行状态、时间范围、目标标签信息和下一次刷新时间保存到 `chrome.storage.local`。同时使用 `chrome.alarms` 在 Manifest V3 Service Worker 被 Chrome 挂起后辅助恢复调度。

## 验证方式

当前项目没有自动化测试脚本。可以使用以下命令做基础语法检查：

```powershell
node --check background.js
node --check popup.js
Get-Content -Encoding UTF8 manifest.json | ConvertFrom-Json | Out-Null
```

之后在 Chrome 扩展管理页重新加载已解压扩展，手动验证弹窗、角标倒计时、开始刷新、实际刷新和停止刷新。

## 注意事项

- 刷新网页可能导致未保存的表单内容丢失。
- 非常短的刷新间隔依赖 Service Worker 在当前周期内保持存活。
- `chrome.alarms` 用于 Manifest V3 Service Worker 生命周期下的持久调度和恢复。
- 该扩展不需要 npm、打包工具或第三方库。
