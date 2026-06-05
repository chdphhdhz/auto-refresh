# 项目概述：范围随机定时刷新（Chrome 扩展）

## 项目简介

这是一个 Chrome 浏览器扩展（Manifest V3），功能是在用户设定的时间区间内**随机刷新当前标签页**。图标上会显示倒计时数字，方便用户知道下一次刷新还有多久。

## 版本

当前版本：**1.4**

## 文件结构

```
auto-refresh/
├── manifest.json      # Chrome 扩展清单（V3）
├── background.js      # 后台 Service Worker —— 核心逻辑
├── popup.html         # 弹出窗口 UI
├── popup.js           # 弹出窗口交互逻辑
└── refresh.png        # 扩展图标（128x128）
```

## 核心架构

### manifest.json
- 使用 **Manifest V3** 规范
- 权限：仅需 `tabs` 权限（查询和刷新当前标签页）
- 后台脚本以 `service_worker` 形式运行（`background.js`）
- 图标统一使用 `refresh.png`

### background.js —— 核心逻辑
- **随机刷新引擎**：在用户设定的 `minSec` ~ `maxSec` 区间内生成随机秒数，到期后刷新当前活跃标签页
- **倒计时显示**：通过 `chrome.action.setBadgeText()` 在图标上显示剩余秒数，背景色为淡紫色（`#b8a2e8`）
- **状态机**：`isRunning` 标志控制运行/停止
- **消息监听**：
  - `start` 消息：接收 `min` 和 `max` 参数，开始循环刷新
  - `stop` 消息：完全停止，清除定时器和角标
- **生命周期**：监听 `chrome.runtime.onSuspend`，浏览器关闭时自动清理

### popup.html —— 弹出窗口 UI
- 宽度 220px，浅紫色主题（`#f8f5fc` 背景）
- 两个数字输入框：最小秒数（默认 10）、最大秒数（默认 30）
- 两个按钮：开始随机刷新 / 停止刷新
- 纯紫色系配色，风格统一

### popup.js —— 弹出窗口交互
- 校验输入：最小值 ≥ 1，最大值必须大于最小值
- 通过 `chrome.runtime.sendMessage` 向后台发送 start/stop 指令
- 点击按钮后自动关闭弹窗（`window.close()`）

## 工作流程

1. 用户点击扩展图标 → 弹出设置窗口
2. 用户设置最小/最大秒数，点击"开始随机刷新"
3. 后台生成一个 [min, max] 区间的随机秒数
4. 每秒更新图标角标倒计时
5. 倒计时归零 → 刷新当前标签页 → 生成新的随机秒数 → 进入下一轮
6. 用户可随时点击"停止刷新"终止循环

## 技术要点

- 无外部依赖，纯原生 Chrome Extension API
- 随机算法：`Math.floor(Math.random() * (max - min + 1)) + min`，包含两端
- 倒计时使用 `setInterval` 每秒执行，刷新后延迟 100ms 再开始下一轮（避免竞态）
- 所有清理操作集中在 `fullStop()` 函数中，确保停止时不会残留定时器或角标

## 注意事项

- 该扩展会刷新**当前窗口的活跃标签页**，如果有未保存的表单数据，刷新会导致数据丢失
- 只刷新活跃标签页，不会影响后台标签页
- Manifest V3 的 Service Worker 可能在空闲时被 Chrome 卸载，长时间运行可能受影响
