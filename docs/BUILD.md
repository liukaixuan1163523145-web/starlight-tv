# 从源码构建

发布构建在 Windows / JDK 17 / Android API 28 / ARMv7 下完成。构建时还需要 Node.js 22 或更新版本、npm、Python 3.11 或更新版本，以及 Android SDK Build Tools 35.0.0。电视内运行的 ARM Node 来自锁定的 Termux 包，不使用构建电脑的 Node 二进制。

## Web 与服务端

```powershell
cd app
npm ci
$env:DOCKER_BUILD='1'
npm run build
node tv-compat-build.cjs
cd ..
```

仓库已包含生成好的 `app/public/tv/`。修改 `tv/` 中的模块后，在构建前运行 `python scripts/assemble-tv.py`。组装入口沿用 `tv-before-live.js`，不要手工编辑生成的 `tv.js` 后再运行组装器。

## ARM 运行时与 APK

```powershell
python scripts/prepare-runtime.py
python scripts/package-payload.py
$env:ANDROID_SDK_ROOT='C:\Android\Sdk'
$env:JAVA_HOME='C:\Java\jdk-17'
$env:STARLIGHT_KEYSTORE='C:\private\release.jks'
$env:STARLIGHT_KEY_ALIAS='release'
$env:STARLIGHT_STORE_PASSWORD_FILE='C:\private\store-password.txt'
$env:STARLIGHT_KEY_PASSWORD_FILE='C:\private\key-password.txt'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-apk.ps1
```

输出位于 `dist/`。签名密钥由构建者自行创建和保管；不要将私钥或密码文件提交到仓库。自行签名的 APK 无法直接覆盖另一签名的安装包。官方发布包保持已有签名，包名暂保留 `local.codex.libretvprobe`，用于兼容之前的安装数据。

Termux 官方镜像可能清理旧版本包。若锁定包下载不可用，请找可信归档并按 `runtime-provenance.json` 校验；不能悄悄用未验证的新版本替代。

## 配置与 MDBList

预置公开来源及搜索超时保存在 `android/defaults.json`；只允许 `DEFAULT_SOURCES`、`SEARCH_MAX_PAGES`、`SEARCH_SOURCE_TIMEOUT_MS`。不要把 API Key 或固定密码放进它或 APK。首次启动会生成本机随机登录密码。

运行后，密钥在应用私有目录 `files/server-config.json` 的 `MDBLIST_API_KEY` 字段。当前 TV UI 尚无凭据输入页。需要配置的开发者可自行构建同签名调试包，在 ADB `run-as local.codex.libretvprobe` 权限下读取并合并该 JSON，再覆盖安装正式包；保留原 `PASSWORD` 和其他字段，只在本机处理密钥，勿上传该文件。正式 APK 的 `debuggable=false`，不能直接用 `run-as` 写入。

Web 自托管开发也可通过服务端环境变量设置 `MDBLIST_API_KEY` 和 `PASSWORD`，然后访问 `/tv/tv.html`。不要把监听地址改为公网开放且无认证的服务。

## 运行时结构

APK 内 `assets/payload.zip` 包含 ARM Node、必需动态库、Next standalone 服务和 TV 页面。应用只监听 `127.0.0.1:8080`，自动登录同源 WebView。数据存放在应用私有目录，版本升级替换运行时、保留数据。

若修改 payload，必须同时更新 `android/RuntimeInstaller.java` 的 `VERSION` 和 AndroidManifest 的版本号，否则旧安装可能继续使用已提取的旧运行时。

## 已知边界

- API 28 最低版本；其他 Android 版本未全面测试，尤其新版系统的可执行文件策略。
- 公共播放器接口可能失效；缓存不是影片下载，也不保证持续可播放。
- 1.1.0 的物理电视功能已验收；1.1.1 是品牌与发布整理，构建和包检查记录不等同于所有电视的兼容认证。
- 上游依赖的安全状态应持续维护；本次改名不进行跨版本升级。请勿把电视内置服务暴露到公网。
