# 星幕 TV · Starlight TV

提供适配遥控器大屏的星幕 TV，以及适配触摸操作的星幕手机版。基于 [LibreSpark/LibreTV](https://github.com/LibreSpark/LibreTV) 的 Next.js 版本改造，服务端随 APK 在 Android 设备本机运行，无需电脑常开。

**[下载手机版 beta13](https://github.com/liukaixuan1163523145-web/starlight-tv/releases/tag/v1.2.0-mobile-beta13)** · **[下载 TV 版](https://github.com/liukaixuan1163523145-web/starlight-tv/releases/tag/v1.1.2-local)** · [手机操作与构建](docs/MOBILE.md) · [安装与操作](docs/USAGE.md) · [从源码构建](docs/BUILD.md) · [上游与许可证](THIRD_PARTY_NOTICES.md) · [赞助支持](#支持项目)

![星幕 TV](android/res/drawable/tv_banner.png)

## 选择安装包

| 设备 | 版本 | 安装包与状态 |
| --- | --- | --- |
| Android 手机 | [1.2.0-mobile-beta13](https://github.com/liukaixuan1163523145-web/starlight-tv/releases/tag/v1.2.0-mobile-beta13) | ARM64 测试版；已在小米 17 Pro Max / Android 16 安装、启动，具体验证边界见发布说明 |
| Android TV | [1.1.2-local](https://github.com/liukaixuan1163523145-web/starlight-tv/releases/tag/v1.1.2-local) | ARMv7 本地数据版；本次保留已有安装包，不移植手机专属功能 |

两个版本均无需 API Key，普通使用者只下载对应 APK；包名不同，可以并存。已安装同版应用时直接覆盖更新，保留历史和设置。首次启动预留至少 1 GiB 空间。

## 手机版新增功能

- 触屏海报与分段选集、默认沉浸全屏、横竖屏选择、手势亮度/音量与短时提示条。
- 本地推荐与评分、缺失海报按需下载后缓存、匹配同名同年同类的多个语言版本。
- 流畅来源优先，再比较原声语言标注、已知清晰度与媒体测速；保留手动选源。
- 明确播放失败或持续卡顿时按质量尝试备用源，保留同集进度与倍速；最多尝试 3 个备用记录，排除缺集或时长明显不匹配者。
- 原声与分辨率标注不是片源质量保证；不同剪辑版本的进度可能偏移。自动广告识别仍属实验功能，真实遮挡效果待进一步验证。

## TV 版功能

- 遥控器方向键、确认、返回；专用选集、来源和播放面板。
- 影片搜索、模糊名称匹配、来源切换、快进快退与 0.5–2 倍速。
- 直播分类、高清线路、备用源与失败切换；当前内置 67 个频道，包含央视 1–17。
- 逐个测量实际媒体片段，显示 Mbps 和连接时间，一键选择最快来源。
- 豆瓣推荐和通过 MDBList 获取的烂番茄评分；推荐展示前检查可用来源。
- 本地数据版内置推荐、评分和海报，不需要 API Key，不联网更新片单。
- 本地缓存中心查看真实条目数量与海报占用；片单标注原始数据日期。

## TV 版当前版本

**1.1.2-local** 是无需 API Key 的本地数据版，安装包自带公开片单和海报快照。保留原应用 ID 与签名，可覆盖旧版本并保留配置与历史。

需要联网补充推荐、使用自己的 MDBList Key，可选择仍保留的 [1.1.1 联网版](https://github.com/liukaixuan1163523145-web/starlight-tv/releases/tag/v1.1.1)。本地版即使检测到旧 Key 也不会调用 MDBList。

目前发布 **ARMv7 / Android 9（API 28）** 构建，在一台小米电视及旧版 WebView 66 环境完成前版功能实测。其他芯片、系统版本及电视型号尚未逐一验证。Android 10 及更新系统的应用私有目录可执行文件限制可能影响内置 Node 运行，不承诺兼容。

首次启动需要解包本地服务、片单和海报，耗时比联网版长。打开应用后电脑可以关机，无需另装 Termux。APK 不包含个人 API Key、登录密码或观看记录。

内置豆瓣 3,967 部（164 页），以及通过 MDBList 整理的 2,901 部电影和 1,622 部剧集的烂番茄评分。两套片单存在重合，不能相加当成不重复影片总数。海报实际数量与快照 SHA256 见 [数据清单](local-data-manifest.json)。缺少的海报显示占位文字，不影响按片名搜索。

本地版不向豆瓣、MDBList 或海报网站请求推荐更新。评分是快照，并非实时评分；更新片单需安装后续本地数据版。搜索、来源可用性检查、测速和影片/直播播放仍需联网；缓存不包含完整影片。

## 来源与维护

影视和直播接口由外部站点提供，可能变动或失效。自动测速是短片段采样，不是带宽保证；备用源不能保证永久可用。本项目不存储影片、不提供付费授权或绕过播放限制。请配置你有权访问的来源。

根目录许可证沿用 **AGPL-3.0-or-later**。这是独立改造项目，不是 LibreTV 官方发行版。完整 Web/服务端代码位于 `app/`，Android 外壳位于 `android/`，手机适配位于 `mobile/`。构建 TV 1.1.2-local 请检出 `v1.1.2-local` 标签；手机 beta13 使用 `v1.2.0-mobile-beta13`，避免将新共享代码误当成旧 TV APK 的源码。

## 支持项目

如果星幕 TV 对你有帮助，欢迎自愿赞助，支持电视兼容性改进、问题修复和文档维护。

**[通过 Wise 赞助星幕 TV](https://wise.com/pay/me/liukaixuanl)**

**PayPal：使用 PayPal App 扫描下方收款码**，并在付款前核对收款人为 **KAIXUAN LIU**。

<a href="https://www.paypal.com/qrcodes/p2pqrc/8CRQPPS3MX2MA"><img src="docs/assets/paypal-qr.jpg" alt="KAIXUAN LIU 的 PayPal 收款二维码" width="280"></a>

[打开 PayPal 收款码链接](https://www.paypal.com/qrcodes/p2pqrc/8CRQPPS3MX2MA)。电脑浏览器可能跳转到 PayPal 应用介绍页，此时请改用 PayPal App 扫码；尚未进行实际付款验证。

赞助不会解锁额外影片、播放源或会员权限，也不附带专属售后或永久更新承诺。项目继续按 AGPL-3.0-or-later 提供源码，是否赞助不影响现有功能的使用。
