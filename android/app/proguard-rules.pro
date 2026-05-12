# ProGuard rules for d.o. Gist Hub (Capacitor Android)
# These rules preserve Capacitor plugin classes and the JS bridge
# so that minification does not break WebView ↔ native communication.

# Keep Capacitor core classes
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.annotation.** { *; }
-keepclassmembers class com.getcapacitor.** {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
}

# Keep plugin classes
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers public class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod <methods>;
}

# Keep Cordova plugin classes (if any are used)
-keep public class * extends org.apache.cordova.CordovaPlugin { *; }

# Keep JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebViewClient and WebChromeClient
-keep public class * extends android.webkit.WebViewClient { *; }
-keep public class * extends android.webkit.WebChromeClient { *; }

# Keep the Capacitor Bridge and Config
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.CapConfig { *; }

# Keep the main activity
-keep public class com.dogisthub.app.MainActivity { *; }
