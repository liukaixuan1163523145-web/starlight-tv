param(
  [string]$SdkRoot=$env:ANDROID_SDK_ROOT,
  [string]$JavaHome=$env:JAVA_HOME,
  [string]$KeyStore=$env:STARLIGHT_KEYSTORE,
  [string]$KeyAlias=$env:STARLIGHT_KEY_ALIAS,
  [string]$StorePasswordFile=$env:STARLIGHT_STORE_PASSWORD_FILE,
  [string]$KeyPasswordFile=$env:STARLIGHT_KEY_PASSWORD_FILE,
  [string]$BuildToolsVersion='35.0.0'
)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if(!$SdkRoot -or !$JavaHome -or !$KeyStore -or !$StorePasswordFile){throw 'Set Android SDK, JDK, signing key and password-file paths; see docs/BUILD.md'}
$bt=Join-Path $SdkRoot "build-tools/$BuildToolsVersion"
$androidJar=Join-Path $SdkRoot 'platforms/android-28/android.jar'
$build=Join-Path $root '.build'
$dist=Join-Path $root 'dist'
New-Item -ItemType Directory -Force -Path "$build/classes","$build/dex",$dist | Out-Null
function CheckExit($name){if($LASTEXITCODE -ne 0){throw "$name failed ($LASTEXITCODE)"}}
$sources=(Get-ChildItem -LiteralPath "$root/android" -Filter '*.java').FullName
& "$JavaHome/bin/javac.exe" -encoding UTF-8 -source 8 -target 8 -classpath $androidJar -d "$build/classes" $sources
CheckExit 'javac'
& "$JavaHome/bin/jar.exe" cf "$build/classes.jar" -C "$build/classes" .
CheckExit 'jar'
& "$JavaHome/bin/java.exe" -cp "$bt/lib/d8.jar" com.android.tools.r8.D8 --lib $androidJar --min-api 28 --output "$build/dex" "$build/classes.jar"
CheckExit 'd8'
Copy-Item -LiteralPath "$root/android/AndroidManifest.xml" -Destination "$build/AndroidManifest.xml"
Copy-Item -LiteralPath $androidJar -Destination "$build/android.jar"
Copy-Item -LiteralPath "$root/android/res" -Destination $build -Recurse -Force
Push-Location $build
try {
  & "$bt/aapt2.exe" compile --dir 'res' -o 'resources.zip'; CheckExit 'aapt2 compile'
  & "$bt/aapt2.exe" link -o 'unsigned.apk' -I 'android.jar' --manifest 'AndroidManifest.xml' -A 'assets' 'resources.zip'; CheckExit 'aapt2 link'
  & "$JavaHome/bin/jar.exe" uf 'unsigned.apk' -C 'dex' classes.dex; CheckExit 'dex package'
  & "$bt/zipalign.exe" -f 4 'unsigned.apk' 'aligned.apk'; CheckExit 'zipalign'
} finally {Pop-Location}
[xml]$manifest=Get-Content -LiteralPath "$build/AndroidManifest.xml" -Raw -Encoding UTF8
$version=$manifest.manifest.GetAttribute('versionName','http://schemas.android.com/apk/res/android')
$output=Join-Path $dist "Starlight-TV-$version-armeabi-v7a.apk"
$sign=@('sign','--ks',$KeyStore,'--ks-pass',"file:$StorePasswordFile")
if($KeyAlias){$sign+=@('--ks-key-alias',$KeyAlias)}
if($KeyPasswordFile -and $KeyPasswordFile -ne $StorePasswordFile){$sign+=@('--key-pass',"file:$KeyPasswordFile")}
$sign+=@('--out',$output,"$build/aligned.apk")
& "$JavaHome/bin/java.exe" -jar "$bt/lib/apksigner.jar" @sign
CheckExit 'sign'
& "$JavaHome/bin/java.exe" -jar "$bt/lib/apksigner.jar" verify $output
CheckExit 'verify'
Get-FileHash -Algorithm SHA256 -LiteralPath $output
