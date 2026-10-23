/* Plattform-Schicht: native Android-Funktionen, im Browser (Test) mit Ersatz */
'use strict';

const Cap = window.Capacitor;
const NATIVE = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
const plugin = (name) => (Cap && Cap.registerPlugin ? Cap.registerPlugin(name) : null);

const Plat = {
	native: NATIVE,
	Http: NATIVE ? plugin('CapacitorHttp') : null,
	Prefs: NATIVE ? plugin('Preferences') : null,
	Secure: NATIVE ? plugin('SecureStorage') : null,
	Zero: NATIVE ? plugin('ZeroConf') : null,
	Notify: NATIVE ? plugin('LocalNotifications') : null,
	AppP: NATIVE ? plugin('App') : null,
	ShareP: NATIVE ? plugin('Share') : null,
	Phantom: NATIVE ? plugin('PhantomNative') : null,
	Bars: NATIVE ? plugin('SystemBars') : null
};

/* ---------- Einstellungen (nicht geheim) ---------- */
Plat.getPref = async function (key, dflt) {
	try {
		if (Plat.Prefs) {
			const r = await Plat.Prefs.get({ key });
			return r && r.value != null ? JSON.parse(r.value) : dflt;
		}
		const v = localStorage.getItem('ph.' + key);
		return v != null ? JSON.parse(v) : dflt;
	} catch (e) { return dflt; }
};
Plat.setPref = async function (key, val) {
	try {
		if (Plat.Prefs) await Plat.Prefs.set({ key, value: JSON.stringify(val) });
		else localStorage.setItem('ph.' + key, JSON.stringify(val));
	} catch (e) { /* Browser ohne Speicher */ }
};

/* ---------- Passwörter: Android-Schlüsselspeicher ---------- */
const memSecrets = {};
Plat.getSecret = async function (key) {
	try {
		if (Plat.Secure) {
			const r = await Plat.Secure.internalGetItem({ prefixedKey: 'phantom.' + key });
			return r && r.data != null ? String(r.data) : null;
		}
	} catch (e) { /* nicht vorhanden */ }
	return memSecrets[key] ?? null;
};
Plat.setSecret = async function (key, val) {
	try {
		if (Plat.Secure) {
			if (val == null) await Plat.Secure.internalRemoveItem({ prefixedKey: 'phantom.' + key });
			else await Plat.Secure.internalSetItem({ prefixedKey: 'phantom.' + key, data: String(val) });
			return;
		}
	} catch (e) { /* weiter mit Speicher im RAM */ }
	if (val == null) delete memSecrets[key]; else memSecrets[key] = String(val);
};

/* ---------- HTTP zum Router ----------
   HTTP:  CapacitorHttp (nativ, ohne CORS-Grenzen)
   HTTPS: eigenes Modul mit Zertifikat-Merken (selbst ausgestellte Zertifikate der Router) */
Plat.httpJson = async function (url, body, opts) {
	opts = opts || {};
	const timeout = opts.timeout || 8000;
	if (url.startsWith('https:') && Plat.Phantom) {
		const r = await Plat.Phantom.request({ url, method: 'POST', body: JSON.stringify(body), pin: opts.pin || '', timeout });
		if (r.needTrust) { const e = new Error(r.changed ? 'Zertifikat hat sich geändert!' : 'Zertifikat noch nicht bestätigt'); e.fingerprint = r.fingerprint; e.needTrust = true; e.changed = !!r.changed; throw e; }
		if (r.status < 200 || r.status >= 300) throw new Error('HTTP ' + r.status);
		return JSON.parse(r.data);
	}
	if (Plat.Http) {
		const r = await Plat.Http.request({ url, method: 'POST', headers: { 'Content-Type': 'application/json' }, data: body, responseType: 'json', connectTimeout: timeout, readTimeout: timeout });
		if (r.status < 200 || r.status >= 300) throw new Error('HTTP ' + r.status);
		return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
	}
	const ctl = new AbortController();
	const t = setTimeout(() => ctl.abort(), timeout);
	try {
		const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
		if (!r.ok) throw new Error('HTTP ' + r.status);
		return await r.json();
	} finally { clearTimeout(t); }
};

/* Einfacher HTTP-Aufruf mit eigenen Kopfzeilen (nur Android-App, z. B. UPnP zum Gateway) */
Plat.rawHttp = async function (url, method, body, headers, timeout) {
	if (!Plat.Phantom) throw new Error('nur in der App');
	const r = await Plat.Phantom.request({ url, method, body: body || '', headers: headers || {}, pin: '', timeout: timeout || 4000 });
	if (r.status < 200 || r.status >= 300) throw new Error('HTTP ' + r.status);
	return r.data || '';
};

/* Öffentliche Adresse (z. B. Versionsliste von OpenWrt) – mit normaler Zertifikatsprüfung */
Plat.getPublic = async function (url, timeout) {
	if (!Plat.Phantom) throw new Error('nur in der App');
	const r = await Plat.Phantom.request({ url, method: 'GET', body: '', pin: '', public: true, timeout: timeout || 10000 });
	if (r.status < 200 || r.status >= 300) throw new Error('HTTP ' + r.status);
	return r.data || '';
};

/* Backup eines Routers (wie „Sicherung herunterladen“ in LuCI) aufs Handy speichern */
Plat.backupFolder = async function () { if (!Plat.Phantom) return ''; try { return (await Plat.Phantom.backupFolder()).name || ''; } catch (e) { return ''; } };
Plat.pickBackupFolder = async function () { const r = await Plat.Phantom.pickBackupFolder(); return r.name || ''; };
Plat.resetBackupFolder = async function () { if (Plat.Phantom) await Plat.Phantom.resetBackupFolder(); };
Plat.saveBackup = async function (url, sid, pin, filename) {
	if (!Plat.Phantom) throw new Error('Backup geht nur in der Android-App');
	return Plat.Phantom.saveBackup({ url, sid, pin: pin || '', filename });
};

/* Zertifikat eines HTTPS-Router abfragen (Fingerabdruck zum Bestätigen) */
Plat.peekCert = async function (url) {
	if (!Plat.Phantom) throw new Error('HTTPS braucht die Android-App');
	const r = await Plat.Phantom.request({ url, method: 'GET', body: '', pin: '', timeout: 6000 });
	return r.fingerprint || '';
};

/* ---------- Gateway (= Master) des WLANs ---------- */
Plat.gateway = async function () {
	try {
		if (Plat.Phantom) {
			const r = await Plat.Phantom.gateway();
			return r && r.gateway ? r.gateway : null;
		}
	} catch (e) { /* kein WLAN */ }
	return null;
};

/* ---------- mDNS: Phantom-Router suchen ---------- */
Plat.discover = async function (ms) {
	if (!Plat.Zero) return [];
	const found = {};
	try {
		await Plat.Zero.watch({ type: '_phantom._tcp.', domain: 'local.' }, (r) => {
			if (!r || !r.service || r.action !== 'resolved') return;
			const s = r.service;
			const ip = (s.ipv4Addresses || [])[0];
			if (!ip) return;
			const t = s.txtRecord || {};
			found[ip] = { ip, port: s.port || 80, name: t.name || s.name, role: t.role || 'ap', model: t.model || '' };
		});
		await new Promise((res) => setTimeout(res, ms || 3500));
		await Plat.Zero.unwatch({ type: '_phantom._tcp.', domain: 'local.' });
	} catch (e) { /* Suche nicht möglich */ }
	return Object.values(found);
};

/* ---------- Benachrichtigungen ---------- */
Plat.notifyPermission = async function () {
	if (!Plat.Notify) return false;
	try {
		let p = await Plat.Notify.checkPermissions();
		if (p.display !== 'granted') p = await Plat.Notify.requestPermissions();
		return p.display === 'granted';
	} catch (e) { return false; }
};
Plat.notify = async function (title, body) {
	if (!Plat.Notify) return;
	try { await Plat.Notify.schedule({ notifications: [ { id: Math.floor(Math.random() * 2e9), title, body, smallIcon: 'ic_stat_phantom' } ] }); } catch (e) { /* aus */ }
};

/* Hintergrund-Check (eigener Android-Job, ca. alle 15 Min.): bekommt nur den Speicherort des Passworts */
Plat.checkConfig = async function (cfg) {
	if (!Plat.Phantom) return;
	try { await Plat.Phantom.checkConfig(cfg); } catch (e) { /* nicht verfügbar */ }
};
/* WireGuard-App auf dem Handy fernsteuern (nur Android-App) */
Plat.wgStatus = async function () { if (!Plat.Phantom) return null; try { return await Plat.Phantom.wgStatus(); } catch (e) { return null; } };
Plat.wgPermission = async function () { const r = await Plat.Phantom.wgPermission(); return !!(r && r.allowed); };
Plat.wgSet = async function (tunnel, up) { return Plat.Phantom.wgSet({ tunnel, up }); };
Plat.checkNow = async function () { if (Plat.Phantom) { try { await Plat.Phantom.checkNow(); } catch (e) { /* egal */ } } };

/* Statusleiste passend zum Design (dunkel → helle Schrift) */
Plat.barStyle = function (dark) {
	if (Plat.Bars) Plat.Bars.setStyle({ style: dark ? 'DARK' : 'LIGHT' }).catch(() => {});
};

/* ---------- Teilen ---------- */
Plat.share = async function (title, text) {
	if (Plat.ShareP) { try { await Plat.ShareP.share({ title, text, dialogTitle: title }); return true; } catch (e) { return false; } }
	if (navigator.share) { try { await navigator.share({ title, text }); return true; } catch (e) { return false; } }
	return false;
};

/* App kommt in den Vordergrund → Daten neu laden */
Plat.onResume = function (fn) {
	if (Plat.AppP) Plat.AppP.addListener('appStateChange', (s) => { if (s.isActive) fn(); });
	else document.addEventListener('visibilitychange', () => { if (!document.hidden) fn(); });
};
/* App geht in den Hintergrund (für die App-Sperre) */
Plat.onPause = function (fn) {
	if (Plat.AppP) Plat.AppP.addListener('appStateChange', (s) => { if (!s.isActive) fn(); });
	else document.addEventListener('visibilitychange', () => { if (document.hidden) fn(); });
};

/* ---------- App-Login: Fingerabdruck (Android) und Passwort-Hash ---------- */
Plat.biometricAvailable = async function () {
	if (!Plat.Phantom || !Plat.Phantom.biometricAvailable) return false;
	try { return !!(await Plat.Phantom.biometricAvailable()).ok; } catch (e) { return false; }
};
Plat.biometric = async function (title, sub) {
	if (!Plat.Phantom) throw new Error('nur in der App');
	await Plat.Phantom.biometric({ title, sub: sub || '' });
	return true;
};
/* PBKDF2-SHA256 – gespeichert wird nur der Hash, nie das Passwort */
Plat.hashPw = async function (pw, saltB64, iter) {
	iter = iter || 150000;
	const salt = saltB64 ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, [ 'deriveBits' ]);
	const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
	const b64 = (u) => btoa(String.fromCharCode(...new Uint8Array(u)));
	return { salt: b64(salt), hash: b64(bits), iter };
};
Plat.onBack = function (fn) {
	if (Plat.AppP) Plat.AppP.addListener('backButton', fn);
};
Plat.exitApp = function () { if (Plat.AppP) Plat.AppP.exitApp(); };

/* Speedtest-Downloads am WebView vorbei an der Bridge (originales fetch) */
Plat.webFetch = (window.CapacitorWebFetch || window.fetch).bind(window);

window.Plat = Plat;
