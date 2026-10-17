import type { Metadata, Viewport } from 'next';
import fs from 'node:fs';
import path from 'node:path';
import './globals.css';
import { Providers } from '@/components/providers';

// Execute the ES runtime polyfills before asynchronous React/Next chunks on Chromium 66.
const tvPolyfills = fs.readFileSync(path.join(process.cwd(), 'public/tv-polyfills.js'), 'utf8') + `
// Old WebView fetch defaults to omitting cookies. Match modern same-origin defaults.
(function(){
  var originalFetch=window.fetch;
  window.fetch=function(input,init){
    if(!(input instanceof Request)&&(!init||init.credentials===undefined)){
      init=Object.assign({},init||{},{credentials:'same-origin'});
    }
    return originalFetch.call(this,input,init);
  };
})();`;

export const metadata: Metadata = {
  title: {
    default: '星幕 TV - 客厅影音播放器',
    template: '%s - 星幕 TV',
  },
  description:
    'LibreTV 是一个免费的在线视频搜索平台，无广告、安全，提供来自多个视频源的内容搜索与观看服务，无需注册即可使用。',
  manifest: '/manifest.webmanifest',
  // 图标与门户站（LibreTV-portal）同一套：同一张 artwork 导出的多尺寸 + 根目录 favicon.ico 兜底。
  // 只声明单张 512 时，抓取端只能拿大图缩放，小尺寸下易糊、看起来「没填满」。
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0b101a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: tvPolyfills }} />
        {/* 首屏前同步主题，避免亮暗闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('libretv-theme')||'dark';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})()",
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
