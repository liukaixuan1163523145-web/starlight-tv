package local.codex.libretvprobe;

import android.content.Context;
import java.io.*;
import java.util.zip.*;
import java.security.SecureRandom;
import org.json.JSONObject;

final class RuntimeInstaller {
  static final String VERSION="1.1.3-local-starlight-20261018-r2"+AppConfig.RUNTIME_SUFFIX;
  static File root(Context c){return new File(c.getFilesDir(),"embedded");}
  static byte[] read(InputStream in) throws IOException {try(InputStream i=in;ByteArrayOutputStream o=new ByteArrayOutputStream()){byte[] b=new byte[65536];int n;while((n=i.read(b))!=-1)o.write(b,0,n);return o.toByteArray();}}
  static void write(File file,byte[] bytes) throws IOException {file.getParentFile().mkdirs();try(FileOutputStream o=new FileOutputStream(file)){o.write(bytes);o.getFD().sync();}}
  static void remove(File f) throws IOException {if(f.isDirectory()){File[] files=f.listFiles();if(files!=null)for(File child:files)remove(child);}if(f.exists()&&!f.delete())throw new IOException("Cannot remove staging file");}
  static void unzip(InputStream input,File dest) throws IOException {
    dest.mkdirs();String prefix=dest.getCanonicalPath()+File.separator;
    try(ZipInputStream zip=new ZipInputStream(input)){ZipEntry e;byte[] b=new byte[65536];while((e=zip.getNextEntry())!=null){File f=new File(dest,e.getName());if(!f.getCanonicalPath().startsWith(prefix))throw new IOException("Invalid package path");if(e.isDirectory()){f.mkdirs();continue;}f.getParentFile().mkdirs();try(FileOutputStream out=new FileOutputStream(f)){int n;while((n=zip.read(b))!=-1)out.write(b,0,n);}}}
  }
  static void importLocalData(Context c) throws Exception {
    File data=new File(c.getFilesDir(),"data"),done=new File(data,"local-data-1.1.2.ready");
    if(done.exists())return;
    ServerService.message="正在准备本地片单和海报，首次启动请稍候…";
    data.mkdirs();String prefix=data.getCanonicalPath()+File.separator;
    try(ZipInputStream zip=new ZipInputStream(c.getAssets().open("local-data.zip"))){
      ZipEntry e;byte[] buffer=new byte[65536];
      while((e=zip.getNextEntry())!=null){
        if(e.isDirectory())continue;
        String name=e.getName();
        if(!(name.startsWith("mdblist-cache/")||name.startsWith("recommendation-cache/")||name.equals("snapshot-info.json")))throw new IOException("Invalid local data entry");
        File file=new File(data,name);
        if(!file.getCanonicalPath().startsWith(prefix))throw new IOException("Invalid local data path");
        if(file.exists()&&name.startsWith("recommendation-cache/posters/"))continue;
        file.getParentFile().mkdirs();File temp=new File(file.getPath()+".seed-tmp");
        try(FileOutputStream out=new FileOutputStream(temp)){int n;while((n=zip.read(buffer))!=-1)out.write(buffer,0,n);}
        // Preserve fresher recommendations when upgrading an existing installation.
        if(file.exists()&&(name.startsWith("mdblist-cache/")||name.startsWith("recommendation-cache/douban/"))){
          try{JSONObject before=new JSONObject(new String(read(new FileInputStream(file)),"UTF-8"));JSONObject incoming=new JSONObject(new String(read(new FileInputStream(temp)),"UTF-8"));if(before.optLong("fetchedAt")>=incoming.optLong("fetchedAt")){temp.delete();continue;}}catch(Exception ignored){}
        }
        if(!temp.renameTo(file))throw new IOException("Cannot import local recommendation data");
      }
    }
    write(done,VERSION.getBytes("UTF-8"));
  }
  static synchronized File prepare(Context c) throws Exception {
    if(AppConfig.MOBILE&&!java.util.Arrays.asList(android.os.Build.SUPPORTED_ABIS).contains("arm64-v8a"))throw new IOException("此安装包需要 64 位 ARM 手机");
    File root=root(c),marker=new File(root,"version");
    if(!marker.exists()||!VERSION.equals(new String(read(new FileInputStream(marker)),"UTF-8"))){
      ServerService.message="首次准备播放运行环境，请稍候…";
      File stage=new File(c.getFilesDir(),"embedded-stage"),old=new File(c.getFilesDir(),"embedded-previous");remove(stage);
      unzip(c.getAssets().open("payload.zip"),stage);
      if(!new File(stage,"runtime/bin/node").setExecutable(true,true))throw new IOException("Runtime permission failed");
      if(!new File(stage,"app/server.js").isFile())throw new IOException("Incomplete server package");
      write(new File(stage,"version"),VERSION.getBytes("UTF-8"));remove(old);
      if(root.exists()&&!root.renameTo(old))throw new IOException("Cannot retain previous runtime");
      if(!stage.renameTo(root)){old.renameTo(root);throw new IOException("Cannot activate runtime");}
    }
    File config=new File(c.getFilesDir(),"server-config.json");
    if(!config.exists()){
      JSONObject cfg=new JSONObject(new String(read(c.getAssets().open("defaults.json")),"UTF-8"));
      byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);StringBuilder pass=new StringBuilder();for(byte b:bytes)pass.append(String.format("%02x",b&255));cfg.put("PASSWORD",pass.toString());write(config,cfg.toString().getBytes("UTF-8"));
    }
    File migration=new File(c.getFilesDir(),"cache-migration.zip");
    if(migration.exists()){unzip(new FileInputStream(migration),new File(c.getFilesDir(),"data"));if(!migration.delete())throw new IOException("Cannot finish cache migration");}
    importLocalData(c);
    return root;
  }
}
