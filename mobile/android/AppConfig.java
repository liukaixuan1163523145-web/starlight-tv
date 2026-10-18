package local.codex.libretvprobe;

final class AppConfig {
  static final boolean MOBILE=true;
  static final int PORT=8081;
  static final String TITLE="星幕";
  static final String ENTRY="/mobile/index.html";
  static final String RUNTIME_SUFFIX="-mobile-1.2.0-beta13";
  static String base(){return "http://127.0.0.1:"+PORT;}
}
