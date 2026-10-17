package local.codex.libretvprobe;

import android.content.Context;
import java.io.*;
import java.util.zip.*;
import java.security.SecureRandom;
import org.json.JSONObject;

final class RuntimeInstaller {
  static final String VERSION="1.1.1-starlight-20261018";
  static File root(Context c){return new File(c.getFilesDir(),"embedded");}
  static byte[] read(InputStream in) throws IOException {try(InputStream i=in;ByteArrayOutputStream o=new ByteArrayOutputStream()){byte[] b=new byte[65536];int n;while((n=i.read(b))!=-1)o.write(b,0,n);return o.toByteArray();}}
  static void write(File file,byte[] bytes) throws IOException {file.getParentFile().mkdirs();try(FileOutputStream o=new FileOutputStream(file)){o.write(bytes);o.getFD().sync();}}
  static void remove(File f) throws IOException {if(f.isDirectory()){File[] files=f.listFiles();if(files!=null)for(File child:files)remove(child);}if(f.exists()&&!f.delete())throw new IOException("Cannot remove staging file");}
  static void unzip(InputStream input,File dest) throws IOException {
    dest.mkdirs();String prefix=dest.getCanonicalPath()+File.separator;
    try(ZipInputStream zip=new ZipInputStream(input)){ZipEntry e;byte[] b=new byte[65536];while((e=zip.getNextEntry())!=null){File f=new File(dest,e.getName());if(!f.getCanonicalPath().startsWith(prefix))throw new IOException("Invalid package path");if(e.isDirectory()){f.mkdirs();continue;}f.getParentFile().mkdirs();try(FileOutputStream out=new FileOutputStream(f)){int n;while((n=zip.read(b))!=-1)out.write(b,0,n);}}}
  }
  static synchronized File prepare(Context c) throws Exception {
    File root=root(c),marker=new File(root,"version");
    if(!marker.exists()||!VERSION.equals(new String(read(new FileInputStream(marker)),"UTF-8"))){
      ServerService.message="首次准备电视运行环境，请稍候…";
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
    return root;
  }
}
