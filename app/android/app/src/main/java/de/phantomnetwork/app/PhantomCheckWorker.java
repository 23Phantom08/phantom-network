package de.phantomnetwork.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.HashMap;
import java.util.Map;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Hintergrund-Check (ca. alle 15 Minuten, Android WorkManager).
 * Liest das Systemprotokoll des Masters und meldet neue Geräte, Fehler/kritische Meldungen
 * und Cudys, die nicht mehr antworten.
 * Das Passwort wird NICHT kopiert: es wird direkt aus dem verschlüsselten Speicher der App
 * (Android Keystore, AES-GCM – derselbe wie beim Login) gelesen.
 */
public class PhantomCheckWorker extends Worker {

    static final String PREFS = "phantom_check";            // Einstellungen (ohne Passwort)
    static final String STATE = "phantom_check_state";      // was schon gemeldet/gesehen wurde
    static final String CHANNEL = "phantom_alerts";
    private static final String SID0 = "00000000000000000000000000000000";

    // gleicher Speicher wie @aparajita/capacitor-secure-storage
    private static final String SECURE_PREFS = "WSSecureStorageSharedPreferences";
    private static final char IV_SEPARATOR = '\u0010';
    private static final int B64 = Base64.NO_PADDING | Base64.NO_WRAP;

    private static final Pattern DHCP = Pattern.compile("DHCPACK\\([^)]+\\) ([0-9.]+) ([0-9a-fA-F:]{17})(?: (\\S+))?");
    // als „err“ protokolliert, aber harmlos:
    //  - cron meldet jeden Lauf
    //  - hostapd „key addition failed“: bekannte Meldung der WLAN-Treiber beim Schlüsselwechsel, WLAN läuft normal weiter
    //  - dnsmasq „failed to send packet“: kurz während ein Netz neu startet (z. B. VPN an/aus) – echte Ausfälle meldet „Cudy antwortet nicht“
    //  - procd „Got unexpected signal“: procd ignoriert das Signal nur und schreibt es ins Protokoll
    private static final Pattern NOISE = Pattern.compile("crond(\\[\\d+\\])?: |drop_caches|nl80211: kernel reports: key addition failed|dnsmasq\\[\\d+\\]: failed to send packet|procd: Got unexpected signal");

    public PhantomCheckWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            run();
        } catch (Exception e) {
            // nie in eine Wiederhol-Schleife laufen – der nächste reguläre Lauf kommt sowieso
        }
        return Result.success();
    }

    private void run() throws Exception {
        Context ctx = getApplicationContext();
        SharedPreferences cfg = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!cfg.getBoolean("on", false)) return;
        String url = cfg.getString("url", "");
        String user = cfg.getString("user", "root");
        setupPins(cfg);
        String pw = readSecret(ctx, cfg.getString("secretKey", ""));
        if (url.isEmpty() || pw == null) return;
        List<String> kinds = jsonList(cfg.getString("kinds", "[]"));
        SharedPreferences st = ctx.getSharedPreferences(STATE, Context.MODE_PRIVATE);
        List<String[]> notes = new ArrayList<>();   // {art, text}

        String sid = st.getString("sid", "");

        // ---- bekannte Geräte ----
        String knownStr = st.getString("known", null);
        boolean first = knownStr == null;
        JSONObject known = first ? new JSONObject() : new JSONObject(knownStr);
        if (first) {
            sid = login(url, user, pw);
            JSONObject leases = call(url, sid, "luci-rpc", "getDHCPLeases", new JSONObject());
            JSONArray la = leases != null ? leases.optJSONArray("dhcp_leases") : null;
            if (la != null) for (int i = 0; i < la.length(); i++) {
                String m = la.getJSONObject(i).optString("macaddr", "");
                if (!m.isEmpty()) known.put(m.toUpperCase(), 1);
            }
            JSONObject dhcp = call(url, sid, "uci", "get", new JSONObject().put("config", "dhcp"));
            JSONObject vals = dhcp != null ? dhcp.optJSONObject("values") : null;
            if (vals != null) {
                Iterator<String> it = vals.keys();
                while (it.hasNext()) {
                    JSONObject s = vals.optJSONObject(it.next());
                    if (s == null || !"host".equals(s.optString(".type"))) continue;
                    Object mac = s.opt("mac");
                    String all = mac instanceof JSONArray ? join((JSONArray) mac) : String.valueOf(mac == null ? "" : mac);
                    for (String m : all.split("\\s+")) if (!m.isEmpty()) known.put(m.toUpperCase(), 1);
                }
            }
        }

        // ---- Systemprotokoll ----
        JSONObject logRes;
        try {
            if (sid.isEmpty()) throw new Exception("nosid");
            logRes = call(url, sid, "log", "read", logParams());
        } catch (Exception e) {
            sid = login(url, user, pw);
            logRes = call(url, sid, "log", "read", logParams());
        }
        JSONArray log = logRes != null ? logRes.optJSONArray("log") : null;
        long lastId = st.getLong("lastId", 0);
        long maxId = 0;
        if (log != null && log.length() > 0) maxId = log.getJSONObject(log.length() - 1).optLong("id", 0);
        boolean rebooted = maxId < lastId;   // Protokoll nach Neustart neu: nur Stand übernehmen

        if (log != null) for (int i = 0; i < log.length(); i++) {
            JSONObject l = log.getJSONObject(i);
            String msg = l.optString("msg", "");
            Matcher m = DHCP.matcher(msg);
            boolean old = first || rebooted || l.optLong("id", 0) <= lastId;
            if (m.find()) {
                String mac = m.group(2).toUpperCase();
                if (!known.has(mac)) {
                    known.put(mac, 1);
                    if (!old && kinds.contains("newdev")) {
                        String name = m.group(3) != null && !"*".equals(m.group(3)) ? m.group(3) : L(ctx, "Unbekanntes Gerät", "Unknown device");
                        notes.add(new String[] { "newdev", name + " (" + m.group(1) + ", " + mac + ")" });
                    }
                }
                continue;
            }
            if (old) continue;
            int sev = l.optInt("priority", 7) & 7;   // 0 Notfall … 2 kritisch, 3 Fehler
            if (sev <= 3 && kinds.contains("error") && !NOISE.matcher(msg).find()) {
                notes.add(new String[] { sev <= 2 ? "crit" : "error", msg.length() > 180 ? msg.substring(0, 180) : msg });
            }
        }

        // ---- Cudys, die nicht antworten (nur beim Wechsel melden) ----
        JSONObject down = new JSONObject(st.getString("down", "{}"));
        if (kinds.contains("cudy")) {
            JSONArray others = new JSONArray(cfg.getString("others", "[]"));
            for (int i = 0; i < others.length(); i++) {
                JSONObject o = others.getJSONObject(i);
                String ou = o.optString("url"), on = o.optString("name", ou);
                boolean ok = reachable(ou);
                if (!ok && !down.optBoolean(ou)) notes.add(new String[] { "cudy", on + L(ctx, " antwortet nicht", " is not responding") });
                if (ok && down.optBoolean(ou)) notes.add(new String[] { "cudy", on + L(ctx, " ist wieder da", " is back") });
                down.put(ou, !ok);
            }
        }

        // ---- Firmware-Updates (wie die HA-Integration: offizielle Liste, nur gleicher Zweig, alle 12 Std.) ----
        if (kinds.contains("fw") && System.currentTimeMillis() - st.getLong("fwAt", 0) > 12 * 3600_000L) {
            try {
                JSONObject vj = new JSONObject(getPublic("https://downloads.openwrt.org/.versions.json"));
                List<String> list = jsonList(vj.optJSONArray("versions_list") != null ? vj.optJSONArray("versions_list").toString() : "[]");
                list.add(vj.optString("stable_version", ""));
                list.add(vj.optString("oldstable_version", ""));
                JSONObject told = new JSONObject(st.getString("fwTold", "{}"));
                JSONArray rs = new JSONArray(cfg.getString("routers", "[]"));
                for (int i = 0; i < rs.length(); i++) {
                    String rn = rs.getJSONObject(i).optString("name"), cur = rs.getJSONObject(i).optString("version");
                    String up = fwLatest(cur, list);
                    // jede neue Version nur einmal pro Router melden
                    if (up != null && !up.equals(told.optString(rn))) {
                        notes.add(new String[] { "fw", rn + ": OpenWrt " + cur + " → " + up + L(ctx, " verfügbar", " available") });
                        told.put(rn, up);
                    }
                }
                st.edit().putLong("fwAt", System.currentTimeMillis()).putString("fwTold", told.toString()).apply();
            } catch (Exception e) { /* ohne Internet: beim nächsten Lauf wieder */ }
        }

        // ---- Tageslimit (Zähler auf dem Master): erreicht / kurz davor – einmal je Profil, Tag und Limit ----
        if (kinds.contains("limit") || kinds.contains("limitwarn")) {
            try {
                JSONObject f = call(url, sid, "file", "read", new JSONObject().put("path", "/tmp/phantom/today.json"));
                JSONObject tj = new JSONObject(f != null ? f.optString("data", "{}") : "{}");
                String day = tj.optString("day", "");
                JSONObject told = new JSONObject(st.getString("limTold", "{}"));
                if (!day.equals(told.optString("_day"))) told = new JSONObject().put("_day", day);
                JSONObject ps = tj.optJSONObject("profiles");
                if (ps != null) {
                    Iterator<String> it = ps.keys();
                    while (it.hasNext()) {
                        String id = it.next();
                        JSONObject p = ps.optJSONObject(id);
                        if (p == null) continue;
                        int limit = p.optInt("limit", 0), used = p.optInt("used", 0), left = limit - used;
                        String name = p.optString("name", id);
                        if (limit <= 0) continue;
                        if (left <= 0 && kinds.contains("limit") && !told.has(id + ":hit:" + limit)) {
                            notes.add(new String[] { "limit", L(ctx, name + " hat das Tageslimit erreicht (" + fmtMin(ctx, limit) + "). Die Geräte sind bis Mitternacht offline.", name + " reached the daily limit (" + fmtMin(ctx, limit) + "). The devices are offline until midnight."), id, name });
                            told.put(id + ":hit:" + limit, 1);
                        } else if (left > 0 && left <= 20 && kinds.contains("limitwarn") && !told.has(id + ":warn:" + limit)) {
                            notes.add(new String[] { "limitwarn", L(ctx, name + ": nur noch " + fmtMin(ctx, left) + " – dann ist das Tageslimit erreicht.", name + ": only " + fmtMin(ctx, left) + " left until the daily limit."), id, name });
                            told.put(id + ":warn:" + limit, 1);
                        }
                    }
                }
                st.edit().putString("limTold", told.toString()).apply();
            } catch (Exception e) { /* Zähler nicht installiert: nichts melden */ }
        }

        st.edit().putString("sid", sid).putLong("lastId", maxId).putString("known", known.toString()).putString("down", down.toString()).apply();
        notify(ctx, notes);
    }

    private static JSONObject logParams() throws Exception {
        return new JSONObject().put("lines", 500).put("stream", false).put("oneshot", true);
    }

    // ---------- Benachrichtigungen ----------
    private static void notify(Context ctx, List<String[]> notes) {
        if (notes.isEmpty()) return;
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        ensureChannel(ctx);
        NotificationManagerCompat nm = NotificationManagerCompat.from(ctx);
        if (!nm.areNotificationsEnabled()) return;

        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        int start = Math.max(0, notes.size() - 5);
        int base = (int) ((System.currentTimeMillis() / 1000) % 100000) * 10;
        for (int i = start; i < notes.size(); i++) {
            String[] n = notes.get(i);
            String title = "Phantom Network · " + ("newdev".equals(n[0]) ? L(ctx, "Neues Gerät", "New device") : "crit".equals(n[0]) ? L(ctx, "Kritischer Fehler", "Critical error") : "error".equals(n[0]) ? L(ctx, "Fehler", "Error") : "fw".equals(n[0]) ? "Firmware-Update"
                : "limit".equals(n[0]) ? L(ctx, "Tageslimit erreicht", "Daily limit reached") : "limitwarn".equals(n[0]) ? L(ctx, "Tageslimit bald erreicht", "Daily limit almost reached") : "Router");
            int id = base + (i - start);
            boolean locked = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("lock", false);
            if ("limit".equals(n[0]) && n.length > 3 && !locked) {
                // „+30 Min geben“ direkt aus der Mitteilung
                Intent bi = new Intent(ctx, BonusReceiver.class).putExtra("pid", n[2]).putExtra("name", n[3]).putExtra("nid", id);
                PendingIntent bp = PendingIntent.getBroadcast(ctx, id, bi, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                post(ctx, nm, id, title, n[1], pi, L(ctx, "+30 Min geben", "+30 min"), bp);
            } else post(ctx, nm, id, title, n[1], pi, null, null);
        }
        if (notes.size() > 5) post(ctx, nm, base + 9, "Phantom Network", (notes.size() - 5) + L(ctx, " weitere Meldungen – App öffnen", " more alerts – open the app"), pi, null, null);
    }

    /** einzelne Mitteilung (z. B. Antwort auf „+30 Min geben“) */
    static void notifyOne(Context ctx, int id, String title, String text) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        ensureChannel(ctx);
        NotificationManagerCompat nm = NotificationManagerCompat.from(ctx);
        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        post(ctx, nm, id, title, text, pi, null, null);
    }

    @SuppressLint("MissingPermission")
    private static void post(Context ctx, NotificationManagerCompat nm, int id, String title, String text, PendingIntent pi, String actionTitle, PendingIntent action) {
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_phantom)
            .setColor(0xFFA855F7)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setContentIntent(pi)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        if (action != null) b.addAction(0, actionTitle, action);
        try { nm.notify(id, b.build()); } catch (SecurityException e) { /* Recht entzogen */ }
    }

    static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager m = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        // immer anlegen: so folgt der Name in den Android-Einstellungen der gewählten Sprache
        if (m != null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, L(ctx, "Netzwerk-Meldungen", "Network alerts"), NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription(L(ctx, "Neue Geräte, Fehler und Router, die nicht antworten", "New devices, errors and routers that stop responding"));
            m.createNotificationChannel(ch);
        }
    }

    // ---------- Passwort aus dem Keystore (wie SecureStorage) ----------
    static String readSecret(Context ctx, String prefixedKey) {
        try {
            if (prefixedKey == null || prefixedKey.isEmpty()) return null;
            String data = ctx.getSharedPreferences(SECURE_PREFS, Context.MODE_PRIVATE).getString(prefixedKey, null);
            if (data == null) return null;
            int p = data.indexOf(IV_SEPARATOR);
            if (p < 0) return null;
            byte[] enc = Base64.decode(data.substring(0, p), B64);
            byte[] iv = Base64.decode(data.substring(p + 1), B64);
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
            ks.load(null);
            KeyStore.Entry entry = ks.getEntry(prefixedKey, null);
            if (!(entry instanceof KeyStore.SecretKeyEntry)) return null;
            SecretKey key = ((KeyStore.SecretKeyEntry) entry).getSecretKey();
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            return new String(c.doFinal(enc), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    // ---------- ubus über HTTP ----------
    private static String login(String url, String user, String pw) throws Exception {
        JSONObject r = call(url, SID0, "session", "login", new JSONObject().put("username", user).put("password", pw).put("timeout", 3600));
        if (r == null || !r.has("ubus_rpc_session")) throw new Exception("Login fehlgeschlagen");
        return r.getString("ubus_rpc_session");
    }

    /** Ergebnis-Objekt oder null; wirft bei Netzwerkfehler oder fehlender Berechtigung */
    private static JSONObject call(String url, String sid, String obj, String method, JSONObject params) throws Exception {
        JSONObject req = new JSONObject().put("jsonrpc", "2.0").put("id", 1).put("method", "call")
            .put("params", new JSONArray().put(sid).put(obj).put(method).put(params));
        JSONObject res = new JSONObject(post(url, req.toString()));
        JSONArray r = res.optJSONArray("result");
        if (r == null) throw new Exception("ubus " + res.optJSONObject("error"));
        if (r.optInt(0, -1) != 0) throw new Exception("ubus " + r.optInt(0, -1));
        return r.length() > 1 ? r.optJSONObject(1) : new JSONObject();
    }

    private static boolean reachable(String url) {
        try {
            post(url, "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"call\",\"params\":[\"" + SID0 + "\",\"session\",\"access\",{}]}");
            return true;   // jede Antwort (auch „keine Berechtigung“) heißt: Cudy lebt
        } catch (Exception e) {
            return false;
        }
    }

    private static final Map<String, String> PINS = new HashMap<>();

    /** HTTPS: nur das in der App bestätigte Zertifikat (Fingerabdruck) akzeptieren */
    static synchronized void setupPins(SharedPreferences cfg) {
        PINS.clear();
        PINS.put(cfg.getString("url", ""), cfg.getString("pin", ""));
        try { JSONArray oa = new JSONArray(cfg.getString("others", "[]")); for (int i = 0; i < oa.length(); i++) PINS.put(oa.getJSONObject(i).optString("url"), oa.getJSONObject(i).optString("pin", "")); } catch (Exception e) { /* egal */ }
    }

    static String fmtMin(int m) { return m >= 60 ? (m / 60) + " Std" + (m % 60 > 0 ? " " + (m % 60) + " Min" : "") : m + " Min"; }
    static String fmtMin(Context ctx, int m) { return en(ctx) ? (m >= 60 ? (m / 60) + " h" + (m % 60 > 0 ? " " + (m % 60) + " min" : "") : m + " min") : fmtMin(m); }
    /* Sprache aus der App (Mehr → Sprache); fehlt sie, bleibt alles deutsch */
    static boolean en(Context ctx) { return "en".equals(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("lang", "de")); }
    static String L(Context ctx, String de, String en) { return en(ctx) ? en : de; }

    /** Bonus fürs Tageslimit eintragen (wie in der App: phantom_bonus + phantom_bonus_day am Profil) */
    static void giveBonus(Context ctx, String pid, int add) throws Exception {
        SharedPreferences cfg = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String url = cfg.getString("url", ""), user = cfg.getString("user", "root");
        String pw = readSecret(ctx, cfg.getString("secretKey", ""));
        if (url.isEmpty() || pw == null) throw new Exception("App nicht eingerichtet");
        setupPins(cfg);
        String sid = login(url, user, pw);
        JSONObject f = call(url, sid, "file", "read", new JSONObject().put("path", "/tmp/phantom/today.json"));
        String day = new JSONObject(f != null ? f.optString("data", "{}") : "{}").optString("day", "");
        if (day.isEmpty()) throw new Exception("Zähler antwortet nicht");
        String sec = "phantom_ppause_" + pid;
        JSONObject r = call(url, sid, "uci", "get", new JSONObject().put("config", "firewall").put("section", sec));
        JSONObject v = r != null ? r.optJSONObject("values") : null;
        if (v == null) throw new Exception("Profil nicht gefunden");
        int have = day.equals(v.optString("phantom_bonus_day")) ? v.optInt("phantom_bonus", 0) : 0;
        call(url, sid, "uci", "set", new JSONObject().put("config", "firewall").put("section", sec)
            .put("values", new JSONObject().put("phantom_bonus", String.valueOf(have + add)).put("phantom_bonus_day", day)));
        call(url, sid, "uci", "commit", new JSONObject().put("config", "firewall"));
    }

    /** neueste Version im selben Zweig (z. B. 25.12.x), sonst null */
    static String fwLatest(String cur, List<String> list) {
        int[] c = fwParse(cur);
        if (c == null) return null;
        int[] best = c;
        for (String v : list) { int[] p = fwParse(v); if (p != null && p[0] == c[0] && p[1] == c[1] && p[2] > best[2]) best = p; }
        return best == c ? null : best[0] + "." + best[1] + "." + best[2];
    }
    private static int[] fwParse(String v) {
        java.util.regex.Matcher m = Pattern.compile("^(\\d+)\\.(\\d+)\\.(\\d+)$").matcher(v == null ? "" : v);
        return m.matches() ? new int[] { Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)) } : null;
    }

    /** öffentliche Adresse mit normaler Zertifikatsprüfung (nicht die Router-Pins) */
    private static String getPublic(String url) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        try {
            con.setConnectTimeout(10000);
            con.setReadTimeout(15000);
            InputStream in = con.getInputStream();
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
            in.close();
            return bo.toString("UTF-8");
        } finally {
            con.disconnect();
        }
    }

    private static String post(String url, String body) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        if (con instanceof HttpsURLConnection) {
            final String pin = PhantomNative.normalize(PINS.get(url));
            final String[] seen = { "" };
            X509TrustManager tm = new X509TrustManager() {
                public void checkClientTrusted(X509Certificate[] c, String a) { }
                public void checkServerTrusted(X509Certificate[] chain, String a) throws CertificateException {
                    if (chain == null || chain.length == 0) throw new CertificateException("kein Zertifikat");
                    seen[0] = PhantomNative.fingerprint(chain[0]);
                    if (pin.isEmpty() || !pin.equals(seen[0])) throw new CertificateException("Zertifikat unbekannt");
                }
                public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            };
            SSLContext sc = SSLContext.getInstance("TLS");
            sc.init(null, new TrustManager[] { tm }, null);
            HttpsURLConnection https = (HttpsURLConnection) con;
            https.setSSLSocketFactory(sc.getSocketFactory());
            https.setHostnameVerifier((h, ss) -> !pin.isEmpty() && pin.equals(seen[0]));
        }
        try {
            con.setConnectTimeout(8000);
            con.setReadTimeout(8000);
            con.setRequestMethod("POST");
            con.setDoOutput(true);
            con.setRequestProperty("Content-Type", "application/json");
            byte[] data = body.getBytes(StandardCharsets.UTF_8);
            con.setFixedLengthStreamingMode(data.length);
            try (OutputStream os = con.getOutputStream()) { os.write(data); }
            InputStream in = con.getResponseCode() >= 400 ? con.getErrorStream() : con.getInputStream();
            if (in == null) throw new Exception("HTTP " + con.getResponseCode());
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
            in.close();
            return bo.toString("UTF-8");
        } finally {
            con.disconnect();
        }
    }

    private static List<String> jsonList(String s) {
        List<String> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(s);
            for (int i = 0; i < a.length(); i++) out.add(a.getString(i));
        } catch (Exception e) { /* leer */ }
        return out;
    }

    private static String join(JSONArray a) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < a.length(); i++) sb.append(a.optString(i)).append(' ');
        return sb.toString();
    }
}
