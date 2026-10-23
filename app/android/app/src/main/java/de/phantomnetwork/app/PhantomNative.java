package de.phantomnetwork.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.RouteInfo;
import android.net.wifi.WifiManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.core.content.FileProvider;
import android.app.Activity;
import android.provider.DocumentsContract;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import java.io.File;
import java.io.FileOutputStream;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import android.content.SharedPreferences;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/**
 * Phantom-eigene Funktionen:
 *  - gateway(): Adresse des Routers im aktuellen WLAN (= Master)
 *  - request(): HTTPS zu Cudys mit selbst ausgestelltem Zertifikat.
 *    Das Zertifikat wird beim ersten Mal per Fingerabdruck bestätigt (SHA-256) und danach
 *    nur genau dieses akzeptiert ("Trust on first use").
 */
@CapacitorPlugin(
    name = "PhantomNative",
    permissions = { @Permission(alias = "wireguard", strings = { PhantomNative.WG_PERM }) }
)
public class PhantomNative extends Plugin {

    private final ExecutorService pool = Executors.newFixedThreadPool(4);

    @PluginMethod
    public void gateway(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            ConnectivityManager cm = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
            Network net = cm.getActiveNetwork();
            String gw = null;
            boolean wifi = false;
            if (net != null) {
                NetworkCapabilities caps = cm.getNetworkCapabilities(net);
                wifi = caps != null && (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
                LinkProperties lp = cm.getLinkProperties(net);
                if (lp != null) {
                    for (RouteInfo r : lp.getRoutes()) {
                        InetAddress g = r.getGateway();
                        if (r.isDefaultRoute() && g instanceof Inet4Address && !g.isAnyLocalAddress()) {
                            gw = g.getHostAddress();
                            break;
                        }
                    }
                }
            }
            if (gw == null) {
                // Rückfall für ältere Geräte
                WifiManager wm = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                @SuppressWarnings("deprecation")
                int ip = wm != null && wm.getDhcpInfo() != null ? wm.getDhcpInfo().gateway : 0;
                if (ip != 0) {
                    gw = (ip & 0xff) + "." + ((ip >> 8) & 0xff) + "." + ((ip >> 16) & 0xff) + "." + ((ip >> 24) & 0xff);
                    wifi = true;
                }
            }
            // nur im WLAN/LAN sinnvoll – im Mobilfunk ist das Gateway nicht der Master
            ret.put("gateway", wifi ? gw : null);
            ret.put("wifi", wifi);
            call.resolve(ret);
        } catch (Exception e) {
            ret.put("gateway", null);
            ret.put("wifi", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void request(PluginCall call) {
        final String url = call.getString("url", "");
        final String method = call.getString("method", "POST");
        final String body = call.getString("body", "");
        final String pin = normalize(call.getString("pin", ""));
        final int timeout = call.getInt("timeout", 8000);
        final JSObject headers = call.getObject("headers", null);   // z. B. für UPnP (SOAP) zum Gateway
        // öffentliche Adressen (z. B. downloads.openwrt.org): normale Zertifikatsprüfung statt Router-Fingerabdruck
        final boolean pub = Boolean.TRUE.equals(call.getBoolean("public", false));

        pool.execute(() -> {
            JSObject ret = new JSObject();
            final String[] seen = { "" };
            HttpURLConnection con = null;
            try {
                con = (HttpURLConnection) new URL(url).openConnection();
                if (con instanceof HttpsURLConnection && !pub) {
                    HttpsURLConnection https = (HttpsURLConnection) con;
                    X509TrustManager tm = new X509TrustManager() {
                        public void checkClientTrusted(X509Certificate[] c, String a) { }
                        public void checkServerTrusted(X509Certificate[] chain, String a) throws CertificateException {
                            if (chain == null || chain.length == 0) throw new CertificateException("kein Zertifikat");
                            seen[0] = fingerprint(chain[0]);
                            if (pin.isEmpty() || !pin.equals(seen[0])) throw new CertificateException("PHANTOM_UNTRUSTED");
                        }
                        public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                    };
                    SSLContext ctx = SSLContext.getInstance("TLS");
                    ctx.init(null, new TrustManager[] { tm }, null);
                    https.setSSLSocketFactory(ctx.getSocketFactory());
                    // Name/IP im Zertifikat passt bei Cudys nie – geprüft wird stattdessen der Fingerabdruck
                    https.setHostnameVerifier((h, s) -> !pin.isEmpty() && pin.equals(seen[0]));
                }
                con.setConnectTimeout(timeout);
                con.setReadTimeout(timeout);
                con.setUseCaches(false);
                con.setRequestMethod(method);
                if (headers != null) {
                    java.util.Iterator<String> it = headers.keys();
                    while (it.hasNext()) { String k = it.next(); con.setRequestProperty(k, headers.getString(k)); }
                }
                if ("POST".equals(method)) {
                    byte[] data = body.getBytes(StandardCharsets.UTF_8);
                    con.setDoOutput(true);
                    if (headers == null || !headers.has("Content-Type")) con.setRequestProperty("Content-Type", "application/json");
                    con.setFixedLengthStreamingMode(data.length);
                    try (OutputStream os = con.getOutputStream()) { os.write(data); }
                }
                int status = con.getResponseCode();
                InputStream in = status >= 400 ? con.getErrorStream() : con.getInputStream();
                String text = "";
                if (in != null) {
                    ByteArrayOutputStream bo = new ByteArrayOutputStream();
                    byte[] buf = new byte[16384];
                    int n;
                    while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
                    in.close();
                    text = bo.toString("UTF-8");
                }
                ret.put("status", status);
                ret.put("data", text);
                ret.put("fingerprint", seen[0]);
                call.resolve(ret);
            } catch (SSLHandshakeException e) {
                if (!seen[0].isEmpty()) {
                    // Zertifikat unbekannt oder geändert → App fragt den Nutzer
                    ret.put("status", 0);
                    ret.put("needTrust", true);
                    ret.put("changed", !pin.isEmpty());
                    ret.put("fingerprint", seen[0]);
                    call.resolve(ret);
                } else {
                    call.reject("HTTPS-Fehler: " + e.getMessage());
                }
            } catch (Exception e) {
                if (!seen[0].isEmpty() && (pin.isEmpty() || !pin.equals(seen[0]))) {
                    ret.put("status", 0);
                    ret.put("needTrust", true);
                    ret.put("changed", !pin.isEmpty());
                    ret.put("fingerprint", seen[0]);
                    call.resolve(ret);
                } else {
                    call.reject(e.getClass().getSimpleName() + ": " + e.getMessage());
                }
            } finally {
                if (con != null) con.disconnect();
            }
        });
    }

    /**
     * Hintergrund-Check einrichten oder abschalten.
     * Gespeichert wird nur, WO das Passwort im verschlüsselten Speicher liegt (secretKey) – nicht das Passwort selbst.
     */
    @PluginMethod
    public void checkConfig(PluginCall call) {
        Context ctx = getContext().getApplicationContext();
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        SharedPreferences.Editor e = ctx.getSharedPreferences(PhantomCheckWorker.PREFS, Context.MODE_PRIVATE).edit();
        String oldUrl = ctx.getSharedPreferences(PhantomCheckWorker.PREFS, Context.MODE_PRIVATE).getString("url", "");
        String url = call.getString("url", "");
        e.putBoolean("on", on)
            .putString("url", url)
            .putString("user", call.getString("user", "root"))
            .putString("pin", call.getString("pin", ""))
            .putString("secretKey", call.getString("secretKey", ""))
            .putString("kinds", call.getArray("kinds") != null ? call.getArray("kinds").toString() : "[]")
            .putString("others", call.getArray("others") != null ? call.getArray("others").toString() : "[]")
            .putString("routers", call.getArray("routers") != null ? call.getArray("routers").toString() : "[]")
            .putBoolean("lock", Boolean.TRUE.equals(call.getBoolean("lock", false)))   // App-Login an: Mitteilungen ohne Aktions-Knöpfe
            .putString("lang", call.getString("lang", "de"))
            .apply();
        WorkManager wm = WorkManager.getInstance(ctx);
        if (on) {
            // anderer Master: Bestand neu lernen, nichts Altes melden
            if (!url.equals(oldUrl)) ctx.getSharedPreferences(PhantomCheckWorker.STATE, Context.MODE_PRIVATE).edit().clear().apply();
            PhantomCheckWorker.ensureChannel(ctx);
            Constraints c = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
            PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(PhantomCheckWorker.class, 15, TimeUnit.MINUTES).setConstraints(c).build();
            wm.enqueueUniquePeriodicWork("phantom-check", ExistingPeriodicWorkPolicy.UPDATE, req);
        } else {
            wm.cancelUniqueWork("phantom-check");
            ctx.getSharedPreferences(PhantomCheckWorker.STATE, Context.MODE_PRIVATE).edit().clear().apply();
        }
        call.resolve();
    }

    // ---------- WireGuard-App fernsteuern (offizielle Schnittstelle der WireGuard-App) ----------
    static final String WG_PKG = "com.wireguard.android";
    static final String WG_PERM = "com.wireguard.android.permission.CONTROL_TUNNELS";

    /** installiert? Recht erteilt? Ist auf dem Handy gerade ein VPN aktiv? */
    @PluginMethod
    public void wgStatus(PluginCall call) {
        JSObject r = new JSObject();
        boolean installed;
        try { getContext().getPackageManager().getPackageInfo(WG_PKG, 0); installed = true; }
        catch (PackageManager.NameNotFoundException e) { installed = false; }
        r.put("installed", installed);
        r.put("allowed", installed && getPermissionState("wireguard") == PermissionState.GRANTED);
        r.put("vpn", vpnActive());
        call.resolve(r);
    }

    @PluginMethod
    public void wgPermission(PluginCall call) {
        if (getPermissionState("wireguard") == PermissionState.GRANTED) { wgPermCb(call); return; }
        requestPermissionForAlias("wireguard", call, "wgPermCb");
    }

    @PermissionCallback
    private void wgPermCb(PluginCall call) {
        JSObject r = new JSObject();
        r.put("allowed", getPermissionState("wireguard") == PermissionState.GRANTED);
        call.resolve(r);
    }

    /** Tunnel in der WireGuard-App ein-/ausschalten */
    @PluginMethod
    public void wgSet(PluginCall call) {
        String tunnel = call.getString("tunnel", "");
        boolean up = Boolean.TRUE.equals(call.getBoolean("up", false));
        if (tunnel.isEmpty()) { call.reject("Tunnel-Name fehlt"); return; }
        if (getPermissionState("wireguard") != PermissionState.GRANTED) { call.reject("NO_PERMISSION"); return; }
        Intent i = new Intent(up ? "com.wireguard.android.action.SET_TUNNEL_UP" : "com.wireguard.android.action.SET_TUNNEL_DOWN");
        i.setPackage(WG_PKG);
        i.putExtra("tunnel", tunnel);
        getContext().sendBroadcast(i);
        call.resolve();
    }

    private boolean vpnActive() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
            for (Network n : cm.getAllNetworks()) {
                NetworkCapabilities c = cm.getNetworkCapabilities(n);
                if (c != null && c.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) return true;
            }
        } catch (Exception e) { /* egal */ }
        return false;
    }

    /**
     * Backup eines Routers holen – genau wie „Sicherung herunterladen“ in LuCI (cgi-backup mit der Sitzung)
     * und im Ordner „Download“ speichern (ab Android 10), sonst über „Teilen“ ablegen.
     */
    @PluginMethod
    public void saveBackup(PluginCall call) {
        final String url = call.getString("url", "");
        final String sid = call.getString("sid", "");
        final String pin = normalize(call.getString("pin", ""));
        final String name = call.getString("filename", "backup.tar.gz");
        pool.execute(() -> {
            HttpURLConnection con = null;
            try {
                con = (HttpURLConnection) new URL(url).openConnection();
                if (con instanceof HttpsURLConnection) {
                    final String[] seen = { "" };
                    X509TrustManager tm = new X509TrustManager() {
                        public void checkClientTrusted(X509Certificate[] c, String a) { }
                        public void checkServerTrusted(X509Certificate[] chain, String a) throws CertificateException {
                            if (chain == null || chain.length == 0) throw new CertificateException("kein Zertifikat");
                            seen[0] = fingerprint(chain[0]);
                            if (pin.isEmpty() || !pin.equals(seen[0])) throw new CertificateException("Zertifikat unbekannt");
                        }
                        public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                    };
                    SSLContext sc = SSLContext.getInstance("TLS");
                    sc.init(null, new TrustManager[] { tm }, null);
                    ((HttpsURLConnection) con).setSSLSocketFactory(sc.getSocketFactory());
                    ((HttpsURLConnection) con).setHostnameVerifier((h, ss) -> !pin.isEmpty() && pin.equals(seen[0]));
                }
                byte[] form = ("sessionid=" + java.net.URLEncoder.encode(sid, "UTF-8")).getBytes(StandardCharsets.UTF_8);
                con.setConnectTimeout(10000);
                con.setReadTimeout(60000);
                con.setRequestMethod("POST");
                con.setDoOutput(true);
                con.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
                con.setFixedLengthStreamingMode(form.length);
                try (OutputStream os = con.getOutputStream()) { os.write(form); }
                int status = con.getResponseCode();
                String type = String.valueOf(con.getContentType());
                if (status != 200 || type.contains("text/")) { call.reject("Backup nicht möglich (HTTP " + status + ")"); return; }
                ByteArrayOutputStream bo = new ByteArrayOutputStream();
                try (InputStream in = con.getInputStream()) { byte[] buf = new byte[16384]; int n; while ((n = in.read(buf)) > 0) bo.write(buf, 0, n); }
                byte[] data = bo.toByteArray();
                if (data.length < 100) { call.reject("Backup leer"); return; }
                Context ctx = getContext();
                JSObject ret = new JSObject();
                // selbst gewählter Ordner (falls gesetzt und noch erlaubt)
                String tree = ctx.getSharedPreferences(BK, Context.MODE_PRIVATE).getString("tree", "");
                Uri doc = null;
                if (!tree.isEmpty()) {
                    try {
                        Uri t = Uri.parse(tree);
                        Uri dir = DocumentsContract.buildDocumentUriUsingTree(t, DocumentsContract.getTreeDocumentId(t));
                        doc = DocumentsContract.createDocument(ctx.getContentResolver(), dir, "application/gzip", name);
                    } catch (Exception e) { doc = null; }
                }
                if (doc != null) {
                    try (OutputStream os = ctx.getContentResolver().openOutputStream(doc)) { os.write(data); }
                    ret.put("path", folderName(Uri.parse(tree)) + "/" + name);
                } else if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                    v.put(MediaStore.MediaColumns.MIME_TYPE, "application/gzip");
                    v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri uri = ctx.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (uri == null) throw new Exception("Speichern nicht möglich");
                    try (OutputStream os = ctx.getContentResolver().openOutputStream(uri)) { os.write(data); }
                    ret.put("path", "Download/" + name);
                } else {
                    File dir = new File(ctx.getCacheDir(), "backups");
                    dir.mkdirs();
                    File f = new File(dir, name);
                    try (FileOutputStream os = new FileOutputStream(f)) { os.write(data); }
                    Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", f);
                    Intent send = new Intent(Intent.ACTION_SEND).setType("application/gzip").putExtra(Intent.EXTRA_STREAM, uri)
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    ctx.startActivity(Intent.createChooser(send, name).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                    ret.put("shared", true);
                }
                ret.put("size", data.length);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Backup: " + e.getMessage());
            } finally {
                if (con != null) con.disconnect();
            }
        });
    }

    static final String BK = "phantom_backup";

    /* ---------- App-Login mit Fingerabdruck ---------- */
    private static final int BIO = BiometricManager.Authenticators.BIOMETRIC_WEAK;

    @PluginMethod
    public void biometricAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ok", BiometricManager.from(getContext()).canAuthenticate(BIO) == BiometricManager.BIOMETRIC_SUCCESS);
        call.resolve(ret);
    }

    @PluginMethod
    public void biometric(PluginCall call) {
        final String title = call.getString("title", "Phantom Network");
        final String sub = call.getString("sub", "");
        getActivity().runOnUiThread(() -> {
            try {
                BiometricPrompt p = new BiometricPrompt((FragmentActivity) getActivity(), ContextCompat.getMainExecutor(getContext()),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) { call.resolve(); }
                        @Override public void onAuthenticationError(int code, CharSequence msg) { call.reject(String.valueOf(msg)); }
                    });
                BiometricPrompt.PromptInfo.Builder b = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title).setNegativeButtonText("Passwort").setAllowedAuthenticators(BIO);
                if (!sub.isEmpty()) b.setSubtitle(sub);
                p.authenticate(b.build());
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "Fingerabdruck nicht verfügbar");
            }
        });
    }

    /** Ordner für Backups auswählen (Android-Ordnerauswahl, Zugriff bleibt dauerhaft) */
    @PluginMethod
    public void pickBackupFolder(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, i, "backupFolderPicked");
    }

    @ActivityCallback
    private void backupFolderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) { call.reject("abgebrochen"); return; }
        Uri tree = data.getData();
        try {
            getContext().getContentResolver().takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        } catch (Exception e) { /* manche Anbieter erlauben nur zeitweise */ }
        getContext().getSharedPreferences(BK, Context.MODE_PRIVATE).edit().putString("tree", tree.toString()).apply();
        JSObject ret = new JSObject();
        ret.put("name", folderName(tree));
        call.resolve(ret);
    }

    @PluginMethod
    public void backupFolder(PluginCall call) {
        String tree = getContext().getSharedPreferences(BK, Context.MODE_PRIVATE).getString("tree", "");
        JSObject ret = new JSObject();
        ret.put("name", tree.isEmpty() ? "" : folderName(Uri.parse(tree)));
        call.resolve(ret);
    }

    @PluginMethod
    public void resetBackupFolder(PluginCall call) {
        getContext().getSharedPreferences(BK, Context.MODE_PRIVATE).edit().remove("tree").apply();
        call.resolve();
    }

    /** lesbarer Name, z. B. „Documents/Router-Backups“ statt der internen Adresse */
    static String folderName(Uri tree) {
        try {
            String id = DocumentsContract.getTreeDocumentId(tree);
            int p = id.indexOf(':');
            String vol = p > 0 ? id.substring(0, p) : "", path = p >= 0 ? id.substring(p + 1) : id;
            if (!"primary".equals(vol) && !vol.isEmpty() && !vol.matches("[0-9A-F]{4}-[0-9A-F]{4}")) return path.isEmpty() ? vol : path;
            String base = "primary".equals(vol) ? "" : "SD-Karte/";
            return base + (path.isEmpty() ? "Hauptordner" : path);
        } catch (Exception e) { return "gewählter Ordner"; }
    }

    /** Einmal sofort prüfen (zum Testen) */
    @PluginMethod
    public void checkNow(PluginCall call) {
        Context ctx = getContext().getApplicationContext();
        OneTimeWorkRequest req = new OneTimeWorkRequest.Builder(PhantomCheckWorker.class).build();
        WorkManager.getInstance(ctx).enqueueUniqueWork("phantom-check-now", ExistingWorkPolicy.REPLACE, req);
        call.resolve();
    }

    static String fingerprint(X509Certificate c) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(c.getEncoded());
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < d.length; i++) {
                if (i > 0) sb.append(':');
                sb.append(String.format("%02X", d[i]));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    static String normalize(String s) {
        return s == null ? "" : s.trim().toUpperCase();
    }
}
