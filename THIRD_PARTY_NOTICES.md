# 上游与第三方组件

星幕 TV 基于 LibreSpark/LibreTV 的 Next.js 迁移版本（起始源码归档标识 `9afeb3d`），保留上游版权和 AGPL-3.0-or-later 许可。修改涉及电视遥控界面、老 WebView 兼容、服务端缓存、媒体测速、推荐及 Android 本机服务封装。根目录 `LICENSE` 是完整许可文本；上游说明保存在 `docs/UPSTREAM_README.md`。

- LibreTV：https://github.com/LibreSpark/LibreTV
- Next.js / React / hls.js / core-js 等 Web 组件：精确版本见 `app/package-lock.json`，依赖自身许可不变。静态 hls.js 与 core-js 的许可证在 `app/public/tv/`。
- Android Node.js 及动态库来自官方 Termux ARM 包；下载地址、版本及 SHA-256 见 `runtime-provenance.json`。构建脚本只解包，不执行 Debian 安装脚本。
- Node.js：https://github.com/nodejs/node （其 LICENSE 同时列出内含第三方组件）
- OpenSSL：https://github.com/openssl/openssl
- LLVM libc++：https://github.com/llvm/llvm-project
- ICU：https://github.com/unicode-org/icu
- c-ares：https://github.com/c-ares/c-ares
- zlib：https://github.com/madler/zlib
- SQLite：https://www.sqlite.org/copyright.html
- Termux 包构建源：https://github.com/termux/termux-packages

可分发的上游许可证文本附于 `licenses/`。ADB、Android SDK、JDK 和签名私钥不包含在本仓库或 APK 中。
# 本地推荐数据说明

本地数据版附带从豆瓣与 MDBList 返回的公开片单、评分、来源时间和既有海报快照。烂番茄评分通过 MDBList 整理，保留可用的原站评分链接。代码许可证不改变第三方海报、数据及品牌标识的权利归属。数据文件和校验值随 Release 提供，来源不代表合作或官方背书。

## 手机版本地文字识别

实验性广告识别使用 Tesseract.js 6.0.1、tesseract.js-core 6.1.2（Apache-2.0）与 Tesseract 简体中文/英文 LSTM 模型。上游：https://github.com/naptha/tesseract.js 、https://github.com/naptha/tesseract.js-core 、https://github.com/naptha/tessdata 。许可文本随 `app/public/mobile/ocr/` 附带，版本、下载来源与文件校验见 `mobile/ocr-provenance.json`。画面识别在本机 Web Worker 内进行，不上传视频或截图。
