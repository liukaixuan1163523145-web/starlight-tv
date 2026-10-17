package local.codex.libretvprobe;

import android.app.Activity;
import android.os.*;
import android.graphics.Color;
import android.view.*;
import android.webkit.*;
import android.webkit.CookieManager;
import android.widget.*;
import android.content.Intent;
import java.net.*;
import java.io.*;
import org.json.JSONObject;

public class MainActivity extends Activity {
  private WebView web;
  private LinearLayout loading;
  private TextView status;
  private FrameLayout root,fullScreen;
  private WebChromeClient.CustomViewCallback fullScreenCallback;
  private final Handler handler=new Handler();
  private boolean active=false,authenticated=false,authBusy=false,destroyed=false;
  private long authAttempt=0;
  private final Runnable poll=new Runnable(){public void run(){
    if(!active||destroyed)return;
    if(!ServerService.ready){authenticated=false;loading.setVisibility(View.VISIBLE);status.setText(ServerService.message+(ServerService.failure!=null?"\n按确认键重试，返回键退出":""));}
    else if(!authenticated&&!authBusy&&SystemClock.elapsedRealtime()-authAttempt>1500)authenticate();
    handler.postDelayed(this,400);
  }};
  @Override public void onCreate(Bundle state){
    super.onCreate(state);getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    root=new FrameLayout(this);root.setBackgroundColor(0xff101820);setContentView(root);
    web=new WebView(this);web.setBackgroundColor(0xff101820);root.addView(web,new FrameLayout.LayoutParams(-1,-1));
    WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMediaPlaybackRequiresUserGesture(false);
    loading=new LinearLayout(this);loading.setGravity(Gravity.CENTER);loading.setOrientation(LinearLayout.VERTICAL);loading.setBackgroundColor(0xff101820);
    TextView title=new TextView(this);title.setText("星幕 TV");title.setTextColor(0xff64dfb4);title.setTextSize(34);loading.addView(title);
    status=new TextView(this);status.setText("正在启动电视服务…");status.setTextColor(Color.WHITE);status.setTextSize(19);status.setGravity(Gravity.CENTER);status.setPadding(24,24,24,24);loading.addView(status);
    root.addView(loading,new FrameLayout.LayoutParams(-1,-1));
    web.setWebChromeClient(new WebChromeClient(){
      @Override public void onShowCustomView(View view,CustomViewCallback callback){if(fullScreen!=null){callback.onCustomViewHidden();return;}fullScreen=new FrameLayout(MainActivity.this);fullScreen.setBackgroundColor(Color.BLACK);fullScreen.addView(view,new FrameLayout.LayoutParams(-1,-1));fullScreenCallback=callback;root.addView(fullScreen,new FrameLayout.LayoutParams(-1,-1));web.setVisibility(View.GONE);}
      @Override public void onHideCustomView(){exitFullScreen();}
    });
    web.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){return !isLocal(request.getUrl().toString());}
      @Override public boolean shouldOverrideUrlLoading(WebView v,String url){return !isLocal(url);}
      @Override public void onPageFinished(WebView v,String url){if(isLocal(url)&&authenticated){loading.setVisibility(View.GONE);web.requestFocus();}}
      @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame()){authenticated=false;loading.setVisibility(View.VISIBLE);status.setText("页面连接中断，正在重新连接…");}}
    });
  }
  private boolean isLocal(String url){return url.startsWith("http://127.0.0.1:8080/");}
  private void startServer(){Intent i=new Intent(this,ServerService.class);if(Build.VERSION.SDK_INT>=26)startForegroundService(i);else startService(i);}
  private void authenticate(){
    authBusy=true;authAttempt=SystemClock.elapsedRealtime();status.setText("正在打开首页…");
    new Thread(()->{HttpURLConnection c=null;try{
      JSONObject cfg=new JSONObject(new String(RuntimeInstaller.read(new FileInputStream(new File(getFilesDir(),"server-config.json"))),"UTF-8"));
      JSONObject body=new JSONObject();body.put("password",cfg.getString("PASSWORD"));
      c=(HttpURLConnection)new URL("http://127.0.0.1:8080/api/auth").openConnection();c.setConnectTimeout(5000);c.setReadTimeout(5000);c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");try(OutputStream o=c.getOutputStream()){o.write(body.toString().getBytes("UTF-8"));}
      final String cookie=c.getHeaderField("Set-Cookie");if(c.getResponseCode()!=200||cookie==null)throw new IOException("Authentication failed");
      runOnUiThread(()->{if(destroyed){authBusy=false;return;}CookieManager.getInstance().setCookie("http://127.0.0.1:8080",cookie,ok->{authBusy=false;if(destroyed||!active)return;if(ok){CookieManager.getInstance().flush();authenticated=true;web.loadUrl("http://127.0.0.1:8080/tv/tv.html");}else status.setText("登录未完成，正在重试…");});});
    }catch(Exception e){runOnUiThread(()->{authBusy=false;if(!destroyed)status.setText("连接未完成，正在重试…");});}finally{if(c!=null)c.disconnect();}},"local-auth").start();
  }
  private void exitFullScreen(){if(fullScreen==null)return;root.removeView(fullScreen);fullScreen=null;web.setVisibility(View.VISIBLE);if(fullScreenCallback!=null)fullScreenCallback.onCustomViewHidden();fullScreenCallback=null;}
  @Override protected void onStart(){super.onStart();active=true;web.onResume();startServer();handler.removeCallbacks(poll);handler.post(poll);}
  @Override protected void onStop(){active=false;handler.removeCallbacks(poll);web.evaluateJavascript("(function(){var v=document.querySelector('video');if(v)v.pause();})()",null);web.onPause();if(!isFinishing())startService(new Intent(this,ServerService.class).setAction(ServerService.BACKGROUND));super.onStop();}
  @Override public boolean onKeyDown(int code,KeyEvent e){
    if(loading.getVisibility()==View.VISIBLE&&(code==KeyEvent.KEYCODE_DPAD_CENTER||code==KeyEvent.KEYCODE_ENTER)){if(ServerService.failure!=null){stopService(new Intent(this,ServerService.class));handler.postDelayed(()->{if(active)startServer();},300);}return true;}
    if(code==KeyEvent.KEYCODE_MENU||code==KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE){web.evaluateJavascript("window.__tvRemote && window.__tvRemote('"+(code==KeyEvent.KEYCODE_MENU?"menu":"play")+"')",null);return true;}
    return super.onKeyDown(code,e);
  }
  @Override public void onBackPressed(){if(loading.getVisibility()==View.VISIBLE){finish();return;}if(fullScreen!=null){exitFullScreen();return;}web.evaluateJavascript("!!(window.__tvRemote && window.__tvRemote('back'))",handled->{if(!"true".equals(handled))finish();});}
  @Override protected void onDestroy(){destroyed=true;active=false;handler.removeCallbacksAndMessages(null);exitFullScreen();web.destroy();if(isFinishing())stopService(new Intent(this,ServerService.class));super.onDestroy();}
}
