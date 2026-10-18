package local.codex.libretvprobe;

/** TV defaults. The mobile build compiles its own AppConfig in an isolated directory. */
final class AppConfig {
  static final boolean MOBILE=false;
  static final int PORT=8080;
  static final String TITLE="星幕 TV";
  static final String ENTRY="/tv/tv.html";
  static final String RUNTIME_SUFFIX="";
  static String base(){return "http://127.0.0.1:"+PORT;}
}
