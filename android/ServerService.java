package local.codex.libretvprobe;

import android.app.*;
import android.content.*;
import android.os.*;
import java.lang.Process;
import android.util.Log;
import java.io.*;
import java.net.*;
import java.util.Map;

public class ServerService extends Service {
  static volatile boolean ready=false;
  static volatile String message="正在启动播放服务…";
  static volatile String failure=null;
  static volatile long startedMs=0;
  private volatile boolean stopping=false;
  private Process child;
  private Thread worker;
  private final Handler handler=new Handler();
  private final Runnable backgroundStop=()->stopSelf();
  public static final String BACKGROUND="local.codex.libretvprobe.BACKGROUND";
  @Override public void onCreate(){
    super.onCreate();ready=false;failure=null;message="正在启动播放服务…";
    NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
    if(Build.VERSION.SDK_INT>=26)nm.createNotificationChannel(new NotificationChannel("server","电视播放服务",NotificationManager.IMPORTANCE_LOW));
    Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,"server"):new Notification.Builder(this);
    PendingIntent p=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    startForeground(1,b.setSmallIcon(android.R.drawable.ic_media_play).setContentTitle(AppConfig.TITLE).setContentText("本机服务运行中 · 退出应用后停止").setContentIntent(p).setOngoing(true).build());
    worker=new Thread(()->runServer(),"embedded-server");worker.start();
  }
  @Override public int onStartCommand(Intent i,int flags,int id){handler.removeCallbacks(backgroundStop);if(i!=null&&BACKGROUND.equals(i.getAction()))handler.postDelayed(backgroundStop,30000);return START_NOT_STICKY;}
  private boolean healthy(){HttpURLConnection c=null;try{c=(HttpURLConnection)new URL(AppConfig.base()+"/api/status").openConnection();c.setConnectTimeout(700);c.setReadTimeout(700);return c.getResponseCode()==200;}catch(Exception e){return false;}finally{if(c!=null)c.disconnect();}}
  private void runServer(){
    try {
      File root=RuntimeInstaller.prepare(this);if(stopping)return;
      for(int attempt=0;attempt<3&&!stopping;attempt++){
        if(healthy())throw new IOException("本地服务端口已被占用，请退出其他星幕应用后重试");
        ready=false;message=attempt==0?"正在启动播放服务…":"服务意外停止，正在恢复…";
        File log=new File(getFilesDir(),"server.log");if(log.length()>2*1024*1024)log.delete();
        ProcessBuilder pb=new ProcessBuilder(new File(root,"runtime/bin/node").getAbsolutePath(),"--max-old-space-size=256",new File(root,"start.cjs").getAbsolutePath());
        pb.directory(new File(root,"app"));pb.redirectErrorStream(true);pb.redirectOutput(ProcessBuilder.Redirect.appendTo(log));
        Map<String,String> env=pb.environment();env.put("STARLIGHT_PORT",String.valueOf(AppConfig.PORT));env.put("LD_LIBRARY_PATH",new File(root,"runtime/lib").getAbsolutePath());env.put("NODE_EXTRA_CA_CERTS",new File(root,"runtime/etc/tls/cert.pem").getAbsolutePath());env.put("TV_DATA_DIR",getFilesDir().getAbsolutePath());env.put("HOME",getFilesDir().getAbsolutePath());env.put("TMPDIR",getCacheDir().getAbsolutePath());
        long start=SystemClock.elapsedRealtime();synchronized(this){if(stopping)return;child=pb.start();}
        while(!stopping&&child.isAlive()&&SystemClock.elapsedRealtime()-start<45000){if(healthy()){ready=true;startedMs=SystemClock.elapsedRealtime()-start;message="播放服务已就绪";Log.i("LibreTV","SERVER_READY ms="+startedMs);break;}Thread.sleep(200);}
        if(stopping)return;
        if(!ready){child.destroy();throw new IOException("播放服务未能启动，请按确认重试");}
        int result=child.waitFor();ready=false;if(stopping)return;Log.w("LibreTV","SERVER_EXIT code="+result);Thread.sleep(1000);
      }
      if(!stopping)throw new IOException("服务连续中断，请按确认重试");
    }catch(Exception e){if(!stopping){failure=e.getMessage();message=failure;Log.e("LibreTV","SERVER_FAILURE",e);}}
  }
  @Override public IBinder onBind(Intent i){return null;}
  @Override public void onTaskRemoved(Intent i){stopSelf();}
  @Override public void onDestroy(){
    stopping=true;ready=false;handler.removeCallbacksAndMessages(null);
    final Process process;synchronized(this){process=child;if(process!=null)process.destroy();}
    if(process!=null)new Thread(()->{try{if(!process.waitFor(1500,java.util.concurrent.TimeUnit.MILLISECONDS))process.destroyForcibly();}catch(InterruptedException e){process.destroyForcibly();}},"server-stop").start();
    if(worker!=null)worker.interrupt();stopForeground(true);super.onDestroy();
  }
}
