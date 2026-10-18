# 星幕手机版

`1.2.0-mobile-beta13` 是面向 ARM64 Android 手机的本地片库测试版，首个目标设备为用户的小米 17 Pro Max。手机端的 APK、桌面入口和私有数据独立于电视版，可同时安装；本轮不升级电视上的应用。

## 手机操作

- UI 由 Claude 设计，采用墨黑、暖白和琥珀色的「放映厅」风格；设计稿、实施入口和范围见 [MOBILE-DESIGN.md](MOBILE-DESIGN.md)。竖屏三列海报，小屏自动两列，底部为发现、直播、记录及拇指区搜索。
- 首页优先显示继续观看，点卡片直接续播。片单海报用于搜索，进入详情后选择来源和集数，再点底部播放按钮；超过 30 集分段。搜索框支持触屏键盘和回车提交。
- beta8 开始播放时默认进入 Android 沉浸全屏，隐藏状态栏和导航栏；退出播放器恢复系统栏。保留既有横竖屏选择，全屏按钮可手动切换；返回先关闭设置面板，再回选集或频道页。
- 播放页支持暂停、前后 10 秒、两侧双击跳转、进度拖动、0.5–2 倍速，以及横竖屏布局和全屏请求。三秒后收起控制栏，点画面显示；倍速、选集和换源在设置面板中。
- 直播支持频道搜索、高清筛选、上一台、下一台和换线路。返回依次收起设置面板、退出全屏、回到选集或频道列表。缓存入口在记录页。
- 内置与电视本地版相同的推荐、评分和海报快照，无需 API Key；搜索、测速、可播检测和播放需要联网。所有页面海报优先读取内置及已下载缓存，缺图时按需联网下载至独立缓存，之后复用；推荐片单仍离线读取。预留至少 1 GiB 空间供首次解包。

## 构建入口

共用 Web 服务端、TV 业务逻辑与 Android 生命周期代码。手机覆盖项位于 `mobile/`，生成文件在 `app/public/mobile/`。更新共享 TV 模块时先运行 `scripts/assemble-tv.py`；它与 `scripts/assemble-mobile.py` 的受检替换若不匹配，应修订适配器，而非静默跳过。

在 [BUILD.md](BUILD.md) 的 Web 构建完成后，从仓库根目录执行：

```powershell
python scripts/assemble-mobile.py
python scripts/prepare-runtime.py --arch arm64
python scripts/download-local-data.py
python scripts/package-payload.py --flavor mobile --local-data .build/Starlight-TV-1.1.2-local-data.zip
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-apk.ps1 -Flavor mobile
```

SDK、JDK 和签名参数沿用 BUILD.md。输出为 `dist/Starlight-1.2.0-mobile-beta13-arm64-v8a.apk`。运行时校验来源是 `runtime-provenance-arm64.json`，构建文件隔离在 `.build-mobile/`；电视构建的默认参数未变。

手机包名 `app.starlight.mobile`，本地服务监听 `127.0.0.1:8081`。`mobile/android/AppConfig.java` 提供手机入口与运行时版本后缀；`mobile/android/AndroidManifest.xml` 提供普通手机桌面入口与可旋转窗口。改手机 payload 时同步递增该后缀与 Manifest 版本。

## 验证和兼容边界

- 浏览器测试覆盖 320、360、430、480 像素竖屏和 932×430 横屏；接口用测试数据，本地生成 HLS 视频实际解码，覆盖搜索、选集、进度、倍速、继续观看、直播线路和返回。新版浏览器验证中系统全屏请求被环境拒绝，回退提示正常，真机全屏待验。测试通过不代表公网源仍可用。
- APK 提取服务端检查覆盖随机密码登录、推荐缓存、海报、无密钥启动及推荐零外网请求；使用开发机 Node 执行，因此不替代 Android ARM64 运行测试。
- ARM64 ELF 已检查架构和至少 16 KiB 的 LOAD 对齐。签名与 APK 内容检查和上述报告保存在本机 `outputs/mobile/`。
- beta1 已在小米 17 Pro Max（Android 16）安装、启动，用户反馈多部影片正常播放。后续版本安装与新功能验收以 HANDOFF 为准；尚未覆盖全部旋转、后台和真实直播场景，也未测所有 Android/HyperOS 版本。
- 最低 Android 9 / API 28，当前保留 targetSdk 28 以兼容现有内嵌可执行运行时。这是本地侧载测试包，不是已满足应用商店上架要求的构建。提高 targetSdk 时需同步改造运行时加载方式，不能只改 Manifest 数字。Android 官方说明：[Android 10 应用目录执行限制](https://developer.android.com/about/versions/10/behavior-changes-10#execute-permission)。

包检查命令：

```powershell
python scripts/test-local-package.py --flavor mobile --apk dist/Starlight-1.2.0-mobile-beta13-arm64-v8a.apk --report .build-mobile/package-validation.json
```

触屏测试入口 `scripts/test-mobile.cjs` 使用 Playwright 与本机 Chrome，可通过 `PLAYWRIGHT_MODULE`、`CHROME_PATH` 指定路径。测试前用 FFmpeg 在 `.build-mobile/test-media/` 生成 60 秒、2 秒切片的 HLS 测试视频，主文件为 `fixture.m3u8`、切片为 `segment-%03d.ts`；测试不请求公网片源。

## 自动遮挡与横屏

- 手机播放默认开启本地 OCR 自动遮挡。需命中广告词组合与网址（赞助用语或较明确的商业类别组合），才尝试根据识别框遮住小区域；单独出现“赌博”等剧情台词不触发。只处理点播，暂停及暂停拖动后各检查一次，切后台停止扫描，换片清除框。识别存在漏报与误报，不能宣称过滤全部广告或替换干净片源。
- 原图标、动画和无法识别的小字可能漏检。遮挡仅盖住画面，不消除原视频广告或广告声音；可点击遮挡右上角取消，或在播放设置关闭识别。手动框选保留作备用。
- “遮挡 + 自动跳过纯广告画面”为单独实验选项，默认不开：连续两次识别、且画面大部分为暗色时才尝试每次前进 3 秒，每次播放最多 18 秒；有撤销。彩色广告和持续水印不会据此强行快进。该策略不等同于语义级视频广告检测。
- 独立播放列表过滤仅处理带明确广告路径的有界、非加密点播片段；光速资源样本没有独立广告标记，因此依靠文字识别辅助遮挡，不能靠列表规则承诺去广告。
- 右上角“横屏/竖屏”按钮通过限定功能的 Android 桥接锁定方向；设置内可选跟随系统/锁定横屏/锁定竖屏。退出播放器恢复系统方向，下一次播放记住选择。浏览器无原生桥接时只尝试浏览器旋转 API。
- OCR 的脚本、WebAssembly 和中英文模型位于 `app/public/mobile/ocr/`，校验见 `mobile/ocr-provenance.json`，画面不上传；首次识别会有模型初始化延迟。`mobile/ad-policy.js` 是判断规则，`mobile/ad-scanner.js` 负责取帧、遮挡定位和生命周期。

本机补充测试：`node scripts/test-ad-policy.cjs` 检查广告组合和剧情台词负例；`app` 的 `poster-cache.test.ts` 与 `vod-ad-filter.test.ts` 检查缓存与保守过滤。真实手机 OCR 耗时、误报率与自动跳过边界仍需持续观察。

Windows 构建注意：若 `app/node_modules` 是指向工作区外的联接，Next standalone 可能报告 symlink EPERM 并缺少依赖。优先在真实依赖目录重新构建。打包脚本会检查 standalone 中的 Next 入口；仍须执行包内启动测试，不能仅凭 `next build` 返回成功就安装。


## 来源质量与播放设置（beta7）

播放设置包含窗口亮度（5–100%，支持跟随系统）、媒体音量、实际清晰度和“此版本有广告”反馈。窗口亮度退出播放器后恢复系统，下次播放记住选择；音量使用系统媒体流，系统可能限制最大音量。清晰度来自当前 HLS 的真实档位，单档显示“原始画质（单一片源）”，当前解码尺寸与原片清晰程度分别呈现。

`mobile/source-catalog.json` 保存经抽测新增的候选来源；装配时按 URL 去重追加，保留旧来源键。来源接口返回、HLS 列表和两段片段通过仅证明抽测时可读取，不证明完整影片、字幕、画质、合法授权或无广告。新增来源当前作补充备选，由用户手机实际测速决定顺序。

`mobile/quality-speed.js` 限制单来源总测量 16 秒、最多两段各 256 KiB 媒体，使用较慢值及波动、连接时间评分；播放或离开页面取消测试，不写失败。成功缓存 1 小时、失败 10 分钟，最多 240 项。`quality-integration.js` 叠加本机失败、缓冲、30 秒播放成功及广告反馈，按影片/集数隔离，历史 7 天有效，最多 240 项。排序不修改原始记录下标；测速失败不会删除来源。

`player-settings.js` 负责窗口亮度、媒体音量和清晰度控件，原生方法在 `android/MainActivity.java`，仅手机开启桥接，设置调用检查本机页面。新增 `MODIFY_AUDIO_SETTINGS` 普通权限，未申请修改系统亮度权限。

回归入口：`node scripts/test-quality-speed.cjs`、`node scripts/test-quality-integration.cjs`、`node scripts/test-player-settings.cjs`；UI 通过 `scripts/test-mobile.cjs --serve` 启动本机测试页检查。公开来源复测运行 `python scripts/audit-sources.py --help` 查看参数；报告保留原始观察，不将开发机网络速度当作手机网络结果。验收状态统一在 HANDOFF。

默认全屏实现入口：`mobile/fullscreen.js` 与 `android/MainActivity.java` 的受限桥接；`node scripts/test-mobile-fullscreen.cjs` 检查进入、退出、手动切换和重开播放的生命周期。真机验收状态以 HANDOFF 为准。


## 手势与原声版本（beta9）

播放画面左半边上下滑调窗口亮度，右半边上下滑调媒体音量，浮层显示百分比。纵向超过 12 像素才进入调整；水平移动、进度条、按钮、面板内部及广告框选不接管。松手抑制紧随的误触点击，新一轮触摸立即解除抑制。点击播放设置外的第一下只收起面板。实现为 `mobile/gestures.js`；亮度/音量调用与滑条共用 `StarlightAV`。

修复推荐详情只保留首个可播来源：点击豆瓣高分或 MDBList 推荐时重新聚合全部同名、同年、同类型的匹配记录，并保留所有语言版本；先对优先候选做原有可播抽测，其他记录显示待测速，不能保证全部可播。普通搜索也将同年同类的语言后缀版本归在一起。续集、季数、年份仍严格区分；“查找其他版本”可扩大搜索，不能为了凑源把不同作品合并。

`cms-parser.ts` 将来源的 `vod_lang` 作为 `language` 传入搜索和详情。`mobile/versions.js` 优先采用片名中明确的国语、粤语、英语等后缀，其次使用该字段；无信息显示“语言未标注”。明确原声和外语标注优先，港台片粤语标注也可优先；这些只是来源声明，不能当作音轨验证。实际抽查有“国语版/粤语版”却填“英语”的错误元数据。当前尚未实现播放音轨切换、字幕选择或自动语音语言识别。

回归：`node scripts/test-mobile-gestures.cjs` 检查手势冲突；`node scripts/test-mobile-versions.cjs` 检查展开推荐、多版本保留、语言优先及重拍/续集排除；CMS 解析器测试覆盖语言字段。构建与安装状态统一见 HANDOFF。


beta10 在播放器两侧加入细竖向亮度/音量条、百分比、“左侧/右侧上下滑”和“↑ 增加 · ↓ 减少”提示。控件显示时提示条半透明，控件收起时淡出；手势操作时对应条高亮，停止后 1.1 秒退回提示状态。设置面板打开时隐藏，所有指示元素不接收触摸，保留原有手势区域。仅手机静态界面变化，后端、依赖和内置数据与 beta9 相同。


beta11 按用户要求缩短提示：每次打开播放器显示两侧指示条和小字 3 秒，之后即使暂停或控件展开也不常驻。手势调节时只高亮当前一侧，最后一次移动后 1.1 秒淡出；打开设置隐藏，关闭设置不重新计时。仅时序和 CSS 改动，保留 beta9 已确认正常的手势和面板收起行为。


### beta12 来源优选

现有来源按流畅程度分层，再优先原声语言标注、清晰度和速度。声明码率需要 35% 测速余量，缺少码率使用保守估算；高清标签不覆盖明显慢速、卡顿、失败或广告反馈。语言与地区用于偏好判断，不等同音轨验证。成功播放 30 秒后保存实际解码尺寸，未知分辨率保持未知。

点击播放时采用当前集已测候选中的推荐来源；手动选择来源后保留该选择，同一播放过程中不自动切源。选集列表与设置页共用排序，原索引不随视觉排序变化；测速严格使用当前集，缺集不会拿末集替代。实现入口为 `mobile/source-ranking.js`、`quality-integration.js`、`quality-speed.js`、`versions.js` 和 `bridge.js`。验证与设备状态见 HANDOFF 最新段落。


### beta13 自动换源与续播

点播明确失败时自动尝试更好的备用源，持续卡住 12 秒触发恢复，首次加载允许 20 秒；同一次播放最多换 3 个不同备用记录。保留同集的秒数和倍速；跳过缺集、已试、测速失败或时长明显不匹配的版本，暂停、后台或明确断网不启动新的换源。返回或手动操作会取消旧请求。没有可用备用源时停下来提示，避免无限重试。不同来源的片头、插播广告和剪辑会影响时间轴，秒数续播不保证内容完全对齐。

代码入口 `mobile/failover.js`，接入由 `scripts/assemble-mobile.py` 完成；测试 `scripts/test-mobile-failover.cjs`。`scripts/test-mobile.cjs --serve` 的 `?scenario=recover` 仅在本机测试服务注入两个来源与“模拟播放失败”按钮，不进入 APK。手机安装状态与检查证据见 HANDOFF。


回归测试默认把报告写入 `.build-mobile/test-reports/`，可用 `STARLIGHT_TEST_REPORT_DIR` 指定其他目录；无需创建仓库外的个人工作区目录。
