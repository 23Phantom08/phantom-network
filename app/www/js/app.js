/* Phantom Network – Oberfläche */
'use strict';

/* ================= Hilfen ================= */
const $app = document.getElementById('app');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const attr = esc;
const fmtBytes = (b) => {
	b = Number(b) || 0;
	if (b < 1024) return b + ' B';
	const u = [ 'kB', 'MB', 'GB', 'TB' ]; let i = -1;
	do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
	return (b >= 100 ? Math.round(b) : b.toFixed(1).replace('.', ',')) + ' ' + u[i];
};
const fmtDur = (sec) => {
	sec = Math.max(0, Math.floor(Number(sec) || 0));
	const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60);
	if (d) return d + ' T ' + h + ' Std';
	if (h) return h + ' Std ' + m + ' Min';
	return m + ' Min';
};
const fmtMin = (m) => { m = Math.round(m || 0); return m >= 60 ? Math.floor(m / 60) + ' Std ' + (m % 60 ? (m % 60) + ' Min' : '') : m + ' Min'; };
const fmtTime = (ms) => { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const fmtWhen = (ms) => {
	const d = new Date(ms), now = new Date();
	const same = d.toDateString() === now.toDateString();
	const y = new Date(now); y.setDate(now.getDate() - 1);
	if (same) return 'Heute ' + fmtTime(ms);
	if (d.toDateString() === y.toDateString()) return 'Gestern ' + fmtTime(ms);
	return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + fmtTime(ms);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uid = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const TYPES = [
	[ 'phone', 'Handy' ], [ 'tablet', 'Tablet' ], [ 'laptop', 'Laptop/PC' ], [ 'tv', 'Fernseher' ], [ 'console', 'Spielkonsole' ],
	[ 'speaker', 'Lautsprecher' ], [ 'watch', 'Uhr' ], [ 'server', 'Server/NAS' ], [ 'printer', 'Drucker' ], [ 'camera', 'Kamera' ],
	[ 'blind', 'Rollo' ], [ 'thermo', 'Thermostat' ], [ 'bulb', 'Licht' ], [ 'lswitch', 'Lichtschalter' ], [ 'plug', 'Steckdose' ], [ 'strip', 'Steckdosenleiste' ],
	[ 'solar', 'Solaranlage' ], [ 'washer', 'Waschmaschine' ], [ 'meter', 'Stromzähler' ], [ 'gauge', 'Wärmezähler' ], [ 'doorbell', 'Türklingel' ], [ 'vacuum', 'Saugroboter' ],
	[ 'hub', 'Hub' ], [ 'chip', 'Mikrocontroller' ], [ 'router', 'Netzwerk' ], [ 'other', 'Sonstiges' ]
];
const COLORS = [ '#a855f7', '#22e3ff', '#22e3a0', '#f5b85b', '#ff6b8a', '#7c9cff', '#ff9f43', '#e879f9' ];
const NETS = { lan: 'LAN', sh: 'Smart Home', gast: 'Gäste', '?': 'Unbekannt' };
/* Name eines Netzes so, wie er in OpenWrt heißt (z. B. „Smart_Home“ → „Smart Home“) */
function netName(k) {
	const i = (Net.ifaces || []).find((x) => netKeyOf(x.interface) === k);
	return i ? (i.interface === 'lan' ? 'LAN' : i.interface.replace(/_/g, ' ')) : (NETS[k] || k);
}
const KINDS = { connect: 'Verbunden', disconnect: 'Getrennt', roam: 'Router-Wechsel', dhcp: 'IP vergeben', newdev: 'Neue Geräte', pause: 'Pausen & Limits', limit: 'Tageslimit', cudy: 'Router offline' };
const NOTIFY_KINDS = { limit: 'Tageslimit erreicht', limitwarn: 'Kurz vor dem Tageslimit', newdev: 'Neue Geräte', error: 'Fehler & kritische Meldungen', cudy: 'Router offline', fw: 'Firmware-Updates' };

/* ================= Zustand ================= */
const S = {
	ready: false,
	logged: false,
	tab: 'home',
	stack: [],
	sheet: null,
	toast: null,
	login: { host: '', proto: 'https', pw: '', remember: true, searching: false, found: null, gateway: null, err: '', busy: false },
	allowHttp: false,
	lock: { on: false, user: '', fp: false, delay: 1, asked: false },
	locked: false, unlockErr: '', unlockRouter: false, bioOk: false,
	discovered: [],
	devFilter: 'all',
	devOff: false,
	devSearch: '',
	logFilter: 'all',
	theme: 'dark',
	notify: { on: false, kinds: [ 'limit', 'limitwarn', 'newdev', 'error', 'cudy', 'fw' ], v2: true, v3: true },
	speed: null,
	check: { host: 'google.de', out: '', busy: false },
	busy: {},
	useMode: {}, useSel: {}, inetAll: false,
	scroll: {}
};

/* HTTPS ist Standard (App). Im Browser geht nur das Protokoll der Seite selbst – dort ohne Zertifikat-Merken. */
function defProto() { return Plat.native ? 'https' : (location.protocol === 'https:' ? 'https' : 'http'); }

function toast(msg, err) {
	S.toast = { msg, err };
	renderToast();
	clearTimeout(toast.t);
	toast.t = setTimeout(() => { S.toast = null; renderToast(); }, err ? 4500 : 2600);
}
function renderToast() {
	let el = document.querySelector('.ph-toast');
	if (!S.toast) { if (el) el.remove(); return; }
	if (!el) { el = document.createElement('div'); document.body.appendChild(el); }
	el.className = 'ph-toast' + (S.toast.err ? ' err' : '');
	el.textContent = I18N.t(S.toast.msg);
}

/* ================= Speichern der Cudy-Liste (ohne Passwörter) ================= */
async function saveRouters() {
	await Plat.setPref('routers', Net.routers.map((r) => r.toJSON()));
	await Plat.setPref('master', Net.master ? Net.master.id : null);
}

/* ================= Start ================= */
async function start() {
	S.theme = await Plat.getPref('theme', 'dark');
	S.lang = await Plat.getPref('lang', 'auto');
	I18N.set(S.lang);
	applyTheme();
	S.notify = await Plat.getPref('notify', S.notify);
	S.notify.kinds = (S.notify.kinds || []).filter((k) => NOTIFY_KINDS[k]);
	if (!S.notify.v2) { if (!S.notify.kinds.includes('fw')) S.notify.kinds.push('fw'); S.notify.v2 = true; }   // neue Art einmalig mit einschalten
	if (!S.notify.v3) { for (const k of [ 'limit', 'limitwarn' ]) if (!S.notify.kinds.includes(k)) S.notify.kinds.push(k); S.notify.v3 = true; }
	S.allowHttp = await Plat.getPref('allowHttp', false);
	S.lock = Object.assign({}, S.lock, await Plat.getPref('lock', {}));
	S.bioOk = await Plat.biometricAvailable();
	Router.onPin = () => saveRouters();   // HTTPS: beim ersten Kontakt gemerktes Zertifikat sichern
	S.vpnEp = await Plat.getPref('vpnEndpoint', '');
	S.wgTunnel = await Plat.getPref('wgTunnel', '');
	const list = await Plat.getPref('routers', []);
	const mid = await Plat.getPref('master', null);
	Net.routers = list.map((o) => new Router(o));
	Net.master = Net.routers.find((r) => r.id === mid) || null;
	if (!Plat.native && location.protocol.startsWith('http')) S.login.host = location.host;
	S.login.proto = defProto();

	// Zeitpunkt merken – auch über einen Neustart der App hinweg (Android beendet Apps im Hintergrund gern)
	Plat.onPause(() => { if (S.locked) return; S.pausedAt = Date.now(); if (S.lock.on) Plat.setPref('lockAway', S.pausedAt); });
	Plat.onResume(() => {
		// App-Sperre: nach der eingestellten Zeit im Hintergrund wieder sperren
		if (S.lock.on && !S.locked && S.pausedAt && Date.now() - S.pausedAt >= (S.lock.delay || 0) * 60000) { lockApp(); return; }
		if (S.logged && !S.locked) refresh(true);
	});
	// „Sperren nach“ gilt auch, wenn Android die App inzwischen beendet hat
	const away = S.lock.on ? Number(await Plat.getPref('lockAway', 0)) || 0 : 0;
	const recent = away > 0 && Date.now() >= away && Date.now() - away < (S.lock.delay || 0) * 60000;
	if (S.lock.on && !recent) {
		// gesperrt starten – erst nach dem Entsperren spricht die App mit den Routern
		S.ready = true;
		lockApp();
		await new Promise((res) => { S.unlockWait = res; });
		S.ready = false; render();
	}
	Plat.onBack(() => { if (S.sheet) closeSheet(); else if (S.stack.length) back(); else if (S.tab !== 'home') go('home'); else Plat.exitApp(); });

	if (Net.master) {
		S.login.host = Net.master.host; S.login.proto = Net.master.proto;
		render();
		try {
			// mDNS-Suche nur noch im Hintergrund – die bekannte Adresse wird sofort probiert.
			// Nur wenn der Master dort nicht antwortet, wird auf das Suchergebnis gewartet (DHCP hat die Adresse geändert).
			const loc = relocate().catch(() => []);
			try { await Net.master.relogin(); } catch (e) {
				if (e.needLogin) throw e;
				const old = Net.master.host;
				await loc;
				if (Net.master.host === old) throw e;
				await Net.master.relogin();
			}
			S.logged = true; S.ready = true;
			render();
			await refresh();
			loginOthers();
			return;
		} catch (e) {
			S.login.err = e.needLogin ? '' : 'Master nicht erreichbar: ' + e.message;
		}
	}
	S.ready = true;
	render();
	searchMaster();
}

function applyTheme() {
	let t = S.theme;
	if (t === 'auto') t = window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
	document.documentElement.dataset.theme = t;
	const m = document.querySelector('meta[name=theme-color]');
	if (m) m.content = t === 'light' ? '#f6f3ff' : '#0d0b16';
	Plat.barStyle(t !== 'light');
}

/* Adressen können sich ändern (DHCP): Router über ihren Namen per mDNS wiederfinden */
async function relocate() {
	const found = await Plat.discover(2500);
	S.discovered = found;
	let changed = false;
	for (const f of found) {
		const r = Net.routers.find((x) => x.host === f.ip) || Net.routers.find((x) => x.name && x.name === f.name);
		if (r && r.host !== f.ip) { r.host = f.ip; changed = true; }
		if (r && f.role) r.role = f.role;
	}
	if (!found.some((f) => f.ip === (Net.master && Net.master.host)) && Net.master) {
		const gw = await Plat.gateway();
		if (gw && gw !== Net.master.host && !found.length) { /* evtl. anderes Netz – nichts ändern */ }
	}
	if (changed) await saveRouters();
	return found;
}

async function searchMaster() {
	const L = S.login;
	L.searching = true; L.found = null; render();
	const [ gw, found ] = await Promise.all([ Plat.gateway(), Plat.discover(3500) ]);
	S.discovered = found;
	L.gateway = gw;
	const m = found.find((f) => f.role === 'router') || (gw ? { ip: gw, name: 'Router', role: 'router', viaGw: true } : null);
	L.found = m;
	if (m) L.host = m.ip;
	L.searching = false;
	render();
}

async function doLogin() {
	const L = S.login;
	readForm();
	if (!L.host) { L.err = 'Bitte die Adresse des Masters eingeben.'; render(); return; }
	if (!L.pw) { L.err = 'Bitte das Passwort eingeben.'; render(); return; }
	L.busy = true; L.err = ''; render();
	const host = L.host.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
	let r = Net.routers.find((x) => x.host === host);
	if (!r) r = new Router({ id: uid(), host, proto: L.proto, role: 'router', name: (L.found && L.found.ip === host && L.found.name) || host });
	r.proto = S.allowHttp ? L.proto : defProto();
	try {
		await loginRoot(r, L.pw);
		const net = await r.uciGet('network').catch(() => ({}));
		r.role = net.wan ? 'router' : 'ap';
		if (!Net.routers.includes(r)) Net.routers.unshift(r);
		Net.master = r;
		S.rootPw = L.pw;
		await Plat.setPref('remember', L.remember);
		await saveRouters();
		S.logged = true; L.busy = false; L.pw = '';
		S.tab = 'home'; S.stack = [];
		render();
		if (r.role !== 'router') toast('Hinweis: Dieser Router hat keinen Internet-Anschluss (kein Master?)', true);
		await addDiscovered(S.rootPw);
		await refresh();
		// danach weitere Router über die DHCP-Liste des Masters suchen und gleich mit anmelden
		if (await scanAndAdd()) await refresh(true);
	} catch (e) {
		L.busy = false;
		if (e.needTrust) { trustSheet(r, e.fingerprint, doLogin); return; }
		L.err = /Anmeldung|Keine Berechtigung|Fehler 6/.test(e.message) ? 'Passwort falsch oder Benutzer gesperrt.' : 'Keine Verbindung zu ' + host + ' (' + e.message + ')';
		render();
	}
}

async function loginRoot(r, pw) { r.user = 'root'; r.sid = null; await r.login(pw); await Plat.setSecret('pw.' + r.id, pw); }

/* Gefundene Router hinzufügen – gleiches Passwort wie der Master wird automatisch probiert */
async function addDiscovered(pw) {
	let added = 0;
	if (!pw && Net.master && S.discovered.some((f) => !Net.routers.some((r) => r.host === f.ip))) pw = await Plat.getSecret('pw.' + Net.master.id).catch(() => null);
	for (const f of S.discovered) {
		if (Net.routers.some((r) => r.host === f.ip)) continue;
		const r = new Router({ id: uid(), host: f.ip, name: f.name, role: f.role || 'ap', model: f.model, proto: defProto() });
		Net.routers.push(r);
		added++;
		if (pw) {
			try { await loginRoot(r, pw); } catch (e) {
				// kein HTTPS auf diesem Router? nur mit „HTTP erlauben“ auf HTTP ausweichen
				if (!e.needTrust && !e.ubus && S.allowHttp) { r.proto = 'http'; try { await loginRoot(r, pw); continue; } catch (e2) { /* unten */ } }
				r.lastError = e.needTrust ? 'Zertifikat bestätigen' : 'Passwort nötig';
			}
		}
	}
	if (added) await saveRouters();
	return added;
}
async function scanAndAdd() {
	if (!Plat.native) return 0;   // im Browser blockiert CORS die Anfragen an fremde Router
	const more = await Net.scanRouters().catch(() => []);
	for (const f of more) if (!S.discovered.some((x) => x.ip === f.ip)) S.discovered.push(f);
	return more.length ? addDiscovered(S.rootPw) : 0;
}
async function loginOthers() {
	await Promise.all(Net.others().map((r) => r.relogin().catch(() => {})));
	render();
}

function trustSheet(r, fp, cont) {
	const changed = !!r.pin;
	openSheet(`<h2>${changed ? 'Zertifikat hat sich geändert!' : 'Zertifikat bestätigen'}</h2>
		${changed ? `<div class="ph-banner bad"><small>Das Zertifikat von ${esc(r.name || r.host)} ist ein anderes als bisher. Das ist normal nach einem Firmware-Update oder Zurücksetzen – sonst nicht. Im Zweifel abbrechen.</small></div>` : ''}
		<div class="ph-hint">Vergleichen kannst du den Fingerabdruck im Browser: <span class="mono">https://${esc(r.host)}</span> öffnen → Symbol links neben der Adresse → Zertifikat → SHA-256.</div>
		<div class="ph-console">${esc(fp || 'unbekannt')}</div>
		<div class="ph-hint">Die App merkt sich dieses Zertifikat. Ändert es sich später, fragt sie erneut.</div>
		<button class="ph-btn primary" data-a="trust">Vertrauen &amp; weiter</button>
		<button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
	S.sheet.onTrust = async () => { r.pin = fp; closeSheet(); await saveRouters(); cont(); };
}

async function logout() {
	if (Net.master) await Plat.setSecret('pw.' + Net.master.id, null);
	for (const r of Net.routers) r.sid = null;
	S.logged = false; S.stack = []; S.tab = 'home';
	S.login.pw = '';
	render();
}

/* ================= Laden ================= */
let refreshTimer = null;
Net.onPartial = () => renderSoft();
async function refresh(quiet) {
	if (!S.logged || Net.loading) return;
	if (!quiet) { S.busy.load = true; renderSoft(); }
	try {
		await Net.load();
		if (await Net.endExpiredPauses().catch(() => 0)) await Net.load();
		checkCudyEvents();
		if (!Net.fwList || Date.now() - Net.fwList.at > 12 * 3600e3) Net.fwVersions().then(() => { renderSoft(); syncRunner().catch(() => {}); });
	} catch (e) {
		if (e.needLogin) { S.logged = false; S.login.err = 'Bitte neu anmelden.'; render(); return; }
		if (!quiet) toast('Master nicht erreichbar: ' + e.message, true);
	}
	S.busy.load = false;
	renderSoft();
	clearTimeout(refreshTimer);
	refreshTimer = setTimeout(() => { if (!document.hidden) refresh(true); }, 20000);
}

/* Router, die bei der letzten Abfrage nicht antworten, als Ereignis in der App zeigen */
function checkCudyEvents() {
	Net.cudyEvents = Net.routers.filter((r) => Net.info[r.id] && !Net.info[r.id].ok).map((r) => ({
		ts: Date.now(), kind: 'cudy', text: (r.name || r.host) + (Net.info[r.id].needLogin ? ': Passwort nötig' : ' antwortet nicht')
	}));
}

/* Nach einer Änderung neu laden, damit App und Router gleich sind */
async function act(label, fn, ok) {
	if (S.busy[label]) return;
	S.busy[label] = true; renderSoft();
	try {
		const r = await fn();
		if (ok) toast(typeof ok === 'function' ? ok(r) : ok);
		await Net.load().catch(() => {});
	} catch (e) {
		toast(e.message || String(e), true);
	}
	S.busy[label] = false;
	renderSoft();
}

/* ================= Navigation ================= */
function go(tab) { S.tab = tab; S.stack = []; S.scroll = {}; render(true); }   // Reiter beginnt immer oben
function push(v) { saveScroll(); S.stack.push(v); render(true); }
function back() { saveScroll(); S.stack.pop(); render(); }
function view() { return S.stack[S.stack.length - 1] || { v: S.tab }; }
function viewKey() { const v = view(); return v.v + (v.id || ''); }
function saveScroll() { const b = document.querySelector('.ph-body'); if (b) S.scroll[viewKey()] = b.scrollTop; }

function openSheet(html) { S.sheet = { html }; renderSheet(); }
function closeSheet() { S.sheet = null; renderSheet(); }
function renderSheet() {
	let el = document.querySelector('.ph-sheet-bg');
	if (!S.sheet) { if (el) el.remove(); return; }
	if (!el) { el = document.createElement('div'); el.className = 'ph-sheet-bg'; el.dataset.a = 'sheetBg'; document.body.appendChild(el); }
	el.innerHTML = '<div class="ph-sheet" role="dialog">' + S.sheet.html + '</div>';
	I18N.dom(el);
}

/* ================= Rendern ================= */
function paint(html) { $app.innerHTML = html; I18N.dom($app); }
function render(top) {
	if (!S.ready) return paint('<div class="ph-loading"><div class="ph-spin"></div>Verbinde mit dem Master …</div>');
	if (S.locked) return paint(lockView());
	if (!S.logged) return paint(loginView());
	const v = view();
	const fn = VIEWS[v.v] || VIEWS.home;
	const p = fn(v);
	// Zustand der Seite merken, damit das automatische Neuladen nichts zuklappt oder zurückspringt
	const key = viewKey();
	const keep = !top && S.lastKey === key;
	const opened = keep ? [ ...document.querySelectorAll('.ph-body details') ].map((d) => d.open) : [];
	const scrollX = keep ? [ ...document.querySelectorAll('.ph-body .ph-chips.scroll, .ph-body .ph-nettiles.scroll') ].map((c) => c.scrollLeft) : [];
	S.lastKey = key;
	$app.innerHTML = `<div class="ph-screen">
		<div class="ph-top">
			${S.stack.length ? `<button class="ph-iconbtn" data-a="back" aria-label="Zurück">${icon('back', 24)}</button>` : '<img src="img/logo-head.webp" alt="">'}
			<div class="ph-titles"><div class="ph-title">${esc(p.title)}</div>${p.sub ? `<div class="ph-sub">${esc(p.sub)}</div>` : ''}</div>
			${p.right || statusPill()}
		</div>
		<div class="ph-body">${p.body}</div>
		${navBar()}
	</div>`;
	I18N.dom($app);
	// aufgeklappte Bereiche zuerst wieder öffnen – sonst ist die Seite kurz zu kurz und springt nach oben
	document.querySelectorAll('.ph-body details').forEach((d, i) => { if (opened[i]) d.open = true; });
	const b = document.querySelector('.ph-body');
	if (b) b.scrollTop = top ? 0 : (S.scroll[viewKey()] || 0);
	document.querySelectorAll('.ph-body .ph-chips.scroll, .ph-body .ph-nettiles.scroll').forEach((c, i) => { if (scrollX[i]) c.scrollLeft = scrollX[i]; });
}
/* Neu zeichnen, ohne dass Eingaben oder die Scroll-Position verloren gehen */
function renderSoft() {
	const a = document.activeElement;
	if (a && (a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA') && $app.contains(a)) return;
	if (S.logged) saveScroll();
	render();
}

function statusPill() {
	if (S.busy.load) return '<div class="ph-spin"></div>';
	const inet = Net.internet();
	return `<button class="ph-pill${inet.up ? '' : ' off'}" data-a="refresh" style="background:transparent"><i></i>${inet.up ? 'Online' : 'Offline'}</button>`;
}
function navBar() {
	const items = [ [ 'home', 'home', 'Übersicht' ], [ 'dev', 'devices', 'Geräte' ], [ 'fam', 'family', 'Familie' ], [ 'net', 'net', 'Netz' ], [ 'fw', 'shield', 'Firewall' ], [ 'more', 'more', 'Mehr' ] ];
	return '<nav class="ph-nav">' + items.map(([ t, ic, l ]) => `<button class="${S.tab === t ? 'on' : ''}" data-a="tab" data-x="${t}"><span>${icon(ic, 22)}</span><span>${l}</span></button>`).join('') + '</nav>';
}

/* ---------- Bausteine ---------- */
const sw = (on, a, x, label) => `<button class="ph-switch" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-label="${attr(label || '')}" data-a="${a}" data-x="${attr(x || '')}"><span></span></button>`;
const swRow = (title, sub, on, a, x) => `<div class="ph-switchrow"><div class="ph-grow"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>${sw(on, a, x, title)}</div>`;
const kv = (k, v) => `<div class="ph-kv"><span>${esc(k)}</span><span>${v}</span></div>`;
// lange Werte (IPv6, mehrere DNS) unter die Beschriftung
const kvb = (k, v) => `<div class="ph-kv block"><span>${esc(k)}</span><span>${v}</span></div>`;
const fmtBits = (b) => b >= 1e6 ? (b / 1e6).toFixed(1).replace('.', ',') + ' Mbit/s' : Math.round(b / 1e3) + ' kbit/s';
const row = (ic, color, title, sub, right, a, x) => {
	const inner = `<div class="ph-ico" style="background:${color}">${ic}</div><div class="ph-grow"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>${right || ''}`;
	return a ? `<button class="ph-row" data-a="${a}" data-x="${attr(x || '')}">${inner}</button>` : `<div class="ph-row">${inner}</div>`;
};
const bars = (pct, band) => {
	if (pct == null) return '';
	const n = pct > 75 ? 4 : pct > 50 ? 3 : pct > 25 ? 2 : 1;
	return '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex:none"><div class="ph-bars">' + [ 5, 8, 11, 14 ].map((h, i) => `<i style="height:${h}px" class="${i < n ? 'on' : ''}"></i>`).join('') + `</div><small style="font-size:10px;color:var(--muted);line-height:1;white-space:nowrap">${band && band !== 'Kabel' ? esc(band) + ' · ' : ''}${pct} %</small></div>`;
};
const spinOr = (k, txt) => (S.busy[k] ? '<div class="ph-spin"></div>' : txt);
const devColor = (d) => (d.paused ? 'var(--bad)' : d.online ? netHex(d.net) : 'rgba(165,159,191,.35)');
const devIcon = (d, s) => icon(d.type, s || 20, '#0d0b16');
const chip = (on, a, x, label) => `<button class="ph-chip${on ? ' on' : ''}" data-a="${a}" data-x="${attr(x)}">${label}</button>`;

/* Hinweis, wenn der Phantom-Helfer fehlt (normales OpenWrt) */
const needHelper = (what) => `<div class="ph-banner warn"><div class="ph-line">${icon('info', 22, 'var(--warn)')}<div style="flex:1"><b>${esc(what)} gibt es nur mit der Phantom-Firmware</b><small>Dafür muss der Router selbst mitzählen – das kann normales OpenWrt ohne Zusatz nicht.</small></div></div></div>`;

/* ================= Anmeldung ================= */
function loginView() {
	const L = S.login;
	let found;
	if (L.searching) found = `<div class="ph-found search"><div class="ph-spin"></div><div><b>Suche Master …</b><small>im WLAN, über Gateway und mDNS</small></div></div>`;
	else if (L.found) found = `<div class="ph-found">${icon('router', 26, 'var(--ok)')}<div><b>${esc(L.found.viaGw ? 'Router im WLAN gefunden' : (L.found.name || 'Master') + ' gefunden')}</b><small class="mono">${esc(L.found.ip)}${S.discovered.length > 1 ? ' · ' + S.discovered.length + ' Router im Netz' : ''}</small></div><button class="ph-link" data-a="search">Neu suchen</button></div>`;
	else found = `<div class="ph-found miss">${icon('search', 24, 'var(--warn)')}<div><b>Kein Master gefunden</b><small>Adresse unten von Hand eingeben</small></div><button class="ph-link" data-a="search">Neu suchen</button></div>`;
	return `<div class="ph-login">
		<img src="img/logo-full.webp" alt="">
		<div class="brand"><b>Phantom Network</b><span>Dein Heimnetz</span></div>
		${found}
		<form data-f="login" onsubmit="return false">
			<label class="ph-field">Adresse des Masters<input name="host" inputmode="url" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="z. B. 192.168.1.1 oder phantom.lan" value="${attr(L.host)}"></label>
			${S.allowHttp ? `<div class="ph-chips">${chip(L.proto === 'https', 'proto', 'https', 'HTTPS (Standard)')}${chip(L.proto === 'http', 'proto', 'http', 'HTTP')}</div>` : ''}
			<label class="ph-field">Benutzer<input name="user" value="root" disabled></label>
			<label class="ph-field">Passwort<input name="pw" type="password" autocomplete="current-password" value="${attr(L.pw)}"></label>
			<label class="ph-check"><input type="checkbox" name="remember" ${L.remember ? 'checked' : ''}>Angemeldet bleiben (Passwort im Android-Schlüsselspeicher)</label>
			${L.err ? `<div class="ph-error">${esc(L.err)}</div>` : ''}
			<button class="ph-btn primary" data-a="login" ${L.busy ? 'disabled' : ''}>${L.busy ? '<div class="ph-spin"></div>&nbsp; Anmelden …' : 'Anmelden'}</button>
		</form>
		<div class="ph-dim">Weitere Router werden danach automatisch gefunden.<br>Haben sie ein anderes Passwort, gibst du es einmal unter „Mehr → Router &amp; Anmeldungen“ ein.</div>
	</div>`;
}
function readForm() {
	const f = document.querySelector('form[data-f=login]');
	if (!f) return;
	S.login.host = f.host.value.trim();
	S.login.pw = f.pw.value;
	S.login.remember = f.remember.checked;
}

/* ================= Ansichten ================= */
const VIEWS = {};

/* ---------- Übersicht ---------- */
VIEWS.home = () => {
	if (!Net.loadedAt) return { title: 'Übersicht', body: '<div class="ph-loading"><div class="ph-spin"></div>Lade Daten vom Master …</div>' };
	const inet = Net.internet();
	const on = Net.devices.filter((d) => d.online);
	const cudyOk = Net.routers.filter((r) => Net.info[r.id] && Net.info[r.id].ok).length;
	const today = Object.values(Net.today.macs || {}).reduce((a, b) => a + b, 0);
	const ws = Net.wanStats;
	const traffic = today ? { b: today, l: 'heute' } : ws ? { b: (ws.rx_bytes || 0) + (ws.tx_bytes || 0), l: 'seit Neustart' } : { b: 0, l: 'heute' };
	const paused = Net.devices.filter((d) => d.paused).length;
	const guest = Net.wlans().find((w) => w.guest);
	const night = Net.night();
	const offAt = Net.guestOffAt();
	const newEv = Net.events.filter((e) => e.kind === 'newdev' && e.ts > Date.now() - 86400000);
	const need = Net.routers.filter((r) => Net.info[r.id] && (Net.info[r.id].needLogin || !Net.info[r.id].ok));
	let body = '';
	const fwUp = Net.routers.filter((r) => Net.fwUpdate(r));
	if (!S.lock.on && !S.lock.asked) body += `<div class="ph-banner info"><div class="ph-line">${icon('lock', 22, 'var(--cyan)')}<div style="flex:1"><b>Neu: App-Login</b><small>Benutzername &amp; Passwort${S.bioOk ? ' oder Fingerabdruck' : ''}, bevor die App deine Router anspricht.</small></div></div>
		<div class="ph-grid2"><button class="ph-btn small primary" data-a="push" data-x="lockSetup">Einrichten</button><button class="ph-btn small" data-a="lockLater">Später</button></div></div>`;
	if (fwUp.length) body += `<div class="ph-banner info"><div class="ph-line">${icon('refresh', 22, 'var(--cyan)')}<div style="flex:1"><b>Firmware-Update: OpenWrt ${esc(Net.fwUpdate(fwUp[0]))}</b><small>${fwUp.length === 1 ? esc(fwUp[0].name || fwUp[0].host) : fwUp.length + ' Router'} · installieren über die Weboberfläche</small></div></div><button class="ph-btn small" data-a="push" data-x="cudys">Ansehen</button></div>`;
	if (need.length) body += `<div class="ph-banner warn"><div class="ph-line">${icon('router', 22, 'var(--warn)')}<div style="flex:1"><b>${need.length === 1 ? esc(need[0].name || need[0].host) + (Net.info[need[0].id].needLogin ? ' braucht ein Passwort' : ' antwortet nicht') : need.length + ' Router brauchen Aufmerksamkeit'}</b><small>Daten dieser Router fehlen gerade</small></div></div><button class="ph-btn small" data-a="push" data-x="cudys">Router &amp; Anmeldungen</button></div>`;
	if (newEv.length) body += `<div class="ph-banner info"><div class="ph-line">${icon('bell', 22, 'var(--cyan)')}<div style="flex:1"><b>${newEv.length === 1 ? 'Neues Gerät im Netz' : newEv.length + ' neue Geräte heute'}</b><small>${esc(newEv[0].text.replace(/^Neues Gerät: /, ''))}</small></div></div><button class="ph-btn small" data-a="push" data-x="log">Ansehen</button></div>`;
	body += `<div class="ph-hero${inet.up ? '' : ' bad'}">
		<div style="display:flex;align-items:center;gap:12px">${icon(inet.up ? 'shield' : 'power', 30, inet.up ? 'var(--ok)' : 'var(--bad)')}
			<div style="flex:1"><b style="font-size:18px">${inet.up ? 'Internet verbunden' : 'Kein Internet'}</b><div class="ph-sub">${inet.up ? 'Seit ' + fmtDur(inet.uptime) + (inet.ip ? ' · ' + esc(inet.ip) : '') : 'Der Master hat keine Verbindung nach draußen'}</div></div></div>
		<div class="ph-stats">
			<div class="ph-stat"><b>${on.length}</b><span>Geräte online</span></div>
			<div class="ph-stat"><b>${cudyOk}/${Net.routers.length}</b><span>Router aktiv</span></div>
			<div class="ph-stat"><b>${fmtBytes(traffic.b)}</b><span>${traffic.l}</span></div>
		</div></div>`;
	body += `<div class="ph-grid2">
		<button class="ph-tile" data-a="push" data-x="guest">${icon('guest', 24, 'var(--warn)')}<b>Gäste-WLAN</b><small>${guest ? (guest.on ? 'An' + (offAt ? ' bis ' + fmtTime(offAt) : '') : 'Aus') : 'nicht eingerichtet'}</small></button>
		<button class="ph-tile" data-a="push" data-x="night">${icon('moon', 24, 'var(--violet)')}<b>Nachtmodus</b><small>${night.on ? night.start + '–' + night.stop : 'Aus'}</small></button>
		<button class="ph-tile" data-a="push" data-x="speed">${icon('speed', 24, 'var(--cyan)')}<b>Speedtest</b><small>${S.speed && S.speed.down ? Math.round(S.speed.down) + ' Mbit/s' : 'Jetzt messen'}</small></button>
		<button class="ph-tile" data-a="tab" data-x="fam">${icon('pause', 24, paused ? 'var(--bad)' : 'var(--ok)')}<b>Pausen</b><small>${paused ? paused + ' Gerät' + (paused > 1 ? 'e' : '') + ' pausiert' : 'Nichts pausiert'}</small></button>
	</div>`;
	const top = Net.devices.filter((d) => d.usageToday > 0).sort((a, b) => b.usageToday - a.usageToday).slice(0, 4);
	if (top.length) {
		body += `<div class="ph-card list"><div class="ph-h">HEUTE AM MEISTEN</div>` + top.map((d) => row(devIcon(d), devColor(d), d.name, (d.online ? (d.cudyName || 'Kabel') : 'offline'), `<span class="mono" style="font-size:13px">${fmtBytes(d.usageToday)}</span>`, 'dev', d.id)).join('') + '</div>';
	}
	const evs = allEvents().slice(0, 4);
	body += `<div class="ph-card list"><div class="ph-h">LETZTE EREIGNISSE</div>` + (evs.length ? evs.map(evRow).join('') : '<div class="ph-dim" style="padding:14px">Noch nichts passiert</div>') +
		`<button class="ph-row" data-a="push" data-x="log" style="min-height:48px;justify-content:center;color:var(--cyan)">Alle Ereignisse</button></div>`;
	body += `<div class="ph-dim">Stand ${fmtTime(Net.loadedAt)} · direkt vom Master</div>`;
	return { title: 'Phantom Network', sub: (Net.master.name || 'Master') + ' · ' + Net.master.host, body };
};

function allEvents() {
	return (Net.cudyEvents || []).concat(Net.events || [], Net.syslogEvents()).sort((a, b) => b.ts - a.ts);
}
function evRow(e) {
	const map = { newdev: [ 'bell', 'var(--cyan)' ], pause: [ 'pause', 'var(--bad)' ], limit: [ 'clock', 'var(--warn)' ], wlan: [ 'wifi', 'var(--violet)' ], cudy: [ 'router', 'var(--warn)' ],
		connect: [ 'wifi', 'var(--ok)' ], disconnect: [ 'wifi', 'var(--muted)' ], dhcp: [ 'link', 'var(--cyan)' ], roam: [ 'refresh', 'var(--violet)' ] };
	const [ ic, c ] = map[e.kind] || [ 'info', 'var(--muted)' ];
	return `<div class="ph-row" style="min-height:52px"><div class="ph-ico" style="background:transparent;border:1px solid ${c}">${icon(ic, 18, c)}</div><div class="ph-grow"><b style="white-space:normal;font-weight:500;font-size:13px">${esc(e.text)}</b><small>${fmtWhen(e.ts)}</small></div></div>`;
}

/* ---------- Geräte ---------- */
/* Alle Netze des Masters in fester Reihenfolge: Heimnetz, Smart Home, weitere, Gäste, Unbekannt.
   Das erste Netz jeder Rolle behält seine gewohnte Farbe, alle anderen bekommen die nächste freie aus der Reihe. */
const ROLE_HEX = { lan: '#22e3ff', sh: '#22e3a0', gast: '#f5b85b', '?': '#a59fbf' };
const NET_PALETTE = [ '#ff6b8a', '#7c9cff', '#ff9f43', '#e879f9', '#a855f7', '#4ade80', '#38bdf8' ];
function netOrder() {
	const keys = [];
	for (const i of Net.ifaces || []) {
		if (i.interface === 'loopback' || (i.route || []).some((r) => r.target === '0.0.0.0' && r.mask === 0)) continue;
		const k = netKeyOf(i.interface); if (!keys.includes(k)) keys.push(k);
	}
	for (const d of Net.devices) if (d.net && !keys.includes(d.net)) keys.push(d.net);
	const rank = { lan: 0, sh: 1, other: 2, gast: 3, '?': 4 };
	return keys.map((k, i) => [ k, i ]).sort((a, b) => (rank[netRole(a[0])] - rank[netRole(b[0])]) || (a[1] - b[1])).map((x) => x[0]);
}
function netHex(k) {
	const seen = {}; let p = 0;
	for (const x of netOrder()) {
		const r = netRole(x), c = r !== 'other' && !seen[r] ? (seen[r] = ROLE_HEX[r]) : NET_PALETTE[p++ % NET_PALETTE.length];
		if (x === k) return c;
	}
	return ROLE_HEX[netRole(k)] || NET_PALETTE[0];
}
/* WLAN-Name (SSID) je Netz – kommt automatisch vom Master */
function netSsid(k) {
	const w = Net.wlans().find((x) => {
		const n = String(x.network || '').toLowerCase();
		return netKeyOf(n) === k;
	});
	return w ? w : null;
}
function devFiltered() {
	const q = S.devSearch.toLowerCase();
	let list = Net.devices.filter((d) => !d.isCudy);
	if (q) list = list.filter((d) => (d.name + ' ' + d.ip + ' ' + d.mac).toLowerCase().includes(q));
	return list;
}
function devListHtml() {
	const f = S.devFilter, q = S.devSearch;
	const list = devFiltered();
	const on = list.filter((d) => d.online && (f === 'all' || d.net === f));
	const off = list.filter((d) => !d.online && (f === 'all' || d.net === f));
	const keys = netOrder();
	let h = '';
	for (const k of keys) {
		const ds = on.filter((d) => d.net === k);
		if (!ds.length) continue;
		const w = netSsid(k);
		h += `<section class="ph-devgroup"><div class="ph-devhead"><i style="background:${netHex(k)}"></i><b>${esc(w ? w.ssid : (netName(k)))}</b><small>${esc((w ? (netName(k)) + ' · ' : '') + ds.length + ' online')}</small></div>
			<div class="ph-card list">${devRows(ds)}</div></section>`;
	}
	if (!on.length && !off.length) h += '<div class="ph-card pad"><div class="ph-dim">Keine Geräte gefunden</div></div>';
	if (off.length) {
		const open = S.devOff || !!q;
		h += `<button class="ph-offbtn" data-a="devOff"><span>Offline · ${off.length} ${off.length === 1 ? 'Gerät' : 'Geräte'}</span><small>${open ? 'Ausblenden' : 'Anzeigen'}</small></button>`;
		if (open) h += `<div class="ph-card list ph-offlist">${devRows(off)}</div>`;
	}
	const cudys = Net.devices.filter((d) => d.isCudy).length;
	if (cudys && !q) h += `<div class="ph-dim" style="text-align:center">Die ${cudys} Router stehen unter „Netz“</div>`;
	return h;
}
VIEWS.dev = () => {
	const all = Net.devices.filter((d) => !d.isCudy);
	const tiles = netOrder().filter((k) => k !== '?').map((k) => {
		const w = netSsid(k);
		if (!w && !all.some((d) => d.net === k)) return '';
		const n = all.filter((d) => d.net === k && d.online).length;
		const sel = S.devFilter === k;
		return `<button class="ph-nettile${sel ? ' on' : ''}" style="--c:${netHex(k)}" data-a="devFilter" data-x="${k}"><b>${n}</b><span><i></i><em>${esc(w ? w.ssid : netName(k))}</em></span><small>${esc(netName(k))}${w && !w.on ? ' · aus' : ''}</small></button>`;
	}).filter(Boolean);
	let body = `<label class="ph-field ph-search">${icon('search', 18, 'var(--dim)')}<input type="search" data-in="devSearch" placeholder="Name, IP oder MAC" value="${attr(S.devSearch)}"></label>
		<div class="ph-nettiles${tiles.length > 3 ? ' scroll' : ''}">${tiles.join('')}</div>
		<div class="ph-devlist" data-list="dev">${devListHtml()}</div>`;
	return { title: 'Geräte', sub: all.filter((d) => d.online).length + ' online · ' + all.length + ' bekannt', body };
};
function devRows(list) {
	if (!list.length) return '<div class="ph-dim" style="padding:18px">Keine Geräte gefunden</div>';
	return list.map((d) => {
		const where = d.online ? (d.band === 'Kabel' ? 'Kabel' : String(d.cudyName || '').replace(/^Cudy-/i, '')) : 'offline';
		const sub = `<span class="mono">${esc(d.ip || '')}</span>${d.ip ? ' · ' : ''}${esc(where)}`;
		const c = d.paused ? 'var(--bad)' : !d.online ? 'var(--dim)' : netHex(d.net);
		let right = d.paused ? '<span class="ph-badge">Pause</span>' : '';
		if (!d.paused && d.prio) right += icon('star', 16, 'var(--warn)');
		if (!d.paused && d.online) right += d.wifi ? bars(d.pct, d.band) : '<span class="ph-lan">LAN</span>';
		return `<button class="ph-row" data-a="dev" data-x="${attr(d.id)}"><div class="ph-ico soft" style="--c:${c}">${icon(d.type, 20, c)}</div><div class="ph-grow"><b>${esc(d.name)}</b><small>${sub}</small></div>${right}</button>`;
	}).join('');
}

VIEWS.device = (v) => {
	const d = Net.devices.find((x) => x.id === v.id);
	if (!d) return { title: 'Gerät', body: '<div class="ph-dim">Gerät nicht mehr in der Liste</div>' };
	const prof = Net.profiles().find((p) => p.id === d.profile);
	const caps = Net.caps();
	let status = d.online ? 'Online' : 'Offline';
	if (d.pausedSelf) status = 'Pausiert' + (d.pauseUntil ? ' bis ' + fmtWhen(d.pauseUntil) : '');
	else if (d.pausedProfile) status = 'Pausiert über Profil ' + prof.name;
	else if (d.pausedLimit) status = 'Tageslimit erreicht';
	else if (d.pausedSched) status = 'Gesperrt durch Zeitplan';
	let body = `<div class="ph-card pad" style="align-items:center;text-align:center">
		<div class="ph-ico big" style="background:${devColor(d)}">${devIcon(d, 36)}</div>
		<b style="font-size:19px">${esc(d.name)}</b>
		<div class="ph-sub" style="white-space:normal">${esc(status)} · ${esc(netName(d.net))}${prof ? ' · ' + esc(prof.name) : ''}</div>
		<div class="ph-chips" style="justify-content:center">
			<button class="ph-chip" data-a="rename" data-x="${d.id}">${icon('edit', 16)} Umbenennen</button>
			${caps.helper ? `<button class="ph-chip" data-a="typeSheet" data-x="${d.id}">${icon(d.type, 16)} Typ</button>` : ''}
		</div></div>`;
	// Pause
	if (d.pausedSelf) {
		body += `<button class="ph-btn ok" data-a="unpause" data-x="${d.id}">${spinOr('pause', icon('play', 18) + '&nbsp; Internet wieder freigeben')}</button>`;
	} else {
		body += `<div class="ph-card pad"><div class="ph-h">INTERNET PAUSIEREN</div>
			<div class="ph-chips">${[ [ 30, '30 Min' ], [ 60, '1 Std' ], [ 120, '2 Std' ], [ 'night', 'Bis 7 Uhr' ], [ 0, 'Bis ich freigebe' ] ].map(([ x, l ]) => `<button class="ph-chip" data-a="pause" data-x="${d.id}|${x}">${l}</button>`).join('')}<button class="ph-chip ph-chip-own" data-a="pauseOwn" data-x="${d.id}">${icon('clock', 16)} Eigene Zeit …</button></div>
			${d.paused ? `<div class="ph-hint">${esc(status)} – das Profil bestimmt das gerade.</div>` : ''}
			${caps.conntrack || caps.helper ? '' : '<div class="ph-hint">Ohne Paket „conntrack“ wirkt die Pause erst bei neuen Verbindungen.</div>'}</div>`;
	}
	body += `<div class="ph-card rows">
		${swRow('Bevorzugen', 'Hat Vorrang, wenn die Leitung voll ist (mit SQM)', d.prio, 'prio', d.id)}
		${swRow('Feste IP-Adresse', d.ip ? 'Bekommt immer ' + d.ip : 'Erst wenn das Gerät eine Adresse hat', d.fixed, 'fixed', d.id)}
		<div class="ph-switchrow"><div class="ph-grow"><b>Profil</b><small>${prof ? esc(prof.name) : 'Keinem Familienmitglied zugeordnet'}</small></div><button class="ph-btn small" data-a="profSheet" data-x="${d.id}">Ändern</button></div>
	</div>`;
	const btns = [];
	if (d.wifi && d.online) btns.push(`<button class="ph-btn" data-a="kick" data-x="${d.id}">${icon('kick', 18)}&nbsp; Aus WLAN werfen</button>`);
	if (caps.wol && (!d.online || d.type === 'laptop' || d.type === 'server')) btns.push(`<button class="ph-btn cyan" data-a="wake" data-x="${d.id}">${icon('wake', 18)}&nbsp; Aufwecken (WoL)</button>`);
	// Verbrauch
	if (caps.helper && (caps.nlbw || Net.agentVer())) {
		const mac = d.mac.toLowerCase(), act = (Net.today.mmin || {})[mac] || 0;
		body += `<div class="ph-grid2"><div class="ph-card pad ph-kpi"><div class="ph-h">DATEN HEUTE</div><b class="mono">${fmtBytes(d.usageToday)}</b></div>
			<div class="ph-card pad ph-kpi"><div class="ph-h">AKTIV HEUTE</div><b class="mono">${fmtMin(act).trim()}</b><small>Minuten mit spürbarer Nutzung</small></div></div>`;
		body += usageCard('dev', mac);
	}
	// Details
	body += `<div class="ph-card rows"><div class="ph-h">DETAILS</div>
		${kv('IP-Adresse', '<span class="mono">' + esc(d.ip || '–') + '</span>')}
		${kv('MAC-Adresse', '<span class="mono">' + esc(d.mac) + '</span>')}
		${kv('Netz', esc(netName(d.net)))}
		${d.wifi ? kv('Verbunden mit', esc(d.cudyName || '') + (d.ssid ? ' · ' + esc(d.ssid) : '')) : ''}
		${d.wifi ? kv('Band', esc(d.band || '–')) : (d.online ? kv('Verbindung', 'Kabel / über Router') : '')}
		${d.signal != null ? kv('Signal', d.signal + ' dBm (' + d.pct + ' %)') : ''}
		${d.rx ? kv('Geschwindigkeit', '↓ ' + d.rx + ' / ↑ ' + (d.tx || '–') + ' Mbit/s') : ''}
		${d.connected ? kv('Verbunden seit', fmtDur(d.connected)) : ''}
		${d.wifiBytes ? kv('Daten seit Verbindung', '↓ ' + fmtBytes(d.wifiBytes.down) + ' · ↑ ' + fmtBytes(d.wifiBytes.up)) : ''}
	</div>`;
	// Aktionen ganz unten, mittig
	if (btns.length) body += `<div class="ph-btnrow">${btns.join('')}</div>`;
	return { title: d.name, sub: d.online ? 'Online' : 'Offline', body };
};
/* Verbrauch: Monat (Kennzahlen + letzte 10 Tage) oder letzte Monate – für ein Gerät (mac) oder alle (null) */
const WD_SHORT = [ 'So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa' ];
const gbNum = (b) => { const g = (Number(b) || 0) / 1073741824; return (g >= 100 ? String(Math.round(g)) : g.toFixed(g >= 1 ? 1 : 2)).replace('.', ','); };
const ymdOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function usageCard(key, mac) {
	const mode = S.useMode[key] || 'month';
	const today = Net.limitDay(), mon = today.slice(0, 7);
	const y = +today.slice(0, 4), m = +today.slice(5, 7) - 1, t = +today.slice(8, 10);
	const dIn = new Date(y, m + 1, 0).getDate();
	const seg = `<div class="ph-seg">${[ [ 'month', MONTH_DE[m] ], [ 'year', 'Letzte Monate' ] ].map(([ k, l ]) => `<button class="${mode === k ? 'on' : ''}" data-a="useMode" data-x="${key}|${k}">${l}</button>`).join('')}</div>`;
	const days = Net.monthDays(mac);                       // dieser Monat, heute zuletzt
	const total = days.reduce((a, x) => a + x.bytes, 0);
	const full = days.filter((x) => !x.today);
	const avg = full.length ? full.reduce((a, x) => a + x.bytes, 0) / full.length : (days.length ? days[days.length - 1].bytes : 0);
	const legend = (items) => `<div class="ph-ulegend">${items.join('')}</div>`;
	const avgLine = (bottom) => `<div class="ph-uavg" style="bottom:${bottom}px"></div>`;
	if (mode === 'year') {
		const ms = Net.monthsOf(mac);
		const cur = ms[ms.length - 1];
		const proj = cur.bytes + avg * (dIn - t);
		const past = ms.filter((x) => !x.now && x.bytes > 0);
		const pAvg = past.length ? past.reduce((a, x) => a + x.bytes, 0) / past.length : 0;
		const shown = ms.filter((x) => x.now || x.bytes > 0);
		const max = Math.max(1, pAvg, ...shown.map((x) => x.now ? Math.max(x.bytes, proj) : x.bytes));
		const H = 110;
		const bars = shown.map((x) => {
			const h = Math.max(4, Math.round(H * x.bytes / max)), ph = x.now ? Math.max(0, Math.round(H * (proj - x.bytes) / max)) : 0;
			return `<div class="ph-ubar"><b class="mono">${gbNum(x.bytes)}</b>${ph ? `<i class="proj" style="height:${ph}px"></i>` : ''}<i class="${x.now ? 'now' : ''}${ph ? ' joined' : ''}" style="height:${h}px"></i><small>${MON_DE[Number(x.month.slice(5, 7)) - 1]}</small></div>`;
		}).join('');
		return `<div class="ph-card pad ph-use">${seg}
			<div class="ph-uhero"><div><b class="mono">${pAvg ? fmtBytes(pAvg) : '–'}</b><span>Durchschnitt pro Monat</span></div><span class="ph-uchip">${past.length ? past.length + (past.length === 1 ? ' voller Monat' : ' volle Monate') : 'Noch kein voller Monat'}</span></div>
			<div class="ph-hrow"><span>Monate</span><small>Werte in GB</small></div>
			<div class="ph-uchart months">${bars}${pAvg ? avgLine(18 + Math.round(H * pAvg / max)) : ''}</div>
			${legend([ '<span><i class="avg"></i>Ø pro Monat</span>', `<span><i class="now"></i>${MONTH_DE[m]} bis heute</span>`, '<span><i class="proj"></i>Hochrechnung</span>' ])}
			<div class="ph-hint">Bis zu 12 Monate, gespeichert auf dem Master.</div></div>`;
	}
	// Kennzahlen für den ganzen Monat
	let peak = null;
	for (const x of days) if (!peak || x.bytes > peak.bytes) peak = x;
	const proj = total + avg * (dIn - t);
	const prevKey = m === 0 ? (y - 1) + '-12' : y + '-' + String(m).padStart(2, '0');
	const prev = (Net.week.months || []).find((x) => x.month === prevKey);
	const prevBytes = prev ? Net.sumMacs(prev.macs, mac) : 0;
	const prevAvg = prevBytes / new Date(y, m, 0).getDate();
	let chip = '<span class="ph-uchip">Vergleich ab nächstem Monat</span>';
	if (prevBytes > 0 && avg > 0) {
		const p = Math.round((avg / prevAvg - 1) * 100);
		chip = `<span class="ph-uchip ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)} % pro Tag ggü. ${MONTH_DE[(m + 11) % 12]}</span>`;
	}
	const dayName = (ds) => { const d = new Date(+ds.slice(0, 4), +ds.slice(5, 7) - 1, +ds.slice(8, 10)); return WD_SHORT[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.'; };
	// letzte 10 Tage (auch über den Monatswechsel)
	const byDay = {};
	for (const x of Net.week.days || []) byDay[x.day] = Net.sumMacs(x.macs, mac);
	byDay[today] = Net.sumMacs(Net.today.macs, mac);
	const list = [];
	for (let i = 9; i >= 0; i--) {
		const d = new Date(y, m, t - i), ds = ymdOf(d);
		list.push({ d, ds, v: ds in byDay ? byDay[ds] : null, today: i === 0 });
	}
	const H = 100, max = Math.max(1, avg, ...list.map((x) => x.v || 0));
	const peakDay = full.length > 1 && peak ? peak.day : '';
	const sel = list.find((x) => x.ds === S.useSel[key]) || list[list.length - 1];
	const bars = list.map((x) => {
		const has = x.v != null;
		const cls = !has ? 'none' : x.today ? 'now' : x.ds === peakDay ? 'peak' : '';
		const h = has ? Math.max(4, Math.round(H * x.v / max)) : 3;
		return `<button class="ph-ubar${x === sel ? ' sel' : ''}" data-a="useSel" data-x="${key}|${x.ds}"><b class="mono">${has ? gbNum(x.v) : '–'}</b><i class="${cls}" style="height:${h}px"></i><small>${WD_SHORT[x.d.getDay()]}</small><small>${x.d.getDate()}<span>.</span></small></button>`;
	}).join('');
	let det;
	if (sel.v == null) det = `<div class="ph-udetail"><span>${dayName(sel.ds)}</span><small>keine Daten – Messung lief da noch nicht</small></div>`;
	else {
		const p = avg ? Math.round((sel.v / avg - 1) * 100) : 0;
		det = `<div class="ph-udetail"><span>${dayName(sel.ds)}${sel.today ? ' · heute' : ''}</span><span><b class="mono">${fmtBytes(sel.v)}</b> <small>${sel.today ? 'bisher' : p >= 0 ? p + ' % über Ø' : Math.abs(p) + ' % unter Ø'}</small></span></div>`;
	}
	const firstDay = days.length ? +days[0].day.slice(8, 10) : 1;
	return `<div class="ph-card pad ph-use">${seg}
		<div class="ph-uhero"><div><b class="mono">${fmtBytes(total)}</b><span>${MONTH_DE[m]} bis heute</span></div>${chip}</div>
		<div class="ph-ustats">
			<div><small>Ø pro Tag</small><b class="mono">${fmtBytes(avg)}</b><em>${full.length} ${full.length === 1 ? 'voller Tag' : 'volle Tage'}</em></div>
			<div><small>Spitzentag</small><b class="mono">${peak ? fmtBytes(peak.bytes) : '–'}</b><em>${peak ? dayName(peak.day) : '–'}</em></div>
			<div><small>Hochrechnung</small><b class="mono">≈ ${fmtBytes(proj).replace(/,\d+ /, ' ')}</b><em>bis ${dIn}.${m + 1}.</em></div>
		</div>
		<div class="ph-hrow"><span>Letzte 10 Tage</span><small>Werte in GB</small></div>
		<div class="ph-uchart">${bars}${avg > 0 ? avgLine(34 + Math.round(H * avg / max)) : ''}</div>
		${det}
		${legend([ '<span><i class="avg"></i>Ø pro Tag</span>', '<span><i class="now"></i>heute</span>', '<span><i class="peak"></i>Spitzentag</span>', '<span><i></i>andere Tage</span>' ])}
		${firstDay > 1 && full.length + 1 === days.length && firstDay <= t ? `<div class="ph-hint">Gemessen wird seit ${firstDay}.${m + 1}. – davor gibt es keine Werte.</div>` : ''}</div>`;
}
/* größte Verbraucher im laufenden Monat */
function topUsersCard() {
	const by = Net.usageByMac(true);
	const names = {};
	for (const d of Net.devices) names[d.mac.toLowerCase()] = d;
	const list = Object.entries(by).filter(([ , b ]) => b > 0).sort((a, b) => b[1] - a[1]);
	const shown = S.inetAll ? list : list.slice(0, 5);
	const max = list.length ? list[0][1] : 1, tot = list.reduce((a, x) => a + x[1], 0);
	return `<div class="ph-card pad"><div class="ph-h">GRÖSSTE VERBRAUCHER IM ${MONTH_DE[Number(Net.limitDay().slice(5, 7)) - 1].toUpperCase()}</div>
		<div class="ph-ulist">${shown.map(([ mm, b ]) => { const d = names[mm]; return `<button class="ph-urow" ${d ? `data-a="dev" data-x="${d.id}"` : ''}><span>${esc(d ? d.name : mm.toUpperCase())}</span><b class="mono">${fmtBytes(b)} <small>${tot ? Math.round(100 * b / tot) : 0} %</small></b><i style="width:${Math.max(2, Math.round(100 * b / max))}%"></i></button>`; }).join('') || '<div class="ph-dim">Noch keine Daten</div>'}</div>
		${list.length > 5 ? `<button class="ph-btn small" data-a="inetAll" style="align-self:center;background:transparent;border:0;color:var(--cyan)">${S.inetAll ? 'Weniger zeigen' : 'Alle ' + list.length + ' Geräte zeigen'}</button>` : ''}
		<div class="ph-hint">Antippen öffnet das Gerät mit seinem eigenen Verlauf.</div></div>`;
}

function weekLabel(day) {
	if (!day || day === 'heute') return 'Heute';
	const p = String(day).split('-');
	const dt = new Date(+p[0], +p[1] - 1, +p[2]);
	if (isNaN(dt)) return day;
	if (dt.toDateString() === new Date().toDateString()) return 'Heute';
	return [ 'So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa' ][dt.getDay()];
}

/* ---------- Familie ---------- */
VIEWS.fam = () => {
	const ps = Net.profiles();
	const minutes = Net.today.minutes || {};
	let body = '';
	if (!ps.length) body += `<div class="ph-card pad" style="text-align:center"><b>Noch keine Profile</b><div class="ph-hint">Fasse die Geräte einer Person zusammen. Dann kannst du alle auf einmal pausieren, Schlafenszeiten festlegen und ein Tageslimit setzen.</div></div>`;
	for (const p of ps) {
		const devs = Net.devices.filter((d) => d.profile === p.id);
		const on = devs.filter((d) => d.online).length;
		const used = minutes[p.id] || 0;
		const paused = p.paused && p.macs.length > 0;
		const limitHit = Net.ruleOn('phantom_limit_' + p.id);
		const sched = Net.schedules(p.id).filter((s) => s.enabled && Net.schedActive(s, new Date()));
		const state = paused ? 'Pausiert' : limitHit ? 'Tageslimit erreicht' : sched.length ? sched[0].label + ' aktiv' : on + ' von ' + devs.length + ' Geräten online';
		body += `<div class="ph-card pad">
			<div style="display:flex;align-items:center;gap:12px">
				<button class="ph-ico" style="background:${p.color};border:0" data-a="profile" data-x="${p.id}">${esc((p.name || '?')[0].toUpperCase())}</button>
				<button style="flex:1;min-width:0;border:0;background:transparent;text-align:left;padding:0" data-a="profile" data-x="${p.id}"><b style="display:block;font-size:16px">${esc(p.name)}</b><small class="ph-sub" style="display:block">${esc(state)}</small></button>
				${sw(paused, 'ppause', p.id, 'Pause ' + p.name)}
			</div>
			${Net.caps().helper ? famUsage(p, used) : ''}
		</div>`;
	}
	body += `<button class="ph-btn dashed" data-a="newProfile">${icon('plus', 18)}&nbsp; Profil anlegen</button>`;
	const anyPaused = ps.some((p) => Net.ruleOn('phantom_ppause_' + p.id));
	if (ps.length > 1) body += `<button class="ph-btn ${anyPaused ? 'ok' : 'danger'}" data-a="pauseAll" data-x="${anyPaused ? '0' : '1'}">${spinOr('pauseAll', anyPaused ? 'Alle Pausen beenden' : 'Alle Profile pausieren')}</button>`;
	body += '<div class="ph-dim">Profile, Pausen und Zeitpläne liegen auf dem Master – jedes Handy mit der App sieht dasselbe.</div>';
	return { title: 'Familie', sub: ps.length + ' Profile', body };
};

/* Firmware-Status: aktuell / Update verfügbar */
function fwState(r) {
	if (!Net.fwList || !Net.fwList.v.length || !fwParse(Net.fwInstalled(r))) return null;
	const up = Net.fwUpdate(r);
	return { installed: Net.fwInstalled(r), latest: up || Net.fwInstalled(r), up };
}
const tag = (cls, txt) => `<span class="ph-tag ${cls}">${txt}</span>`;
function fwTag(r, short) {
	const f = fwState(r);
	if (!f) return '';
	return f.up ? tag('warn', short ? 'Update verfügbar' : 'Update ' + esc(f.up) + ' verfügbar') : tag('ok', 'aktuell');
}

/* Nutzungszeit eines Profils: heute genutzt, mit Limit noch übrig + Balken */
function famUsage(p, used) {
	const lim = Net.limitToday(p);
	const left = Math.max(0, lim - used);
	return `<div class="ph-usage"><span><b class="mono">${fmtMin(used).trim()}</b> heute</span><small>${lim ? (left ? 'noch ' + fmtMin(left).trim() : 'Limit erreicht') + ' · Limit ' + fmtMin(lim).trim() : 'kein Limit'}</small></div>
		${lim ? `<div class="ph-progress${used >= lim * 0.85 ? ' warn' : ''}"><i style="width:${Math.min(100, Math.round(100 * used / lim))}%"></i></div>` : ''}`;
}
/* Balkengrafik: [{ v, label, cls, val }] */
function barChart(list, dense) {
	const max = Math.max(1, ...list.map((x) => x.v));
	return `<div class="ph-chart${dense ? ' dense' : ''}">${list.map((x) => `<div>${x.val != null ? `<b>${x.val}</b>` : ''}<i class="${x.cls || ''}" style="height:${Math.max(3, Math.round(84 * x.v / max))}px"></i><small>${x.label || ''}</small></div>`).join('')}</div>`;
}
const WD_DE = [ 'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag' ];
const MON_DE = [ 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez' ];
const MONTH_DE = [ 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember' ];

VIEWS.profile = (v) => {
	const p = Net.profiles().find((x) => x.id === v.id);
	if (!p) return { title: 'Profil', body: '<div class="ph-dim">Profil gelöscht</div>' };
	const devs = Net.devices.filter((d) => d.profile === p.id);
	const used = (Net.today.minutes || {})[p.id] || 0;
	const paused = p.paused && p.macs.length > 0;
	let body = `<div class="ph-card pad" style="align-items:center;text-align:center">
		<div class="ph-ico big" style="background:${p.color};font-size:30px">${esc((p.name || '?')[0].toUpperCase())}</div>
		<b style="font-size:19px">${esc(p.name)}</b>
		<div class="ph-chips" style="justify-content:center"><button class="ph-chip" data-a="editProfile" data-x="${p.id}">${icon('edit', 16)} Bearbeiten</button></div></div>`;
	body += `<div class="ph-card rows">${swRow('Internet pausieren', 'Alle Geräte von ' + p.name + ' sofort offline', paused, 'ppause', p.id)}</div>`;
	// Limit
	const lims = [ [ 0, 'Aus' ], [ 60, '1 Std' ], [ 90, '1,5 Std' ], [ 120, '2 Std' ], [ 180, '3 Std' ], [ 240, '4 Std' ] ];
	if (!Net.caps().helper) body += `<div class="ph-card pad"><div class="ph-h">TAGESLIMIT</div><div class="ph-hint">Die Nutzungszeit zählt ein kleiner Zusatz auf dem Master – auch wenn dein Handy aus ist. Er steckt in der App und ist mit einem Tipp installiert.</div>
		<button class="ph-btn primary" data-a="agentInstall" style="margin-top:12px">${spinOr('agent', icon('plus', 18) + '&nbsp; Tageslimit einrichten')}</button></div>`;
	else {
		const day = Net.limitDay(), lim = Net.limitToday(p), bonus = Net.bonusToday(p), hit = Net.ruleOn('phantom_limit_' + p.id);
		const weOn = p.limitWe != null;
		if (hit) body += `<div class="ph-banner warn"><div class="ph-line">${icon('clock', 22, 'var(--warn)')}<div><b>Tageslimit erreicht</b><small>Die Geräte von ${esc(p.name)} sind bis Mitternacht offline.</small></div></div>
			<small>Heute ausnahmsweise mehr Zeit geben:</small>
			<div class="ph-grid3">${[ [ 15, '+15 Min' ], [ 30, '+30 Min' ], [ 60, '+1 Std' ] ].map(([ m, l ]) => `<button class="ph-btn small warn" data-a="bonus" data-x="${p.id}|${m}">${spinOr('bonus' + p.id + m, l)}</button>`).join('')}</div></div>`;
		const row = (title, a, val) => `<div class="ph-limrow"><span>${title}</span><div class="ph-chips">${lims.map(([ m, l ]) => chip(val === m, a, p.id + '|' + m, l)).join('')}</div></div>`;
		body += `<div class="ph-card pad"><div class="ph-hrow"><div class="ph-h">TAGESLIMIT</div><small>Heute · ${WD_DE[new Date(day + 'T12:00:00').getDay()]}</small></div>
			<div class="ph-big"><b class="mono">${fmtMin(used).trim()}</b><span>${lim ? 'von ' + fmtMin(lim).trim() : 'kein Limit – nur gezählt'}</span></div>
			<div class="ph-progress${hit || (lim && used >= lim * 0.85) ? ' warn' : ''}${lim ? '' : ' off'}"><i style="width:${lim ? Math.min(100, Math.round(100 * used / lim)) : 100}%"></i></div>
			${bonus ? `<div class="ph-bonus"><span>Heute +${fmtMin(bonus).trim()} Bonus</span><button data-a="bonusUndo" data-x="${p.id}">zurücknehmen</button></div>` : ''}
			<div class="ph-sep"></div>
			${swRow('Wochenende anders', 'Sa & So eigenes Limit', weOn, 'limitWeOn', p.id)}
			${weOn ? row('Mo – Fr', 'limit', p.limit) + row('Sa &amp; So', 'limitWe', p.limitWe) : row('Jeden Tag', 'limit', p.limit)}
			<div class="ph-hint">Gezählt wird jede Minute, in der ein Gerät spürbar Daten nutzt (kurzes Synchronisieren im Standby zählt nicht). Um Mitternacht geht es von vorn los.</div></div>`;
		const wk = Net.profileWeek(p.id);
		const avg = Math.round(wk.reduce((a, x) => a + x.min, 0) / wk.length);
		body += `<div class="ph-card pad"><div class="ph-hrow"><div class="ph-h">DIESE WOCHE</div><small>Ø ${fmtMin(avg).trim()} pro Tag</small></div>
			${barChart(wk.map((x) => { const l = Net.limitOn(p, x.day); return { v: x.min, val: x.min >= 60 ? (x.min / 60).toFixed(1).replace('.', ',') + 'h' : x.min + 'm', label: x.today ? 'Heute' : WD_DE[new Date(x.day + 'T12:00:00').getDay()].slice(0, 2), cls: l && x.min >= l ? 'hit' : x.today ? 'now' : '' }; }))}
			<div class="ph-legend"><span><i style="background:var(--violet)"></i>genutzt</span><span><i style="background:var(--warn)"></i>Limit erreicht</span></div></div>`;
	}
	// Zeitpläne
	const sch = Net.schedules(p.id);
	body += `<div class="ph-card list"><div class="ph-h">ZEITPLÄNE (KEIN INTERNET)</div>` +
		(sch.length ? sch.map((s) => `<div class="ph-row"><div class="ph-ico" style="background:transparent;border:1px solid var(--violet)">${icon('clock', 18, 'var(--violet)')}</div>
			<button class="ph-grow" style="border:0;background:transparent;text-align:left;padding:0" data-a="editSched" data-x="${s.id}"><b>${esc(s.label)}</b><small>${s.start}–${s.stop} · ${daysLabel(s.days)}</small></button>
			${sw(s.enabled, 'schedOn', s.id, s.label)}</div>`).join('') : '<div class="ph-dim" style="padding:14px">Keine Zeitpläne</div>') +
		`<button class="ph-row" data-a="editSched" data-x="new|${p.id}" style="min-height:48px;justify-content:center;color:var(--cyan)">${icon('plus', 18)} Zeitplan hinzufügen</button></div>`;
	// Geräte
	body += `<div class="ph-card list"><div class="ph-h">GERÄTE (${devs.length})</div>` + devRows(devs) +
		`<button class="ph-row" data-a="assignSheet" data-x="${p.id}" style="min-height:48px;justify-content:center;color:var(--cyan)">${icon('plus', 18)} Geräte zuordnen</button></div>`;
	body += `<button class="ph-btn danger" data-a="delProfile" data-x="${p.id}">${icon('trash', 18)}&nbsp; Profil löschen</button>`;
	return { title: p.name, sub: devs.length + ' Geräte', body };
};
function daysLabel(days) {
	const d = DAYS.filter((x) => days.includes(x));
	if (d.length === 7) return 'täglich';
	if (d.join() === 'Mon,Tue,Wed,Thu,Fri') return 'Mo–Fr';
	if (d.join() === 'Sat,Sun') return 'Sa+So';
	if (d.join() === 'Sun,Mon,Tue,Wed,Thu' || d.join() === 'Mon,Tue,Wed,Thu,Sun') return 'So–Do';
	return d.map((x) => DAY_DE[x]).join(', ');
}

/* ---------- Netz ---------- */
VIEWS.net = () => {
	const m = Net.master, mi = Net.info[m.id] || {};
	const aps = Net.others();
	const clientsOf = (r) => ((Net.info[r.id] || {}).wifi || []).filter((w) => !/mesh/i.test(w.mode || '')).reduce((a, w) => a + w.clients.length, 0);
	let body = `<div class="ph-card pad"><div class="ph-map">
		<button class="node ${Net.internet().up ? 'inet' : 'inet bad'}" data-a="push" data-x="inet">${icon('link', 18)} Internet ${Net.internet().up ? '' : '(offline)'}</button><div class="vline"></div>
		<button class="node master" data-a="cudy" data-x="${m.id}">${icon('router', 18)} ${esc(m.name)} · ${clientsOf(m)}</button>
		${aps.length ? '<div class="vline"></div><div class="hline"></div><div class="aps">' + aps.map((r) => {
			const i = Net.info[r.id];
			return `<button class="ap${i && i.ok ? '' : ' off'}" data-a="cudy" data-x="${r.id}">${icon('router', 20, i && i.ok ? 'var(--cyan)' : 'var(--bad)')}<span><b>${esc(r.name || r.host)}</b><small>${i && i.ok ? clientsOf(r) + (clientsOf(r) === 1 ? ' Gerät' : ' Geräte') : i && i.needLogin ? 'Passwort nötig' : 'offline'}</small></span></button>`;
		}).join('') + '</div>' : ''}
	</div></div>`;
	body += `<div class="ph-card rows"><div class="ph-h">WLAN-NETZE (AUF ALLEN ROUTERN)</div>` +
		Net.wlans().map((w) => swRow(w.ssid, (w.guest ? 'Gäste · ' : '') + netName(netKey(w.network)) + ' · ' + w.secs.length + ' Funkmodule', w.on, 'wlan', w.ssid)).join('') + '</div>';
	body += `<div class="ph-grid2">
		<button class="ph-tile" data-a="push" data-x="guest">${icon('qr', 24, 'var(--warn)')}<b>Gäste-WLAN</b><small>QR-Code &amp; Timer</small></button>
		<button class="ph-tile" data-a="push" data-x="night">${icon('moon', 24, 'var(--violet)')}<b>Nachtmodus</b><small>WLAN nachts aus</small></button>
		<button class="ph-tile" data-a="push" data-x="speed">${icon('speed', 24, 'var(--cyan)')}<b>Speedtest</b><small>Handy ↔ Internet</small></button>
		<button class="ph-tile" data-a="push" data-x="check">${icon('check', 24, 'var(--ok)')}<b>Netz-Check</b><small>Ping &amp; Traceroute</small></button>
		<button class="ph-tile" style="grid-column:1 / -1" data-a="push" data-x="chan">${icon('wifi', 24, 'var(--cyan)')}<b>WLAN-Kanäle</b><small>Wer funkt wo – Störungen finden und Kanäle verteilen</small></button>
	</div>`;
	if (mi.board && mi.board.release) body += `<div class="ph-dim">${esc(mi.board.release.description || '')}</div>`;
	return { title: 'Netz', sub: Net.routers.length + ' Router', body };
};
function netKey(n) { return netKeyOf(n); }

/* ================= Firewall (nur anzeigen – nichts schalten) ================= */
VIEWS.fw = () => {
	const fw = Net.fw || {}, sec = (t) => Net.sections(fw, t);
	const on = (r) => r.enabled !== '0';
	const zn = (z) => (z === '*' ? 'alle' : z || 'Router');
	const tab = S.fwTab || 'fwd';
	let body = `<div class="ph-seg" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[ [ 'fwd', 'Freigaben' ], [ 'rules', 'Regeln' ], [ 'zones', 'Zonen' ] ].map(([ x, l ]) => `<button class="${tab === x ? 'on' : ''}" data-a="fwTab" data-x="${x}">${l}</button>`).join('')}</div>`;
	if (tab === 'fwd') {
		const red = sec('redirect');
		const act = red.filter(on).length;
		if (act) body += `<div class="ph-banner warn"><div class="ph-line">${icon('info', 22, 'var(--warn)')}<div><b>${act} ${act === 1 ? 'Freigabe' : 'Freigaben'} ins Internet aktiv</b></div></div></div>`;
		body += red.length ? '<div class="ph-card list">' + red.map((r) => row(icon('link', 20, '#0d0b16'), on(r) ? 'var(--cyan)' : 'rgba(165,159,191,.35)', r.name || r['.name'],
			asList(r.proto || 'tcp udp').join('/').toUpperCase() + ' · ' + zn(r.src) + ':' + (r.src_dport || '–') + ' → ' + (r.dest_ip || 'Router') + ':' + (r.dest_port || r.src_dport || '–'),
			on(r) ? tag('ok', 'an') : tag('off', 'aus'))).join('') + '</div>' : '<div class="ph-card pad"><span class="ph-dim">Keine Portfreigaben eingerichtet.</span></div>';
	} else if (tab === 'rules') {
		const rules = sec('rule').filter((r) => !/_b$/.test(r['.name']) || !/^phantom_sched_/.test(r['.name']));
		const mine = (r) => /^(phantom_|block_)/.test(r['.name']);
		const prof = (id) => (Net.profiles().find((p) => p.id === id) || {}).name || id;
		const label = (r) => {
			const n = r['.name'];
			if (/^phantom_ppause_/.test(n)) return 'Pause ' + (r.phantom_name || n.slice(15));
			if (/^phantom_limit_/.test(n)) return 'Tageslimit ' + prof(n.slice(14));
			if (/^phantom_sched_/.test(n)) return 'Zeitplan ' + prof(r.phantom_profile) + ': ' + (r.phantom_label || 'Zeitplan');
			return r.name || n;
		};
		const verdict = (r) => (!on(r) ? tag('off', 'aus') : /ACCEPT/.test(r.target || '') ? tag('ok', 'erlauben') : /REJECT|DROP/.test(r.target || 'DROP') ? tag('bad', 'ablehnen') : tag('info', r.target === 'DSCP' ? 'bevorzugt' : esc(String(r.target).toLowerCase())));
		const sub = (r) => zn(r.src) + ' → ' + (r.dest ? zn(r.dest) : 'Router') + (r.proto && r.proto !== 'all' ? ' · ' + asList(r.proto).join('/').toUpperCase() : '') + (r.dest_port ? ' ' + r.dest_port : '') + (r.start_time ? ' · ' + String(r.start_time).slice(0, 5) + '–' + String(r.stop_time || '').slice(0, 5) : '');
		const list = (rs) => '<div class="ph-card rows">' + rs.map((r) => `<div class="ph-switchrow"><div class="ph-grow"><b>${esc(label(r))}</b><small>${esc(sub(r))}</small></div>${verdict(r)}</div>`).join('') + '</div>';
		const a = rules.filter(mine), b = rules.filter((r) => !mine(r));
		if (a.length) body += '<div class="ph-h" style="padding:0 4px">VON PHANTOM</div>' + list(a);
		if (b.length) body += '<div class="ph-h" style="padding:0 4px">EIGENE / OPENWRT</div>' + list(b);
		if (!rules.length) body += '<div class="ph-card pad"><span class="ph-dim">Keine Regeln.</span></div>';
		else body += '<div class="ph-dim">Pausen, Zeitpläne und Limits änderst du bei Geräten und Familie.</div>';
	} else {
		const fwd = sec('forwarding');
		const pol = (v) => tag(v === 'ACCEPT' ? 'ok' : v === 'REJECT' || v === 'DROP' ? 'bad' : 'off', v === 'ACCEPT' ? 'erlauben' : v === 'REJECT' || v === 'DROP' ? 'ablehnen' : '–');
		body += sec('zone').map((z) => {
			const to = fwd.filter((f) => f.src === z.name).map((f) => f.dest);
			return `<div class="ph-card rows"><div class="ph-h">${esc(String(z.name || '').toUpperCase())}${asList(z.network).length ? ' · <span class="ph-dim">' + esc(asList(z.network).join(', ')) + '</span>' : ''}</div>
				${kv('Eingang', pol(z.input))}${kv('Ausgang', pol(z.output))}${kv('Weiterleiten', pol(z.forward))}
				${to.length ? kv('Darf nach', esc(to.join(', '))) : ''}${z.masq === '1' ? kv('Maskierung', 'an') : ''}</div>`;
		}).join('') || '<div class="ph-card pad"><span class="ph-dim">Keine Zonen gefunden.</span></div>';
	}
	return { title: 'Firewall', sub: Net.master.name, body };
};

VIEWS.cudy = (v) => {
	const r = Net.byId(v.id);
	if (!r) return { title: 'Router', body: '' };
	const i = Net.info[r.id] || {};
	let body = '';
	if (!i.ok) {
		body += `<div class="ph-banner bad"><div class="ph-line">${icon('router', 22, 'var(--bad)')}<div><b>${i.needLogin ? 'Passwort nötig' : 'Nicht erreichbar'}</b><small>${esc(i.error || '')}</small></div></div>
			<button class="ph-btn small" data-a="pwSheet" data-x="${r.id}">Passwort eingeben</button></div>`;
	} else {
		const s = i.sys, b = i.board;
		const mem = s.memory ? Math.round(100 * (1 - (s.memory.available || s.memory.free) / s.memory.total)) : null;
		body += `<div class="ph-card rows"><div class="ph-h">SYSTEM</div>
			${kv('Modell', esc(b.model || r.model))}
			${kv('Firmware', esc((b.release && b.release.description) || ''))}
			${fwState(r) ? kv('Installierte Version', esc(fwState(r).installed)) + kv('Neueste Version', esc(fwState(r).latest)) + kv('Firmware-Status', fwTag(r)) : ''}
			${kv('Kernel', esc(b.kernel || ''))}
			${kv('Läuft seit', fmtDur(s.uptime))}
			${kv('Auslastung', s.load ? (s.load[0] / 65536).toFixed(2).replace('.', ',') : '–')}
			${mem != null ? kv('Arbeitsspeicher', '<span style="white-space:nowrap">' + mem + ' % · ' + fmtBytes(s.memory.total - (s.memory.available || s.memory.free)) + ' / ' + fmtBytes(s.memory.total) + '</span>') : ''}
			${i.temp != null ? kv('Temperatur', i.temp + ' °C') : ''}
			${kv('Adresse', '<span class="mono">' + esc(r.proto + '://' + r.host) + '</span>')}
			${kv('Rolle', r === Net.master ? 'Master (Router)' : 'Access Point')}
			${r === Net.master ? kv('Tageslimit', (i.caps || {}).helper ? (Net.agentOld() ? '<span style="color:var(--warn)">Zähler ' + esc(Net.agentVer()) + ' · Update da</span>' : '<span style="color:var(--ok)">Zähler ' + esc(Net.agentVer() || 'installiert') + '</span>') : '<span class="ph-dim">nicht eingerichtet</span>') : ''}
		</div>`;
		if ((i.ifaces || []).length) body += `<div class="ph-card rows"><div class="ph-h">NETZWERKE</div>${i.ifaces.map((f) => {
			const v4 = (f['ipv4-address'] || [])[0], v6 = (f['ipv6-address'] || [])[0];
			const val = !f.up ? '<span class="ph-dim">aus</span>' : v4 ? '<span class="mono">' + esc(v4.address) + '</span>' : v6 ? '<span class="mono">' + esc(v6.address) + '</span>' : 'aktiv (keine IP)';
			return (!v4 && v6 && f.up ? kvb : kv)(f.interface.replace(/_/g, ' '), val);   // lange IPv6 unter den Namen
		}).join('')}</div>`;
		if ((i.ports || []).length) body += `<div class="ph-card rows"><div class="ph-h">ANSCHLÜSSE</div>${i.ports.map((pt) => {
			const m = String(pt.speed).match(/^(\d+)([FH])?/);
			const sp = m ? (m[1] >= 1000 ? (m[1] / 1000).toString().replace('.', ',') + ' Gbit/s' : m[1] + ' Mbit/s') + (m[2] === 'H' ? ' (halb)' : '') : 'verbunden';
			return kv(pt.name.toUpperCase().replace(/^LAN(\d)/, 'LAN $1'), pt.up ? '<span class="ph-port on"></span>' + sp : '<span class="ph-port"></span><span class="ph-dim">nicht verbunden</span>');
		}).join('')}</div>`;
		for (const w of i.wifi) {
			const cl = Net.devices.filter((d) => d.cudy === r.id && d.ifname === w.ifname);
			body += `<div class="ph-card list"><div class="ph-h">${esc(w.ssid || w.ifname)} · ${esc(w.band)}${w.channel ? ' · Kanal ' + w.channel : ''}</div>` +
				(/mesh/i.test(w.mode || '') ? '<div class="ph-dim" style="padding:12px">Mesh-Verbindung</div>' : (cl.length ? devRows(cl) : '<div class="ph-dim" style="padding:12px">Keine Geräte</div>')) + '</div>';
		}
	}
	if (i.ok && r === Net.master) {
		const has = (i.caps || {}).helper;
		if (!has) body += `<button class="ph-btn" data-a="agentInstall">${spinOr('agent', icon('plus', 18) + '&nbsp; Tageslimit-Zähler installieren')}</button>`;
		else if (Net.agentOld()) body += `<button class="ph-btn" data-a="agentInstall">${spinOr('agent', icon('refresh', 18) + '&nbsp; Tageslimit-Zähler aktualisieren (' + Net.AGENT_VER + ')')}</button>`;
	}
	if (i.ok) body += `<button class="ph-btn cyan" data-a="backup" data-x="${r.id}">${spinOr('backup' + r.id, icon('share', 18) + '&nbsp; Backup aufs Handy speichern')}</button>`;
	body += `<button class="ph-btn danger" data-a="reboot" data-x="${r.id}">${icon('power', 18)}&nbsp; ${esc(r.name || 'Router')} neu starten</button>`;
	if (i.ok && r === Net.master && (i.caps || {}).helper && Net.agentVer()) body += `<button class="ph-btn small" data-a="agentRemove" style="align-self:center;background:transparent;border:0;color:var(--muted)">${spinOr('agent', 'Tageslimit-Zähler entfernen')}</button>`;
	return { title: r.name || r.host, sub: r === Net.master ? 'Master' : 'Access Point', body };
};

/* ---------- Internet ---------- */
VIEWS.inet = () => {
	const n = Net.internet(), w = n.raw || {}, w6 = Net.internet6(), ws = Net.wanStats, wd = Net.wanDev || {}, rate = Net.wanRate;
	const PROTO = { dhcp: 'DHCP (automatisch)', static: 'Feste IP', pppoe: 'PPPoE (Einwahl)', dhcpv6: 'DHCPv6', '6in4': '6in4-Tunnel', wireguard: 'WireGuard' };
	const mono = (x) => '<span class="mono">' + esc(x) + '</span>';
	const v4 = (w['ipv4-address'] || [])[0];
	const gw = ((w.route || []).find((r) => r.target === '0.0.0.0' && r.mask === 0) || {}).nexthop;
	const dns = [ ...(w['dns-server'] || []), ...((w6 && w6['dns-server']) || []) ];
	const v6 = w6 ? (w6['ipv6-address'] || []).map((a) => a.address + '/' + a.mask) : [];
	const pfx = w6 ? (w6['ipv6-prefix'] || []).map((a) => a.address + '/' + a.mask) : [];
	const lease = (w.data || {}).leasetime;
	const speed = String(wd.speed || '').match(/^(\d+)([FH])?/);
	let body = `<div class="ph-banner ${n.up ? 'ok' : 'bad'}"><div class="ph-line">${icon(n.up ? 'shield' : 'power', 22, n.up ? 'var(--ok)' : 'var(--bad)')}<div><b>${n.up ? 'Internet verbunden' : 'Kein Internet'}</b><small>${n.up ? 'Seit ' + fmtDur(n.uptime) : 'Der Master hat keine Verbindung nach draußen'}</small></div></div></div>`;
	if (n.up) {
		if (rate) body += `<div class="ph-card rows"><div class="ph-h">GERADE JETZT</div>
			${kv('Download', fmtBits(rate.rx))}
			${kv('Upload', fmtBits(rate.tx))}
			<div class="ph-dim" style="text-align:left;padding-top:6px">Durchschnitt der letzten ~20 Sekunden, alle Geräte zusammen.</div>
		</div>`;
		body += `<div class="ph-card rows"><div class="ph-h">VERBINDUNG</div>
			${kv('Anschluss', esc(n.iface) + (n.dev && n.dev !== n.iface ? ' <span class="ph-dim">(' + esc(n.dev) + ')</span>' : ''))}
			${kv('Art', esc(PROTO[w.proto] || w.proto || '–'))}
			${speed ? kv('Kabel-Verbindung', (speed[1] >= 1000 ? speed[1] / 1000 + ' Gbit/s' : speed[1] + ' Mbit/s') + (speed[2] === 'H' ? ' Halbduplex' : '')) : ''}
			${wd.macaddr ? kv('MAC-Adresse', mono(wd.macaddr.toUpperCase())) : ''}
			${v4 ? kv('IPv4-Adresse', mono(v4.address + '/' + v4.mask)) : ''}
			${gw ? kv('Gateway', mono(gw)) : ''}
			${lease ? kv('DHCP-Lease', fmtDur(lease)) : ''}
			${dns.length ? kvb('DNS-Server', dns.map(mono).join('<br>')) : ''}
			${v6.length ? kvb('IPv6-Adresse', v6.map(mono).join('<br>')) : ''}
			${pfx.length ? kvb('IPv6-Präfix (fürs Heimnetz)', pfx.map(mono).join('<br>')) : ''}
		</div>`;
		if (Net.agentVer()) {
			body += `<div class="ph-hrow" style="padding:4px 4px 0"><div class="ph-h">DATENVERBRAUCH · ALLE GERÄTE</div></div>`;
			body += usageCard('all', null);
			body += topUsersCard();
		}
		if (ws) {
			const err = (ws.rx_errors || 0) + (ws.tx_errors || 0), drop = (ws.rx_dropped || 0) + (ws.tx_dropped || 0);
			body += `<div class="ph-card rows"><div class="ph-h">DATENVERKEHR SEIT NEUSTART</div>
			${kv('Empfangen', fmtBytes(ws.rx_bytes))}
			${kv('Gesendet', fmtBytes(ws.tx_bytes))}
			${kv('Gesamt', fmtBytes((ws.rx_bytes || 0) + (ws.tx_bytes || 0)))}
			${kv('Pakete', ((ws.rx_packets || 0) + (ws.tx_packets || 0)).toLocaleString('de-DE'))}
			${kv('Fehler / verworfen', err.toLocaleString('de-DE') + ' / ' + drop.toLocaleString('de-DE'))}
		</div>`;
		}
	}
	if (n.up) {
		// Router davor (UPnP) und Ping – im Hintergrund holen, dann neu zeichnen
		const gwAddr = gw || '';
		if (!S.inetBusy && ((Plat.Phantom && (!Net.gwInfo || Date.now() - Net.gwInfo.at > 30000)) || !Net.pingInfo || Date.now() - Net.pingInfo.at > 60000)) {
			S.inetBusy = true;
			Promise.all([ Plat.Phantom ? Net.gatewayInfo() : null, Net.inetCheck(S.check.host || 'google.de') ]).finally(() => { S.inetBusy = false; renderSoft(); });
		}
		const g = Net.gwInfo, pi = Net.pingInfo;
		const mbit = (b) => (Number(b) >= 1e9 ? (Number(b) / 1e9).toFixed(1).replace('.', ',') + ' Gbit/s' : Math.round(Number(b) / 1e6) + ' Mbit/s');
		const ACC = { DSL: 'DSL', Ethernet: 'Ethernet (Kabel/Glasfaser/Modem)', POTS: 'Telefon', Cable: 'Kabel', Fiber: 'Glasfaser' };
		body += `<div class="ph-card rows"><div class="ph-h">ROUTER DAVOR${gwAddr ? ' · ' + esc(gwAddr) : ''}</div>`;
		if (!Plat.Phantom) body += '<div class="ph-dim" style="text-align:left;padding:8px 0">Nur in der Android-App abrufbar.</div>';
		else if (!g) body += '<div class="ph-dim" style="text-align:left;padding:8px 0">Wird abgefragt …</div>';
		else if (!g.ok) body += `<div class="ph-dim" style="text-align:left;padding:8px 0;line-height:1.5">Keine Antwort per UPnP. Im Router davor die Statusübertragung per UPnP einschalten (Fritzbox: Heimnetz → Netzwerk → Netzwerkeinstellungen → „Statusinformationen über UPnP übertragen“). Unterwegs geht es nur über VPN.</div>`;
		else {
			body += (g.NewExternalIPAddress ? kv('Öffentliche IPv4', '<span class="mono">' + esc(g.NewExternalIPAddress) + '</span>') : '') +
				(g.NewWANAccessType ? kv('Anschlussart', esc(ACC[g.NewWANAccessType] || g.NewWANAccessType)) : '') +
				(g.NewLayer1DownstreamMaxBitRate ? kv('Leitung', '↓ ' + mbit(g.NewLayer1DownstreamMaxBitRate) + ' · ↑ ' + mbit(g.NewLayer1UpstreamMaxBitRate)) : '') +
				(g.NewPhysicalLinkStatus ? kv('Leitungsstatus', g.NewPhysicalLinkStatus === 'Up' ? 'verbunden' : esc(g.NewPhysicalLinkStatus)) : '') +
				(g.NewUptime ? kv('Beim Anbieter verbunden seit', fmtDur(Number(g.NewUptime))) : '') +
				(g.NewByteReceiveRate != null ? kv('Ganze Leitung gerade', '↓ ' + fmtBits(Number(g.NewByteReceiveRate) * 8) + ' · ↑ ' + fmtBits(Number(g.NewByteSendRate) * 8)) : '');
		}
		body += '</div>';
		body += `<div class="ph-card rows"><div class="ph-h">VERBINDUNGSTEST</div>
			${!pi ? '<div class="ph-dim" style="text-align:left;padding:8px 0">Läuft …</div>' : pi.error ? kv('Ping', '<span class="ph-dim">nicht möglich</span>') :
				kv('Ping (' + esc(pi.host) + ')', pi.ms != null ? pi.ms + ' ms' + (pi.loss ? ' · ' + pi.loss + ' % Verlust' : '') : '<span style="color:var(--bad)">keine Antwort</span>') +
				kv('Namensauflösung (DNS)', pi.dns ? '<span style="color:var(--ok)">funktioniert</span>' : '<span style="color:var(--bad)">gestört</span>')}
		</div>`;
	}
	body += `<div class="ph-grid2">
		<button class="ph-tile" data-a="push" data-x="speed">${icon('speed', 24, 'var(--cyan)')}<b>Speedtest</b><small>Handy ↔ Internet</small></button>
		<button class="ph-tile" data-a="push" data-x="check">${icon('check', 24, 'var(--ok)')}<b>Netz-Check</b><small>Ping &amp; Traceroute</small></button>
	</div>`;
	return { title: 'Internet', sub: n.up ? 'Verbunden' : 'Getrennt', body };
};

/* ---------- WLAN-Kanäle ---------- */
const CH24 = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 ];
function chanScan(force) {
	if (S.chanBusy) return;
	if (!force && Net.chan && Date.now() - Net.chan.at < 120000) return;
	S.chanBusy = true; renderSoft();
	Net.scanChannels(() => renderSoft()).catch((e) => toast('Scan nicht möglich: ' + e.message, true)).finally(() => { S.chanBusy = false; renderSoft(); });
}
/* 2,4 GHz automatisch auf 1/6/11 verteilen: je Router der Kanal mit den wenigsten (starken) Nachbarn,
   eigene Router auf demselben Kanal zählen viel – Funkmodule mit Mesh bleiben, wie sie sind */
function chanPlan() {
	const rs = ((Net.chan || {}).radios || []).filter((x) => x.band === '24' && x.up);
	const fixed = rs.filter((x) => x.mesh);
	const used = {}; fixed.forEach((x) => { used[x.channel] = (used[x.channel] || 0) + 1; });
	const plan = [];
	for (const x of rs.filter((y) => !y.mesh).sort((a, b) => b.seen.length - a.seen.length)) {
		let best = null, score = Infinity;
		for (const c of [ 1, 6, 11 ]) {
			const nb = x.seen.filter((n) => Math.abs(n.channel - c) < 5).reduce((a, n) => a + (n.signal > -70 ? 2 : 1), 0);
			const s = nb + 10 * (used[c] || 0);
			if (s < score) { score = s; best = c; }
		}
		used[best] = (used[best] || 0) + 1;
		plan.push({ x, to: best });
	}
	return plan;
}
VIEWS.chan = () => {
	// letzter Scan sofort zeigen (auch nach Neustart der App), frischer Scan läuft im Hintergrund
	if (!Net.chan && !S.chanCacheTried) { S.chanCacheTried = true; Net.loadChanCache().then(() => { if (Net.chan) renderSoft(); }); }
	chanScan(false);
	const band = S.chanBand || '24', B24 = band === '24';
	const all = ((Net.chan || {}).radios || []).filter((x) => x.band === band && x.up);
	let body = `<div class="ph-seg">${[ [ '24', '2,4 GHz' ], [ '5', '5 GHz' ] ].map(([ k, l ]) => `<button class="${band === k ? 'on' : ''}" data-a="chanBand" data-x="${k}">${l}</button>`).join('')}</div>`;
	if (!Net.chan) return { title: 'WLAN-Kanäle', sub: 'Scanne …', body: body + '<div class="ph-card pad"><div class="ph-dim"><div class="ph-spin"></div>&nbsp; Die Router suchen nach WLANs in der Umgebung – das dauert ein paar Sekunden.</div></div>' };
	// gleicher Kanal bei mehreren eigenen Routern (2,4 GHz)
	const same = (x) => all.filter((y) => y !== x && y.channel === x.channel);
	const clash = B24 ? all.filter((x) => same(x).length) : [];
	if (clash.length) {
		const c = clash[0].channel, n = all.filter((x) => x.channel === c).length;
		body += `<div class="ph-banner warn"><div class="ph-line">${icon('info', 22, 'var(--warn)')}<div style="flex:1"><b>${n === all.length ? 'Alle ' + n + ' Router funken' : n + ' Router funken'} auf Kanal ${c}</b><small>Sie stören sich gegenseitig – besonders für 2,4-GHz-Geräte. Besser: auf 1, 6 und 11 verteilen.</small></div></div></div>`;
	}
	// Belegung
	const chans = B24 ? CH24 : [ ...new Set([ ...all.map((x) => x.channel), ...all.flatMap((x) => x.seen.map((n) => n.channel)) ].filter((c) => c >= 32)) ].sort((a, b) => a - b);
	const nbOn = {}; const seenB = new Map();
	all.forEach((x) => x.seen.forEach((n) => { const o = seenB.get(n.bssid); if (!o || n.signal > o.signal) seenB.set(n.bssid, { ...n, by: x.r.name }); }));
	for (const n of seenB.values()) nbOn[n.channel] = (nbOn[n.channel] || 0) + 1;
	const ownOn = {}; all.forEach((x) => { ownOn[x.channel] = (ownOn[x.channel] || 0) + 1; });
	const max = Math.max(1, ...chans.map((c) => (nbOn[c] || 0) + (ownOn[c] || 0)));
	body += `<div class="ph-card pad"><div style="display:flex;justify-content:space-between;align-items:baseline"><div class="ph-h">BELEGUNG</div><small class="ph-dim">${B24 ? 'nur 1, 6, 11 überlappen nicht' : 'Kanäle mit Funkverkehr'}</small></div>
		<div class="ph-chanchart">${chans.map((c) => { const o = ownOn[c] || 0, t = o + (nbOn[c] || 0), own = t ? Math.round(100 * o / t) : 0;
			return `<div><b>${o || ''}</b><i style="height:${Math.max(3, Math.round(80 * t / max))}px;--own:${own}%"></i><small>${c}</small></div>`; }).join('')}</div>
		<div class="ph-legend"><span><i style="background:rgba(165,159,191,.45)"></i>Nachbar-WLANs</span><span><i style="background:var(--violet)"></i>deine Router</span></div></div>`;
	// Router
	body += `<div class="ph-devgroup"><div class="ph-devhead"><b>DEINE ROUTER</b></div><div class="ph-card list">${all.map((x) => {
		const nb = x.seen.filter((n) => n.channel === x.channel).length, sm = same(x).length;
		const sub = x.mesh ? 'Mesh – Kanal muss auf allen Mesh-Routern gleich sein' : sm && B24 ? 'Gleicher Kanal wie ' + sm + ' Router' : nb >= 3 ? nb + ' Nachbar-WLANs auf diesem Kanal' : 'Kanal frei';
		const col = x.mesh ? 'var(--muted)' : sm && B24 ? 'var(--warn)' : nb >= 3 ? 'var(--soft)' : 'var(--ok)';
		return `<button class="ph-row" data-a="chanEdit" data-x="${attr(x.r.id + '|' + x.radio)}"><div class="ph-ico soft" style="--c:var(--cyan)">${icon('router', 20, 'var(--cyan)')}</div><div class="ph-grow"><b>${esc(x.r.name || x.r.host)}</b><small style="color:${col}">${esc(sub)}</small></div><div class="ph-chanval"><b class="mono">${x.channel || '–'}</b><small>${esc((x.cfgChannel === 'auto' ? 'Auto · ' : '') + (x.width ? x.width + ' MHz' : ''))}</small></div></button>`;
	}).join('') || '<div class="ph-dim" style="padding:14px">Keine Funkmodule auf diesem Band</div>'}</div></div>`;
	if (B24 && chanPlan().some((p) => p.to !== p.x.channel)) body += `<button class="ph-btn primary" data-a="chanAuto">Kanäle automatisch verteilen</button>
		<div class="ph-dim">Verteilt 2,4 GHz auf 1, 6 und 11 – mit den wenigsten Nachbarn zuerst. Mesh-Funk bleibt unverändert. Du bestätigst vorher.</div>`;
	// Nachbarn
	const top = [ ...seenB.values() ].sort((a, b) => b.signal - a.signal).slice(0, 8);
	if (top.length) body += `<div class="ph-devgroup"><div class="ph-devhead"><b>STÄRKSTE NACHBARN</b></div><div class="ph-card list">${top.map((n) =>
		`<div class="ph-row" style="min-height:52px"><div class="ph-grow"><b style="font-weight:500;font-size:13px">${esc(n.ssid)}</b><small>gesehen von ${esc(n.by)}</small></div><small class="mono" style="color:var(--soft)">Kanal ${n.channel}</small><small style="width:62px;text-align:right">${n.signal} dBm</small></div>`).join('')}</div></div>`;
	body += `<button class="ph-btn" data-a="chanRescan">${S.chanBusy ? '<div class="ph-spin"></div>' : icon('refresh', 18) + '&nbsp; Neu scannen'}</button>`;
	const ago = Math.round((Date.now() - Net.chan.at) / 1000);
	return { title: 'WLAN-Kanäle', sub: (S.chanBusy ? 'Scanne … · ' : 'Gescannt vor ' + (ago < 60 ? ago + ' Sek.' : Math.round(ago / 60) + ' Min.') + ' · ') + Net.routers.length + ' Router', body };
};

/* ---------- Backups ---------- */
VIEWS.backup = () => {
	if (S.bkFolder === undefined) { S.bkFolder = null; Plat.backupFolder().then((f) => { S.bkFolder = f; renderSoft(); }); }
	let body = `<div class="ph-card rows"><div class="ph-h">SPEICHERORT</div>
		${kv('Ordner', esc(S.bkFolder || 'Download (Standard)'))}
		<div class="ph-grid2" style="margin-top:8px"><button class="ph-btn small" data-a="bkPick">${icon('edit', 16)}&nbsp; Ordner wählen</button>${S.bkFolder ? '<button class="ph-btn small" data-a="bkReset">Zurück auf Download</button>' : ''}</div>
		<div class="ph-hint">Du kannst jeden Ordner auswählen, auch auf einer Speicherkarte oder in einer Cloud-App mit Ordnerzugriff (z. B. Google Drive).</div></div>`;
	body += `<div class="ph-card list"><div class="ph-h" style="padding:12px 16px 0">ROUTER</div>${Net.routers.map((r) => {
		const ok = (Net.info[r.id] || {}).ok;
		return row(icon('router', 20, '#0d0b16'), ok ? 'var(--ok)' : 'var(--muted)', r.name || r.host, ok ? 'Tippen = Backup speichern' : 'nicht erreichbar',
			ok ? spinOr('backup' + r.id, icon('share', 18, 'var(--cyan)')) : '', ok ? 'backup' : '', r.id);
	}).join('')}</div>
		<button class="ph-btn primary" data-a="backupAll">${spinOr('backupAll', icon('share', 18) + '&nbsp; Backup aller Router')}</button>
		<div class="ph-dim">Das Backup enthält die Einstellungen des Routers – genau wie „Sicherung herunterladen“ in der Weboberfläche. Wiederherstellen geht dort unter System → Backup.</div>`;
	return { title: 'Backups', body };
};

/* ---------- Gäste-WLAN ---------- */
VIEWS.guest = () => {
	const g = Net.wlans().find((w) => w.guest);
	if (!g) return { title: 'Gäste-WLAN', body: '<div class="ph-card pad"><b>Kein Gäste-WLAN gefunden</b><div class="ph-hint">Lege in der Weboberfläche ein WLAN im Netz „Gast_Wlan“ an. Die App erkennt es dann automatisch.</div></div>' };
	const offAt = Net.guestOffAt();
	const qrTxt = wifiQr(g.ssid, g.key, g.enc);
	let body = `<div class="ph-card rows">${swRow(g.ssid, g.on ? (offAt ? 'An bis ' + fmtWhen(offAt) : 'An, ohne Zeitlimit') : 'Aus', g.on, 'wlan', g.ssid)}</div>`;
	if (g.on) {
		body += `<div class="ph-qr">${qrSvg(qrTxt)}<b>${esc(g.ssid)}</b><small>Mit der Handy-Kamera scannen</small>${g.key ? `<small class="mono">Passwort: ${esc(g.key)}</small>` : ''}</div>
			<button class="ph-btn cyan" data-a="shareGuest">${icon('share', 18)}&nbsp; Zugangsdaten teilen</button>`;
	}
	body += `<div class="ph-card pad"><div class="ph-h">${g.on ? 'AUTOMATISCH AUSSCHALTEN' : 'EINSCHALTEN FÜR'}</div>
		<div class="ph-chips">${[ [ 60, '1 Std' ], [ 180, '3 Std' ], [ 'midnight', 'Bis Mitternacht' ], [ 1440, '24 Std' ], [ 0, 'Ohne Limit' ] ].map(([ x, l ]) => `<button class="ph-chip" data-a="guestFor" data-x="${x}">${l}</button>`).join('')}</div>
		<div class="ph-hint">Der Timer läuft auf den Router selbst – auch wenn dein Handy aus ist.</div></div>`;
	return { title: 'Gäste-WLAN', sub: g.on ? 'Eingeschaltet' : 'Ausgeschaltet', body };
};
function wifiQr(ssid, key, enc) {
	const e = (s) => String(s).replace(/([\\;,:"])/g, '\\$1');
	const t = /sae|psk/.test(enc || '') ? 'WPA' : enc === 'none' ? 'nopass' : 'WPA';
	return 'WIFI:T:' + t + ';S:' + e(ssid) + ';' + (key && t !== 'nopass' ? 'P:' + e(key) + ';' : '') + ';';
}
function qrSvg(text) {
	try {
		qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
		const q = qrcode(0, text.length > 300 ? 'L' : 'M');
		q.addData(text); q.make();
		return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
	} catch (e) { return '<div class="ph-error">QR-Code zu groß</div>'; }
}

/* ---------- Nachtmodus ---------- */
VIEWS.night = () => {
	const n = Net.night();
	const on = n.on;
	const body = `<div class="ph-card rows">${swRow('WLAN „' + mainSsid() + '“ nachts aus', on ? 'Aus von ' + (n.start || '00:00') + ' bis ' + (n.stop || '06:00') : 'Aus', on, 'night', '')}</div>
		<div class="ph-card pad"><div class="ph-h">ZEITEN</div>
			<div class="ph-grid2"><label class="ph-field">Aus ab<input type="time" id="nStart" value="${attr(n.start || '00:00')}"></label><label class="ph-field">An ab<input type="time" id="nStop" value="${attr(n.stop || '06:00')}"></label></div>
			<button class="ph-btn primary" data-a="nightSave">${spinOr('night', 'Speichern &amp; einschalten')}</button>
			<div class="ph-hint">Schaltet nur das Haupt-WLAN. Smart Home und Kabel laufen weiter. Die Router schalten selbst um, die App muss nicht laufen.</div></div>`;
	return { title: 'Nachtmodus', body };
};
function mainSsid() { const w = Net.wlans().find((x) => netKeyOf(x.network) === 'lan'); return w ? w.ssid : netName('lan'); }

/* ---------- Speedtest (Handy ↔ Internet, über Cloudflare) ---------- */
VIEWS.speed = () => {
	const s = S.speed || {};
	const val = s.phase === 'down' || s.phase === 'up' ? s.now : s.down;
	const pct = Math.min(100, (val || 0) / 10);
	const body = `<div class="ph-card pad" style="align-items:center">
		<div class="ph-gauge" style="background:conic-gradient(var(--cyan) 0 ${pct * 0.75}%, rgba(168,85,247,.18) ${pct * 0.75}% 75%, transparent 75%);transform:rotate(-135deg)">
			<div style="transform:rotate(135deg);width:150px;height:150px;border-radius:50%;background:var(--card);justify-content:center"><b>${val ? Math.round(val) : '–'}</b><small>Mbit/s ${s.phase === 'up' ? '↑' : '↓'}</small></div></div>
		<div class="ph-stats" style="width:100%;text-align:center">
			<div class="ph-stat"><b>${s.ping != null ? Math.round(s.ping) : '–'}</b><span>Ping ms</span></div>
			<div class="ph-stat"><b>${s.down ? Math.round(s.down) : '–'}</b><span>↓ Mbit/s</span></div>
			<div class="ph-stat"><b>${s.up ? Math.round(s.up) : '–'}</b><span>↑ Mbit/s</span></div>
		</div>
		${s.err ? `<div class="ph-error">${esc(s.err)}</div>` : ''}
		<button class="ph-btn primary" style="width:100%" data-a="speedRun" ${s.phase && s.phase !== 'done' ? 'disabled' : ''}>${s.phase && s.phase !== 'done' ? '<div class="ph-spin"></div>&nbsp; ' + ({ ping: 'Ping …', down: 'Download …', up: 'Upload …' }[s.phase]) : (s.down ? 'Nochmal messen' : 'Test starten')}</button>
		<div class="ph-hint">Misst die Strecke von diesem Handy über WLAN und Master ins Internet (Server: Cloudflare). Für den reinen Anschluss am besten nah am Router messen.</div>
	</div>`;
	return { title: 'Speedtest', body };
};
async function speedRun() {
	const base = 'https://speed.cloudflare.com/';
	const F = Plat.webFetch;
	S.speed = { phase: 'ping' }; renderSoft();
	try {
		const pings = [];
		for (let i = 0; i < 6; i++) {
			const t = performance.now();
			await F(base + '__down?bytes=0&r=' + Math.random(), { cache: 'no-store' });
			pings.push(performance.now() - t);
		}
		S.speed.ping = Math.min(...pings.slice(1));
		S.speed.phase = 'down'; renderSoft();
		let bytes = 0; const t0 = performance.now(); let last = t0;
		const runDown = async () => {
			while (performance.now() - t0 < 10000) {
				const r = await F(base + '__down?bytes=25000000&r=' + Math.random(), { cache: 'no-store' });
				const rd = r.body.getReader();
				for (;;) {
					const { done, value } = await rd.read();
					if (done) break;
					bytes += value.length;
					const now = performance.now();
					if (now - last > 250) { last = now; S.speed.now = bytes * 8 / ((now - t0) / 1000) / 1e6; renderSoft(); }
					if (now - t0 > 10000) { try { rd.cancel(); } catch (e) { /* egal */ } break; }
				}
			}
		};
		await Promise.all([ runDown(), runDown(), runDown() ]);
		S.speed.down = bytes * 8 / ((performance.now() - t0) / 1000) / 1e6;
		S.speed.phase = 'up'; S.speed.now = 0; renderSoft();
		const chunk = new Uint8Array(4 * 1024 * 1024);
		let ub = 0; const u0 = performance.now();
		const runUp = async () => {
			while (performance.now() - u0 < 8000) {
				await F(base + '__up?r=' + Math.random(), { method: 'POST', body: chunk, cache: 'no-store' });
				ub += chunk.length;
				S.speed.now = ub * 8 / ((performance.now() - u0) / 1000) / 1e6; renderSoft();
			}
		};
		try { await Promise.all([ runUp(), runUp() ]); S.speed.up = ub * 8 / ((performance.now() - u0) / 1000) / 1e6; } catch (e) { S.speed.up = null; }
		S.speed.phase = 'done';
	} catch (e) {
		S.speed.phase = 'done';
		S.speed.err = 'Test fehlgeschlagen: ' + e.message;
	}
	renderSoft();
}

/* ---------- Netz-Check ---------- */
VIEWS.check = () => {
	const c = S.check;
	const body = `<div class="ph-card pad">
		<label class="ph-field">Ziel (Name oder IP)<input id="chkHost" autocapitalize="off" spellcheck="false" value="${attr(c.host)}"></label>
		<div class="ph-chips">${[ 'google.de', '1.1.1.1', '9.9.9.9' ].concat(Net.others().map((r) => r.host)).map((h) => `<button class="ph-chip" data-a="chkHost" data-x="${attr(h)}">${esc(h)}</button>`).join('')}</div>
		<div class="ph-grid2"><button class="ph-btn primary" data-a="ping" ${c.busy ? 'disabled' : ''}>Ping</button><button class="ph-btn cyan" data-a="trace" ${c.busy ? 'disabled' : ''}>Traceroute</button></div>
		${c.busy ? '<div class="ph-loading" style="flex:none"><div class="ph-spin"></div>Läuft auf dem Master …</div>' : ''}
		${c.out ? `<div class="ph-console">${esc(c.out)}</div>` : ''}
		<div class="ph-hint">Der Test läuft direkt auf dem Master – so siehst du, ob das Problem am Internet oder am WLAN liegt. <b>Ping</b> misst, wie schnell das Ziel antwortet. <b>Traceroute</b> zeigt jede Station auf dem Weg dorthin (Router davor, Anbieter, …) – so siehst du, wo es hakt. Dauert bis zu 15 Sekunden.</div></div>`;
	return { title: 'Netz-Check', body };
};

/* ---------- Mehr ---------- */
VIEWS.more = () => {
	const need = Net.routers.filter((r) => Net.info[r.id] && !Net.info[r.id].ok).length;
	const v = Net.vpn();
	const item = (ic, c, t, s, x, right) => row(icon(ic, 20, '#0d0b16'), c, t, s, right || icon('next', 18, 'var(--muted)'), 'push', x);
	const body = `<div class="ph-card list">
		${item('router', 'var(--violet)', 'Router & Anmeldungen', Net.routers.length + ' Router' + (need ? ' · ' + need + ' brauchen Hilfe' : ''), 'cudys', need ? '<span class="ph-badge">' + need + '</span>' : '')}
		${item('lock', 'var(--cyan)', 'Router-Pakete', Net.missingRights().length ? 'Rechte fehlen auf ' + Net.missingRights().length + ' Router' : 'Rechte vollständig' + (Net.caps().helper ? ' · Tageslimit-Zähler' : ''), 'helper', Net.missingRights().length ? '<span class="ph-badge new">!</span>' : '')}
		${item('log', 'var(--violet)', 'Geräte-Protokoll', 'Neue Geräte, Pausen, WLAN', 'log')}
		${item('shield', 'var(--ok)', 'VPN (WireGuard)', v ? (v.on ? 'Eingeschaltet' : 'Ausgeschaltet') : 'nicht eingerichtet', 'vpn')}
		${item('share', 'var(--cyan)', 'Backups', 'Einstellungen aller Router aufs Handy sichern', 'backup')}
		${item('bell', 'var(--warn)', 'Benachrichtigungen', S.notify.on ? 'An' : 'Aus', 'notify')}
	</div>
	<div class="ph-card list">
		${item('lock', 'var(--violet)', 'Sicherheit', S.lock.on ? 'App-Login an' + (S.lock.fp ? ' · Fingerabdruck' : '') : 'App-Login aus', 'security')}
		${item('lock', 'var(--cyan)', 'Verbindung', Net.routers.every((r) => r.proto === 'https') ? 'Alle Router mit HTTPS' : Net.routers.filter((r) => r.proto !== 'https').length + ' Router noch ohne HTTPS', 'conn', Net.routers.some((r) => r.proto !== 'https') ? '<span class="ph-badge new">!</span>' : '')}
		${item(S.theme === 'light' ? 'sun' : 'moon', 'var(--violet)', 'Darstellung', { dark: 'Dunkel', light: 'Hell', auto: 'Wie das System' }[S.theme], 'look')}
		${item('globe', 'var(--cyan)', 'Sprache', { auto: 'Wie das System', de: 'Deutsch', en: 'English' }[S.lang] || 'Wie das System', 'lang')}
		${item('info', 'var(--muted)', 'Über die App', 'Version 1.0', 'about')}
	</div>
	<button class="ph-btn danger" data-a="logout">Abmelden</button>`;
	return { title: 'Mehr', body };
};

VIEWS.log = () => {
	const f = S.logFilter;
	let evs = allEvents();
	if (f !== 'all') evs = evs.filter((e) => e.kind === f);
	const body = `<div class="ph-chips scroll">${chip(f === 'all', 'logFilter', 'all', 'Alle')}${Object.entries(KINDS).map(([ k, l ]) => chip(f === k, 'logFilter', k, l)).join('')}</div>
		<div class="ph-card list">${evs.length ? evs.slice(0, 150).map(evRow).join('') : '<div class="ph-dim" style="padding:18px">Keine Einträge</div>'}</div>
		<div class="ph-dim">Aus dem Systemprotokoll der Router (WLAN-Verbindungen, vergebene IPs). Es reicht je Router etwa einige Stunden zurück.</div>`;
	return { title: 'Geräte-Protokoll', body };
};

VIEWS.cudys = () => {
	let body = '<div class="ph-card list">' + Net.routers.map((r) => {
		const i = Net.info[r.id];
		const st = !i ? 'Noch nicht geladen' : i.ok ? 'Angemeldet' : i.needLogin ? 'Passwort nötig' : 'Nicht erreichbar';
		const c = i && i.ok ? 'var(--ok)' : 'var(--warn)';
		const v = Net.fwInstalled(r);
		return row(icon('router', 20, '#0d0b16'), c, (r.name || r.host) + (r === Net.master ? ' (Master)' : ''), r.proto.toUpperCase() + ' · ' + r.host + ' · ' + (i && i.ok && v ? 'OpenWrt ' + v : st), fwTag(r, true) || icon('next', 18, 'var(--muted)'), 'cudyMenu', r.id);
	}).join('') + '</div>';
	body += `<button class="ph-btn cyan" data-a="rescan">${spinOr('rescan', icon('search', 18) + '&nbsp; Nach Router suchen')}</button>
		<button class="ph-btn dashed" data-a="addCudy">${icon('plus', 18)}&nbsp; Router von Hand hinzufügen</button>
		<div class="ph-dim">„Nach Router suchen“ prüft die Geräte im Netz des Masters. Firmware-Updates werden alle 12 Stunden geprüft: neueste Version im selben OpenWrt-Zweig.<br>Passwörter liegen nur im Android-Schlüsselspeicher.</div>`;
	return { title: 'Router & Anmeldungen', body };
};

VIEWS.conn = () => {
	const http = Net.routers.filter((r) => r.proto !== 'https');
	let body = http.length ? `<div class="ph-banner warn"><div class="ph-line">${icon('lock', 22, 'var(--warn)')}<div><b>${http.length} Router noch ohne Verschlüsselung</b><small>Mit einem Tipp auf HTTPS umstellen. Beim ersten Kontakt merkt sich die App das Zertifikat selbst.</small></div></div>
			<button class="ph-btn primary" data-a="allHttps">${spinOr('allHttps', 'Alle Router auf HTTPS umstellen')}</button></div>`
		: `<div class="ph-banner ok"><div class="ph-line">${icon('lock', 22, 'var(--ok)')}<div><b>Alle Router verschlüsselt</b><small>Ändert sich ein Zertifikat, fragt die App nach.</small></div></div></div>`;
	body += '<div class="ph-card list">' + Net.routers.map((r) => {
		const on = r.proto === 'https';
		const sub = r.proto + '://' + r.host + (on && r.pin ? ' · SHA-256 ' + r.pin.slice(0, 5) + '…' + r.pin.slice(-2) : '');
		return `<div class="ph-row"><div class="ph-grow"><b>${esc(r.name || r.host)}</b><small class="mono">${esc(sub)}</small>
			${S.allowHttp ? `<div class="ph-chips" style="margin-top:6px">${chip(on, 'setProto', r.id + '|https', 'HTTPS')}${chip(!on, 'setProto', r.id + '|http', 'HTTP')}</div>` : ''}
			${on && r.pin ? `<button class="ph-link" data-a="forgetPin" data-x="${r.id}" style="font-size:12px">Zertifikat vergessen</button>` : ''}</div>
			${tag(on ? 'ok' : 'warn', on ? 'HTTPS' : 'HTTP')}</div>`;
	}).join('') + '</div>';
	body += `<div class="ph-card rows">${swRow('HTTP erlauben', 'Nur für Router ohne HTTPS (ältere OpenWrt-Versionen)', S.allowHttp, 'allowHttp', '')}</div>
		<div class="ph-dim">Neue Router verbindet die App immer zuerst über HTTPS. Zurück auf HTTP fällt sie nie von selbst – das würde Angreifern helfen.</div>
		<div class="ph-card rows"><div class="ph-h">DATEN</div>${kv('Quelle', 'Router (live)')}${kv('Stand', Net.loadedAt ? fmtTime(Net.loadedAt) : '–')}${kv('Automatisch neu laden', 'alle 20 s, beim Öffnen')}</div>
		<button class="ph-btn" data-a="refresh">${icon('refresh', 18)}&nbsp; Jetzt neu laden</button>`;
	return { title: 'Verbindung', body };
};

/* ---------- Sicherheit: App-Login ---------- */
VIEWS.security = () => {
	const L = S.lock;
	if (!L.on) return { title: 'Sicherheit', body: `<div class="ph-card pad" style="align-items:center;text-align:center">${icon('lock', 36, 'var(--cyan)')}<b>App-Login</b>
		<div class="ph-hint">Vor dem Zugriff auf deine Router fragt die App nach Benutzername &amp; Passwort${S.bioOk ? ' oder deinem Fingerabdruck' : ''}. Der Login bleibt nur auf diesem Handy.</div>
		<button class="ph-btn primary" data-a="push" data-x="lockSetup">App-Login einrichten</button></div>` };
	let body = `<div class="ph-card rows">${swRow('App-Login', L.user + ' · beim Öffnen fragen', true, 'lockOff', '')}
		${S.bioOk ? swRow('Fingerabdruck', 'statt Passwort entsperren', L.fp, 'lockFp', '') : ''}</div>`;
	body += `<div class="ph-card pad"><div class="ph-h">SPERREN NACH</div><div class="ph-chips">${[ [ 0, 'Sofort' ], [ 1, '1 Min' ], [ 5, '5 Min' ], [ 15, '15 Min' ] ].map(([ m, l ]) => chip(L.delay === m, 'lockDelay', String(m), l)).join('')}</div>
		<div class="ph-hint">Wie lange die App im Hintergrund sein darf, bevor sie wieder nach dem Login fragt.</div></div>`;
	body += `<div class="ph-card list">${row(icon('edit', 20, 'var(--soft)'), 'rgba(168,85,247,.12)', 'Benutzername & Passwort ändern', '', icon('next', 18, 'var(--muted)'), 'push', 'lockSetup')}
		${row(icon('trash', 20, 'var(--bad)'), 'rgba(255,107,138,.12)', 'App-Login entfernen', '', '', 'lockOff', '')}</div>
		<div class="ph-dim">Benachrichtigungen kommen auch, wenn die App gesperrt ist – sie zeigen aber nur, was passiert ist. Zum Ändern (z. B. „+30 Min geben“) fragt die App nach dem Login.</div>`;
	return { title: 'Sicherheit', body };
};
VIEWS.lockSetup = () => {
	const edit = S.lock.on;
	return { title: edit ? 'Login ändern' : 'App-Login einrichten', body: `<div class="ph-card pad" style="align-items:center;text-align:center">${icon('lock', 36, 'var(--cyan)')}
		<div class="ph-hint">Vor dem Zugriff auf deine Router fragt die App nach diesem Login. Er bleibt nur auf diesem Handy – gespeichert wird nur eine verschlüsselte Prüfsumme, nie das Passwort.</div></div>
		<form data-f="lock" class="ph-card pad" onsubmit="return false">
			<label class="ph-field">Benutzername<input id="lkUser" value="${attr(S.lock.user || '')}" autocapitalize="off" autocomplete="username" spellcheck="false"></label>
			<label class="ph-field">Passwort<input id="lkPw" type="password" autocomplete="new-password"></label>
			<label class="ph-field">Passwort wiederholen<input id="lkPw2" type="password" autocomplete="new-password"></label>
			${S.bioOk ? `<label class="ph-check"><input type="checkbox" id="lkFp" ${S.lock.fp || !edit ? 'checked' : ''}>Mit Fingerabdruck entsperren</label>` : ''}
		</form>
		<button class="ph-btn primary" data-a="lockSave">${spinOr('lockSave', 'Login speichern')}</button>
		${edit ? '' : '<button class="ph-btn" data-a="lockLater">Später</button>'}` };
};
function lockView() {
	const L = S.lock;
	return `<div class="ph-login ph-lock">
		<img src="img/logo-full.webp" alt="">
		<div class="brand"><b>Hallo ${esc(L.user || '')}</b><span>Phantom Network ist gesperrt</span></div>
		${L.fp && S.bioOk && !S.unlockRouter ? `<button class="ph-bio" data-a="unlockBio" aria-label="Mit Fingerabdruck entsperren">${icon('finger', 40, 'var(--cyan)')}</button><small class="ph-sub">Finger auflegen</small>` : ''}
		<form data-f="unlock" onsubmit="return false">
			<label class="ph-field">${S.unlockRouter ? 'Router-Passwort des Masters' : L.fp && S.bioOk ? 'oder Passwort' : 'Passwort'}<input id="ulPw" type="password" autocomplete="current-password"></label>
			${S.unlockErr ? `<div class="ph-error">${esc(S.unlockErr)}</div>` : ''}
			<button class="ph-btn primary" data-a="unlock">Entsperren</button>
		</form>
		<button class="ph-link" data-a="unlockForgot">${S.unlockRouter ? 'Zurück zum App-Passwort' : 'Passwort vergessen? Mit dem Router-Passwort entsperren'}</button>
	</div>`;
}
function lockApp() {
	S.locked = true; S.unlockErr = ''; S.unlockRouter = false;
	if (S.sheet) closeSheet();
	render();
	if (S.lock.fp && S.bioOk) setTimeout(() => { if (S.locked) A.unlockBio(); }, 350);
}
function unlockDone() {
	S.locked = false; S.unlockErr = ''; S.unlockRouter = false; S.pausedAt = 0;
	Plat.setPref('lockAway', 0);
	if (S.unlockWait) { const w = S.unlockWait; S.unlockWait = null; w(); return; }
	render();
	if (S.logged) refresh(true);
}
async function lockSaveState() { await Plat.setPref('lock', S.lock); syncRunner().catch(() => {}); }

VIEWS.lang = () => {
	const body = '<div class="ph-card pad"><div class="ph-chips">' + [ [ 'auto', 'Wie das System' ], [ 'de', 'Deutsch' ], [ 'en', 'English' ] ].map(([ k, l ]) => chip(S.lang === k, 'lang', k, l)).join('') + '</div></div>';
	return { title: 'Sprache', body };
};
VIEWS.look = () => {
	const body = '<div class="ph-card pad"><div class="ph-chips">' + [ [ 'auto', 'Wie das System' ], [ 'light', 'Hell' ], [ 'dark', 'Dunkel' ] ].map(([ k, l ]) => chip(S.theme === k, 'theme', k, l)).join('') + '</div></div>';
	return { title: 'Darstellung', body };
};

VIEWS.notify = () => {
	const n = S.notify;
	let body = `<div class="ph-card rows">${swRow('Benachrichtigungen', 'Prüft etwa alle 15 Minuten im Hintergrund', n.on, 'notifyOn', '')}</div>`;
	body += `<div class="ph-card rows"><div class="ph-h">WORÜBER?</div>${Object.entries(NOTIFY_KINDS).map(([ k, l ]) => swRow(l, '', n.kinds.includes(k), 'notifyKind', k)).join('')}</div>
		<div class="ph-hint">Der Check liest etwa alle 15 Minuten das Systemprotokoll des Masters – wie das Protokoll in der App. Gemeldet werden Geräte, die zum ersten Mal eine Adresse bekommen, Fehler und kritische Meldungen sowie Router, die nicht mehr antworten. Beim Tageslimit kommt die Vorwarnung, sobald nur noch etwa 20 Minuten übrig sind; ist es erreicht, kannst du direkt in der Mitteilung 30 Minuten dazugeben. Das Passwort bleibt dabei verschlüsselt im Android-Schlüsselspeicher. Manche Handys beenden Hintergrunddienste – dann in den Akku-Einstellungen „Nicht optimieren“ wählen.</div>
		<button class="ph-btn" data-a="notifyTest">Test-Benachrichtigung</button>`;
	return { title: 'Benachrichtigungen', body };
};

VIEWS.vpn = () => {
	const v = Net.vpn();
	if (!v) return { title: 'VPN', body: `<div class="ph-card pad"><b>Kein WireGuard eingerichtet</b><div class="ph-hint">Richte in der Weboberfläche unter VPN ein WireGuard-Netz ein (Port freigeben nicht vergessen). Die App findet es danach automatisch und kann Handys hinzufügen.</div></div>` };
	const ep = S.vpnEp || '';
	let body = phoneVpnCard();
	body += `<div class="ph-card rows"><div class="ph-h">VPN-SERVER AM MASTER</div>${swRow('VPN-Server', v.on ? 'Läuft auf Port ' + v.port + ' – Handys können sich verbinden' : 'Aus – schaltet sich nie von selbst ein', v.on, 'vpn', '')}</div>`;
	body += `<div class="ph-card list"><div class="ph-h">ZUGÄNGE (${v.peers.length})</div>` +
		(v.peers.length ? v.peers.map((p) => row(icon('phone', 20, '#0d0b16'), p.handshake && Date.now() / 1000 - p.handshake < 180 ? 'var(--ok)' : 'rgba(165,159,191,.35)', p.description || p['.name'],
			asList(p.allowed_ips).join(', ') + ' · ' + (p.handshake ? 'zuletzt ' + fmtWhen(p.handshake * 1000) + ' · ↓' + fmtBytes(p.tx) + ' ↑' + fmtBytes(p.rx) : 'noch nie verbunden'), `<button class="ph-iconbtn" style="margin:0" data-a="delPeer" data-x="${p['.name']}" aria-label="Löschen">${icon('trash', 18, 'var(--badtext)')}</button>`)).join('') : '<div class="ph-dim" style="padding:14px">Noch keine Zugänge</div>') + '</div>';
	body += `<div class="ph-card pad"><div class="ph-h">HANDY HINZUFÜGEN</div>
		<label class="ph-field">Name<input id="vpnName" placeholder="z. B. Handy Max"></label>
		<label class="ph-field">Adresse von außen (DynDNS oder feste IP)<input id="vpnEp" autocapitalize="off" spellcheck="false" placeholder="z. B. meinname.duckdns.org" value="${attr(ep)}"></label>
		<label class="ph-check"><input type="checkbox" id="vpnFull">Gesamten Verkehr über Zuhause leiten</label>
		<button class="ph-btn primary" data-a="addPeer">${spinOr('peer', 'Zugang erstellen')}</button>
		<div class="ph-hint">Der Zugang wird auf dem Master gespeichert. Den QR-Code scannst du mit der WireGuard-App. Den VPN-Server schaltest du oben selbst ein.</div></div>`;
	return { title: 'VPN', sub: v.iface, body };
};

/* Handy-VPN: steuert den Tunnel in der WireGuard-App (deren offizielle Fernsteuerung) */
function wgRefresh() {
	if (S.wgBusy) return;
	S.wgBusy = true;
	Plat.wgStatus().then((st) => { S.wg = st; S.wgAt = Date.now(); }).finally(() => { S.wgBusy = false; renderSoft(); });
}
function phoneVpnCard() {
	if (!Plat.Phantom) return '';
	if (!S.wgAt || Date.now() - S.wgAt > 5000) wgRefresh();
	const st = S.wg;
	if (!st) return '<div class="ph-card pad"><div class="ph-h">DIESES HANDY</div><div class="ph-dim">Prüfe …</div></div>';
	if (!st.installed) return `<div class="ph-card pad"><div class="ph-h">DIESES HANDY</div><b>WireGuard-App fehlt</b><div class="ph-hint">Installiere „WireGuard“ aus dem Play Store und scanne dort den QR-Code eines Zugangs. Danach kannst du das VPN hier ein- und ausschalten.</div></div>`;
	return `<div class="ph-card rows"><div class="ph-h">DIESES HANDY</div>
		${swRow('VPN auf diesem Handy', st.vpn ? 'Verbunden' : 'Getrennt', st.vpn, 'wgPhone', '')}
		<label class="ph-field" style="margin-top:8px">Name des Tunnels in der WireGuard-App<input id="wgTunnel" autocapitalize="off" spellcheck="false" placeholder="z. B. Zuhause" value="${attr(S.wgTunnel || '')}"></label>
		${st.allowed ? '' : '<div class="ph-hint">Beim ersten Einschalten fragt Android, ob die App WireGuard steuern darf. In der WireGuard-App muss außerdem unter Einstellungen „Allow remote control apps“ (Fernsteuerung durch Apps) eingeschaltet sein.</div>'}
	</div>`;
}
VIEWS.helper = () => {
	const routers = Net.routers.map((r) => ({ r, i: Net.info[r.id] }));
	const missing = routers.filter((x) => x.i && x.i.ok && !x.i.acl);
	const noPkg = routers.filter((x) => x.i && x.i.ok && !x.i.rightsPkg);
	const withPkg = routers.filter((x) => x.i && x.i.ok && x.i.rightsPkg);
	const run = S.busy.rights;
	const list = routers.map(({ r, i }) => {
		const live = run && S.rightsAt === r.id;
		const st = live ? 'run' : !i || !i.ok ? 'off' : i.acl ? 'ok' : 'miss';
		const how = i && i.ok ? (i.rightsPkg ? ' · Paket' : i.rightsSsh ? ' · per SSH' : i.acl ? ' · Firmware' : '') : '';
		const sub = st === 'run' ? 'Paket wird geändert …' : st === 'off' ? 'nicht erreichbar' : st === 'ok' ? 'Vollständig' + how : 'Es fehlt: ' + (i.aclMissing || []).join(', ');
		// rechts: Knopf für genau diesen Router (Paket drauf → entfernen, sonst installieren)
		const right = st === 'run' ? '<div class="ph-spin"></div>' : st === 'off' ? tag('off', 'offline')
			: i.rightsPkg ? `<button class="ph-btn small danger" style="flex:none" data-a="rightsOneRm" data-x="${attr(r.id)}"${run ? ' disabled' : ''}>${icon('trash', 16)}&nbsp;Entfernen</button>`
			: `<button class="ph-btn small primary" style="flex:none" data-a="rightsOne" data-x="${attr(r.id)}"${run ? ' disabled' : ''}>${icon('plus', 16)}&nbsp;Paket</button>`;
		return row(icon('router', 20, '#0d0b16'), st === 'ok' ? 'var(--ok)' : st === 'run' ? 'var(--cyan)' : st === 'off' ? 'rgba(165,159,191,.35)' : 'var(--warn)', r.name || r.host, sub, right);
	}).join('');
	const allIn = noPkg.length && !run ? `<button class="ph-btn primary" data-a="rightsInstall">${icon('plus', 18)}&nbsp; Alle installieren (${noPkg.length})</button>` : `<button class="ph-btn" disabled>${run ? '<div class="ph-spin"></div>' : icon('check', 18) + '&nbsp; Überall installiert'}</button>`;
	const allOut = withPkg.length && !run ? `<button class="ph-btn danger" data-a="rightsRemove">${icon('trash', 18)}&nbsp; Alle entfernen (${withPkg.length})</button>` : `<button class="ph-btn" disabled>Nirgends installiert</button>`;
	const btns = `<div class="ph-grid2">${allIn}${allOut}</div>`;
	const info = 'Das Paket „phantom-rights“ enthält nur die Rechte-Datei. Du kannst es für jeden Router einzeln oder für alle auf einmal installieren und entfernen.';
	let body = '<div class="ph-h" style="padding:0 4px">ROUTER-RECHTE · ALLE ROUTER</div>';
	body += missing.length
		? `<div class="ph-banner warn"><div class="ph-line"><span style="flex:none;display:flex">${icon('lock', 22, 'var(--warn)')}</span><div><b>${missing.length} Router ohne volle Rechte</b><small>${info}</small></div></div>${btns}</div>`
		: `<div class="ph-banner ok"><div class="ph-line"><span style="flex:none;display:flex">${icon('check', 22, 'var(--ok)')}</span><div><b>Alle Router haben die Rechte</b><small>${info}</small></div></div>${btns}</div>`;
	body += `<div class="ph-card list"><div class="ph-h">STATUS</div>${list}</div>
		<details class="ph-card pad" style="display:block"><summary class="ph-h" style="min-height:32px">Ohne Paketverwaltung? SSH-Block</summary>
		<div style="display:flex;flex-direction:column;gap:10px;margin-top:8px"><div class="ph-hint">Nur nötig, wenn der Router keine Pakete installieren kann (sehr kleine eigene Firmware). Der Block legt die Datei <span class="mono">root.json</span> an und trägt sie in <span class="mono">/etc/sysupgrade.conf</span> ein, damit sie ein Firmware-Update übersteht.</div>
		<div class="ph-hint">1. Per SSH auf den Router (z. B. <span class="mono">ssh root@${esc(Net.master ? Net.master.host : '')}</span>)<br>2. Block kopieren, einfügen, Enter<br>3. Auf jedem Router wiederholen, dann hier neu prüfen</div>
		<div class="ph-grid2"><button class="ph-btn primary" data-a="copyHelper">${icon('log', 18)}&nbsp; Kopieren</button><button class="ph-btn cyan" data-a="shareHelper">${icon('share', 18)}&nbsp; Teilen</button></div>
		<div class="ph-console" style="max-height:340px">${esc(window.PHANTOM_HELPER || '')}</div></div></details>`;
	// Tageslimit-Zähler (nur Master)
	const has = Net.caps().helper, old = has && Net.agentOld();
	const aSub = !has ? 'nicht installiert' : 'Version ' + (Net.agentVer() || '?') + (old ? ' · neu: ' + Net.AGENT_VER : ' · ' + (Net.master ? Net.master.name : 'Master'));
	const aTag = !has ? tag('off', 'aus') : old ? tag('warn', 'Update') : tag('ok', 'aktuell');
	body += `<div class="ph-h" style="padding:6px 4px 0">TAGESLIMIT-ZÄHLER · NUR MASTER</div>
		<div class="ph-card pad">${row(icon('clock', 20, '#0d0b16'), 'var(--violet)', 'phantom-agent', aSub, aTag)}
		<div class="ph-hint">Zählt Nutzungszeit und Daten je Gerät, setzt Tageslimits durch und trennt laufende Verbindungen, sobald ein Gerät pausiert wird.</div>
		${!has ? `<button class="ph-btn primary" data-a="agentInstall">${spinOr('agent', icon('plus', 18) + '&nbsp; Einrichten')}</button>`
		: `<div class="ph-grid2">${old ? `<button class="ph-btn primary" data-a="agentInstall">${spinOr('agent', icon('refresh', 18) + '&nbsp; Aktualisieren')}</button>` : `<button class="ph-btn" disabled>${icon('check', 18)}&nbsp; Aktuell</button>`}<button class="ph-btn danger" data-a="agentRemove">${spinOr('agent', 'Entfernen')}</button></div>`}</div>
		<button class="ph-btn" data-a="refresh">${icon('refresh', 18)}&nbsp; Neu prüfen</button>`;
	return { title: 'Router-Pakete', body };
};

VIEWS.about = () => {
	const ok = Net.routers.filter((r) => fwState(r));
	const upd = ok.filter((r) => fwState(r).up);
	const caps = Net.caps();
	const fwSub = !ok.length ? 'wird geprüft …' : upd.length ? 'OpenWrt ' + fwState(upd[0]).up + ' · ' + upd.length + ' von ' + Net.routers.length + ' Router' : 'OpenWrt ' + fwState(ok[0]).installed + ' · alle ' + ok.length + ' Router';
	const agentSub = !caps.helper ? 'nicht eingerichtet (Familie → Profil)' : 'phantom-agent ' + (Net.agentVer() || '') + ' · Master';
	const agentTag = !caps.helper ? tag('off', 'aus') : Net.agentOld() ? tag('warn', 'Update verfügbar') : Net.agentVer() ? tag('ok', 'aktuell') : '';
	const prof = Net.profiles().length;
	const facts = [
		[ 'wifi', 'Kein Server, kein Konto', 'Die App spricht direkt mit deinen Routern – über dieselbe Schnittstelle wie die Weboberfläche.' ],
		[ 'router', 'Alles liegt auf den Routern', 'Profile, Pausen, Zeitpläne und Limits stehen in der Router-Konfiguration – jedes Handy sieht dasselbe.' ],
		[ 'lock', 'Passwort bleibt auf dem Handy', 'Verschlüsselt im Android-Schlüsselspeicher, nie im Klartext.' ],
		[ 'bell', 'Hintergrund-Check', 'Etwa alle 15 Minuten: neue Geräte, Fehler, Router offline, Firmware-Updates, Tageslimit.' ]
	];
	let body = `<div class="ph-card pad ph-about"><img src="img/logo-full.webp" alt=""><b>Phantom Network</b><div class="ph-sub">Version 1.0 · für OpenWrt-Router</div>
		<div class="ph-chips" style="justify-content:center">${tag('info', 'OpenWrt 25.12')}${tag('violet', 'ohne Cloud')}</div></div>`;
	body += `<div class="ph-h" style="padding:0 4px">DEIN NETZ</div><div class="ph-stats">
		<div class="ph-card pad ph-stat"><b class="mono">${Net.routers.length}</b><span>Router</span></div>
		<div class="ph-card pad ph-stat"><b class="mono">${Net.devices.filter((d) => d.online).length}</b><span>Geräte online</span></div>
		<div class="ph-card pad ph-stat"><b class="mono">${prof}</b><span>${prof === 1 ? 'Profil' : 'Profile'}</span></div></div>`;
	body += `<div class="ph-h" style="padding:0 4px">AKTUELL?</div><div class="ph-card list">
		${row(icon('router', 20, 'var(--cyan)'), 'rgba(34,227,255,.12)', 'Router-Firmware', fwSub, upd.length ? tag('warn', 'Update verfügbar') : ok.length ? tag('ok', 'aktuell') : '', 'push', 'cudys')}
		${row(icon('clock', 20, 'var(--violet)'), 'rgba(168,85,247,.14)', 'Tageslimit-Zähler', agentSub, agentTag, caps.helper ? 'cudy' : 'tab', caps.helper ? Net.master.id : 'fam')}
		${row(icon('phone', 20, 'var(--warn)'), 'rgba(245,184,91,.14)', 'App', 'Version 1.0 · auf diesem Handy', '', '', '')}</div>`;
	body += `<div class="ph-h" style="padding:0 4px">SO FUNKTIONIERT’S</div><div class="ph-card pad ph-facts">${facts.map(([ ic, t, d ]) => `<div>${icon(ic, 20, 'var(--cyan)')}<span><b>${t}</b><small>${d}</small></span></div>`).join('')}</div>`;
	body += `<div class="ph-h" style="padding:0 4px">RECHTLICHES</div><div class="ph-card list">
		${row(icon('doc', 20, 'var(--soft)'), 'rgba(168,85,247,.12)', 'Open-Source-Lizenzen', 'Bausteine, auf denen die App aufbaut', icon('next', 18, 'var(--muted)'), 'push', 'licenses')}
		${row(icon('user', 20, 'var(--soft)'), 'rgba(168,85,247,.12)', 'Impressum', 'Wer die App anbietet', icon('next', 18, 'var(--muted)'), 'push', 'imprint')}
		${row(icon('shield', 20, 'var(--soft)'), 'rgba(168,85,247,.12)', 'Datenschutz', 'Welche Daten wo bleiben', icon('next', 18, 'var(--muted)'), 'push', 'privacy')}</div>
		<div class="ph-dim">© 2026 Phantom · Phantom Network</div>`;
	return { title: 'Über die App', body };
};

/* ---------- Rechtliches ---------- */
VIEWS.licenses = () => {
	const L = window.LICENSES || [];
	const groups = [ ...new Set(L.map((x) => x.group)) ];
	let body = '<div class="ph-hint" style="padding:0 4px">Phantom Network baut auf freier Software auf. Danke an alle, die sie entwickeln. Tippe auf einen Eintrag für den vollen Lizenztext.</div>';
	for (const g of groups) {
		body += `<div class="ph-h" style="padding:0 4px">${esc(g.toUpperCase())}</div><div class="ph-card list ph-lic">` + L.filter((x) => x.group === g).map((x) => `<details><summary><span class="ph-grow"><b>${esc(x.name)}</b><small>${esc(x.holder)}</small></span>${tag('violet', esc(x.lic))}</summary><pre>${esc(x.text.replace(/([^\n])\n(?=[^\n\s])/g, '$1 '))}</pre></details>`).join('') + '</div>';
	}
	return { title: 'Open-Source-Lizenzen', body };
};
const IMPRINT_MAIL = 'phantoms.fritzbox@gmail.com';
VIEWS.imprint = () => ({
	title: 'Impressum',
	body: `<div class="ph-card pad"><div class="ph-h">ANBIETER</div><div style="font-size:15px">Phantom</div>
		<div class="ph-sep"></div><div class="ph-h">KONTAKT</div><div style="font-size:15px">E-Mail: <a href="mailto:${IMPRINT_MAIL}">${IMPRINT_MAIL}</a></div></div>
		<div class="ph-card pad"><div class="ph-h">HINWEIS</div>
		<div class="ph-hint">Phantom Network ist ein privates, nicht kommerzielles Projekt. Die App wird ohne Gewähr bereitgestellt; für Schäden an Geräten oder Einstellungen wird keine Haftung übernommen, soweit gesetzlich zulässig.</div>
		<div class="ph-hint">OpenWrt ist eine Marke des OpenWrt-Projekts, Cudy und FRITZ!Box sind Marken ihrer Hersteller. Phantom Network steht mit ihnen in keiner Verbindung.</div></div>
		<div class="ph-dim">© 2026 Phantom</div>`
});
VIEWS.privacy = () => {
	const secs = [
		[ 'WAS AUF DEM HANDY GESPEICHERT WIRD', 'Adressen deiner Router, deine Einstellungen in der App und die Router-Passwörter – die Passwörter verschlüsselt im Android-Schlüsselspeicher. Backups landen nur in dem Ordner, den du auswählst.' ],
		[ 'MIT WEM DIE APP SPRICHT', '• deine Router (dieselbe Schnittstelle wie die Weboberfläche)\n• der Router davor, z. B. die FRITZ!Box (UPnP, nur im Heimnetz)\n• downloads.openwrt.org – nur die öffentliche Liste der OpenWrt-Versionen, ohne Daten über dich oder dein Netz' ],
		[ 'WAS AUF DEN ROUTERN LIEGT', 'Profile, Pausen, Zeitpläne und Limits stehen in der Router-Konfiguration. Der Tageslimit-Zähler speichert Nutzungszeit und Datenmenge je Gerät (MAC-Adresse) für 35 Tage und Monatssummen für 12 Monate – nur auf dem Master.' ],
		[ 'BENACHRICHTIGUNGEN', 'Der Hintergrund-Check läuft auf dem Handy und fragt nur deinen Master ab. Mitteilungen erzeugt Android selbst – kein Push-Dienst, kein Server dazwischen.' ],
		[ 'BERECHTIGUNGEN', 'Mitteilungen · Netzwerk · WireGuard steuern (nur wenn du den VPN-Schalter nutzt) · Ordnerzugriff (nur für Backups)' ],
		[ 'LÖSCHEN', 'App deinstallieren löscht alles auf dem Handy. Daten auf den Routern löschst du über die App (Profil löschen, Tageslimit-Zähler entfernen) oder die Weboberfläche.' ]
	];
	return {
		title: 'Datenschutz',
		body: `<div class="ph-banner ok"><div class="ph-line">${icon('shield', 22, 'var(--ok)')}<div><b>Kurz gesagt</b><small>Keine Cloud, kein Konto, keine Werbung, keine Statistik. Deine Daten bleiben auf deinem Handy und deinen Routern.</small></div></div></div>` +
			secs.map(([ t, d ]) => `<div class="ph-card pad"><div class="ph-h">${t}</div><div class="ph-hint" style="white-space:pre-line">${d}</div></div>`).join('') +
			'<div class="ph-dim">Verantwortlich: siehe Impressum · Stand: Oktober 2026</div>'
	};
};

/* ================= Aktionen ================= */
const A = {};
A.tab = (x) => go(x);
A.fwTab = (x) => { S.fwTab = x; render(true); };
A.back = () => back();
A.push = (x) => push({ v: x });
A.refresh = () => refresh();
A.dev = (x) => push({ v: 'device', id: x });
A.profile = (x) => push({ v: 'profile', id: x });
A.cudy = (x) => push({ v: 'cudy', id: x });
A.sheetClose = () => closeSheet();
A.sheetBg = (x, el, ev) => { if (ev.target === el) closeSheet(); };
A.trust = () => S.sheet && S.sheet.onTrust && S.sheet.onTrust();

A.search = () => searchMaster();
A.proto = (x) => { readForm(); S.login.proto = x; render(); };
A.login = () => doLogin();
A.logout = () => {
	openSheet(`<h2>Abmelden?</h2><div class="ph-hint">Das gespeicherte Passwort des Masters wird vom Handy gelöscht. Auf den Router ändert sich nichts.</div>
		<button class="ph-btn danger" data-a="logoutYes">Abmelden</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
};
A.logoutYes = () => { closeSheet(); logout(); };

A.devFilter = (x) => { S.devFilter = S.devFilter === x ? 'all' : x; renderSoft(); };
A.devOff = () => { S.devOff = !S.devOff; renderSoft(); };
A.logFilter = (x) => { S.logFilter = x; renderSoft(); };

const dev = (id) => Net.devices.find((d) => d.id === id);
A.pause = (x) => {
	const [ id, v ] = x.split('|');
	const d = dev(id);
	let until = null;
	if (v === 'night') { const t = new Date(); t.setHours(7, 0, 0, 0); if (t <= new Date()) t.setDate(t.getDate() + 1); until = t.getTime(); } else if (Number(v)) until = Date.now() + Number(v) * 60000;
	act('pause', () => Net.pauseDevice(d, true, until), d.name + ' pausiert' + (until ? ' bis ' + fmtTime(until) : ''));
};
/* Eigene Pausenzeit: für eine Dauer oder bis zu einer Uhrzeit (nach Mitternacht automatisch morgen) */
const pad2 = (n) => String(n).padStart(2, '0');
function pauseOwnUntil() {
	const c = S.cp;
	if (c.mode === 'dur') return c.dh * 60 + c.dm ? Date.now() + (c.dh * 60 + c.dm) * 60000 : null;
	const t = new Date(); t.setHours(c.uh, c.um, 0, 0); if (t <= new Date()) t.setDate(t.getDate() + 1);
	return t.getTime();
}
function pauseOwnHtml() {
	const c = S.cp, dur = c.mode === 'dur', until = pauseOwnUntil();
	const day = until && new Date(until).toDateString() !== new Date().toDateString() ? 'morgen ' : 'heute ';
	const sum = !until ? 'Bitte eine Dauer wählen' : dur ? 'Offline für ' + fmtMin(c.dh * 60 + c.dm).trim() + ' – bis ' + day + fmtTime(until) : 'Offline bis ' + day + fmtTime(until);
	const col = (val, unit, up, down) => `<div class="ph-step"><button class="ph-btn small" data-a="cpStep" data-x="${up}" aria-label="mehr">${icon('next', 18)}</button><b class="mono">${val}</b><button class="ph-btn small" data-a="cpStep" data-x="${down}" aria-label="weniger">${icon('next', 18)}</button><small>${unit}</small></div>`;
	const quick = dur ? [ [ '45 Min', 0, 45 ], [ '1,5 Std', 1, 30 ], [ '3 Std', 3, 0 ], [ '5 Std', 5, 0 ] ] : [ [ '18:00', 18, 0 ], [ '20:00', 20, 0 ], [ '21:30', 21, 30 ], [ '22:00', 22, 0 ] ];
	return `<h2>Internet pausieren</h2>
		<div class="ph-seg"><button class="${dur ? 'on' : ''}" data-a="cpMode" data-x="dur">Für eine Dauer</button><button class="${dur ? '' : 'on'}" data-a="cpMode" data-x="until">Bis Uhrzeit</button></div>
		<div class="ph-steps">${dur ? col(c.dh, 'Stunden', 'dh|1', 'dh|-1') : col(pad2(c.uh), 'Stunde', 'uh|1', 'uh|-1')}<span class="ph-stepsep mono">${dur ? '' : ':'}</span>${dur ? col(pad2(c.dm), 'Minuten', 'dm|5', 'dm|-5') : col(pad2(c.um), 'Minute', 'um|5', 'um|-5')}</div>
		<div class="ph-chips" style="justify-content:center">${quick.map(([ l, h, m ]) => `<button class="ph-chip" data-a="cpQuick" data-x="${h}|${m}">${l}</button>`).join('')}</div>
		<div class="ph-banner info"><div class="ph-line"><span style="flex:none;display:flex">${icon('clock', 20, 'var(--cyan)')}</span><div><b style="font-weight:500;font-size:13px">${esc(sum)}</b></div></div></div>
		<div class="ph-grid2"><button class="ph-btn" data-a="sheetClose">Abbrechen</button><button class="ph-btn primary" data-a="cpGo"${until ? '' : ' disabled'}>Pausieren</button></div>`;
}
const cpShow = () => { S.sheet.html = pauseOwnHtml(); renderSheet(); };
A.pauseOwn = (x) => {
	const n = new Date(); n.setMinutes(n.getMinutes() + 60);
	S.cp = Object.assign({ mode: 'dur', dh: 1, dm: 30, uh: n.getHours(), um: Math.ceil(n.getMinutes() / 5) * 5 % 60 }, S.cp || {}, { id: x });
	openSheet(pauseOwnHtml());
};
A.cpMode = (x) => { S.cp.mode = x; cpShow(); };
A.cpStep = (x) => {
	const [ k, d ] = x.split('|'), max = k === 'dm' || k === 'um' ? 55 : 23;
	let v = S.cp[k] + Number(d); if (v > max) v = 0; if (v < 0) v = max;
	S.cp[k] = v; cpShow();
};
A.cpQuick = (x) => { const [ h, m ] = x.split('|').map(Number); if (S.cp.mode === 'dur') { S.cp.dh = h; S.cp.dm = m; } else { S.cp.uh = h; S.cp.um = m; } cpShow(); };
A.cpGo = () => {
	const until = pauseOwnUntil(), d = dev(S.cp.id);
	if (!until || !d) return;
	closeSheet();
	act('pause', () => Net.pauseDevice(d, true, until), d.name + ' pausiert bis ' + fmtTime(until));
};
A.unpause = (x) => { const d = dev(x); act('pause', () => Net.pauseDevice(d, false), d.name + ' ist wieder online'); };
A.prio = (x) => { const d = dev(x); act('prio', () => Net.setPrio(d, !d.prio), d.prio ? 'Nicht mehr bevorzugt' : d.name + ' wird bevorzugt'); };
A.fixed = (x) => {
	const d = dev(x);
	if (!d.ip && !d.fixed) { toast('Das Gerät hat noch keine IP-Adresse', true); return; }
	act('fixed', () => Net.setFixed(d, !d.fixed), d.fixed ? 'Feste IP entfernt' : d.name + ' behält ' + d.ip);
};
A.kick = (x) => { const d = dev(x); act('kick', () => Net.kick(d), d.name + ' getrennt (60 s gesperrt)'); };
A.wake = (x) => { const d = dev(x); act('wake', () => Net.wake(d), 'Weckruf an ' + d.name + ' gesendet'); };
A.rename = (x) => {
	const d = dev(x);
	openSheet(`<h2>Umbenennen</h2><label class="ph-field">Name (ohne Leerzeichen, wie im Router)<input id="newName" value="${attr(d.name)}" autocapitalize="words"></label>
		<div class="ph-hint">Wird als fester DHCP-Eintrag auf dem Master gespeichert.</div>
		<button class="ph-btn primary" data-a="renameYes" data-x="${d.id}">Speichern</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
	setTimeout(() => { const i = document.getElementById('newName'); if (i) i.focus(); }, 50);
};
A.renameYes = (x) => {
	const d = dev(x), n = document.getElementById('newName').value.trim();
	closeSheet();
	if (n && n !== d.name) act('rename', () => Net.rename(d, n), 'Name gespeichert');
};
A.typeSheet = (x) => {
	const d = dev(x);
	openSheet('<h2>Gerätetyp</h2><div class="ph-grid3">' + TYPES.map(([ k, l ]) => `<button class="ph-tile" style="min-height:76px;align-items:center;text-align:center${d.type === k ? ';border-color:var(--violet);background:rgba(168,85,247,.2)' : ''}" data-a="setType" data-x="${d.id}|${k}">${icon(k, 24)}<small>${l}</small></button>`).join('') + '</div>');
};
A.setType = (x) => { const [ id, t ] = x.split('|'); closeSheet(); act('type', () => Net.setType(dev(id), t)); };
A.profSheet = (x) => {
	const d = dev(x);
	const ps = Net.profiles();
	openSheet('<h2>Profil für ' + esc(d.name) + '</h2><div class="ph-card list">' +
		row(icon('close', 18, '#0d0b16'), 'var(--muted)', 'Kein Profil', '', d.profile ? '' : icon('check', 18, 'var(--ok)'), 'setProf', d.id + '|') +
		ps.map((p) => row(esc(p.name[0].toUpperCase()), p.color, p.name, '', d.profile === p.id ? icon('check', 18, 'var(--ok)') : '', 'setProf', d.id + '|' + p.id)).join('') +
		'</div><button class="ph-btn dashed" data-a="newProfile">Neues Profil</button>');
};
A.setProf = (x) => { const [ id, pid ] = x.split('|'); closeSheet(); act('prof', () => Net.setProfile(dev(id), pid), 'Profil gespeichert'); };

/* Profile */
function profileForm(p) {
	p = p || { name: '', color: COLORS[Net.profiles().length % COLORS.length], kid: true };
	S.pform = Object.assign({}, p);
	return `<h2>${p.id ? 'Profil bearbeiten' : 'Neues Profil'}</h2>
		<label class="ph-field">Name<input id="pName" value="${attr(p.name)}" placeholder="z. B. Lena" autocapitalize="words"></label>
		<div class="ph-chips" id="pColors">${COLORS.map((c) => `<button class="ph-chip${c === p.color ? ' on' : ''}" style="width:44px;padding:0;background:${c}" data-a="pColor" data-x="${c}" aria-label="Farbe"></button>`).join('')}</div>
		<label class="ph-check"><input type="checkbox" id="pKid" ${p.kid ? 'checked' : ''}>Kind (Zeitpläne und Limits vorschlagen)</label>
		<button class="ph-btn primary" data-a="saveProfile">Speichern</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`;
}
A.newProfile = () => openSheet(profileForm());
A.editProfile = (x) => openSheet(profileForm(Net.profiles().find((p) => p.id === x)));
A.pColor = (x, el) => { S.pform.color = x; document.querySelectorAll('#pColors .ph-chip').forEach((b) => b.classList.toggle('on', b === el)); };
A.saveProfile = async () => {
	const p = S.pform;
	p.name = document.getElementById('pName').value.trim();
	p.kid = document.getElementById('pKid').checked;
	if (!p.name) { toast('Bitte einen Namen eingeben', true); return; }
	closeSheet();
	const isNew = !p.id;
	let id = p.id;
	await act('saveProfile', async () => { id = await Net.saveProfile(p); }, 'Profil gespeichert');
	if (isNew && id) push({ v: 'profile', id });
};
A.delProfile = (x) => {
	const p = Net.profiles().find((q) => q.id === x);
	openSheet(`<h2>${esc(p.name)} löschen?</h2><div class="ph-hint">Pausen, Zeitpläne und Limit dieses Profils werden entfernt. Die Geräte bleiben im Netz.</div>
		<button class="ph-btn danger" data-a="delProfileYes" data-x="${x}">Löschen</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
};
A.delProfileYes = async (x) => { closeSheet(); await act('delProfile', () => Net.deleteProfile(x), 'Profil gelöscht'); back(); };
A.ppause = (x) => { const on = !Net.ruleOn('phantom_ppause_' + x); act('pp' + x, () => Net.pauseProfile(x, on), on ? 'Pausiert' : 'Pause beendet'); };
A.pauseAll = (x) => act('pauseAll', async () => { for (const p of Net.profiles()) await Net.pauseProfile(p.id, x === '1'); }, x === '1' ? 'Alle pausiert' : 'Alle Pausen beendet');
A.limitWe = (x) => { const [ id, m ] = x.split('|'); act('limit', () => Net.setLimitWe(id, Number(m)), 'Wochenende: ' + (Number(m) ? fmtMin(Number(m)).trim() : 'kein Limit')); };
A.limitWeOn = (x) => { const p = Net.profiles().find((q) => q.id === x); if (!p) return; act('limit', () => Net.setLimitWe(x, p.limitWe == null ? p.limit : null), p.limitWe == null ? 'Wochenende hat jetzt ein eigenes Limit' : 'Wochenende wie werktags'); };
A.bonus = (x) => { const [ id, m ] = x.split('|'); act('bonus' + id + m, () => Net.giveBonus(id, Number(m)), '+' + fmtMin(Number(m)).trim() + ' für heute – gleich wieder online'); };
A.bonusUndo = (x) => act('bonusUndo', () => Net.undoBonus(x), 'Bonus zurückgenommen');
A.useMode = (x) => { const [ k, m ] = x.split('|'); S.useMode[k] = m; renderSoft(); };
A.useSel = (x) => { const [ k, d ] = x.split('|'); S.useSel[k] = d; renderSoft(); };
A.inetAll = () => { S.inetAll = !S.inetAll; renderSoft(); };
A.limit = (x) => { const [ id, m ] = x.split('|'); act('limit', () => Net.setLimit(id, Number(m)), Number(m) ? 'Limit: ' + fmtMin(Number(m)) : 'Limit aus'); };
A.assignSheet = (x) => {
	const p = Net.profiles().find((q) => q.id === x);
	S.assign = { pid: x, macs: p.macs.slice() };
	openSheet(assignHtml());
};
function assignHtml() {
	const a = S.assign;
	const list = Net.devices.slice().sort((d1, d2) => (a.macs.includes(d2.mac) - a.macs.includes(d1.mac)) || d1.name.localeCompare(d2.name, 'de'));
	return '<h2>Geräte zuordnen</h2><div class="ph-card list" style="max-height:52vh;overflow:auto">' + list.map((d) => {
		const other = d.profile && d.profile !== a.pid ? Net.profiles().find((p) => p.id === d.profile) : null;
		return row(devIcon(d), devColor(d), d.name, (other ? 'jetzt bei ' + other.name + ' · ' : '') + (d.ip || d.mac), a.macs.includes(d.mac) ? icon('check', 20, 'var(--ok)') : '', 'assignToggle', d.mac);
	}).join('') + '</div><button class="ph-btn primary" data-a="assignSave">Speichern</button>';
}
A.assignToggle = (x) => {
	const a = S.assign;
	a.macs = a.macs.includes(x) ? a.macs.filter((m) => m !== x) : a.macs.concat([ x ]);
	const sc = document.querySelector('.ph-sheet .ph-card'); const top = sc ? sc.scrollTop : 0;
	S.sheet.html = assignHtml(); renderSheet();
	const sc2 = document.querySelector('.ph-sheet .ph-card'); if (sc2) sc2.scrollTop = top;
};
A.assignSave = () => {
	const a = S.assign;
	closeSheet();
	act('assign', () => Net.setProfileMacs(a.pid, a.macs), 'Geräte gespeichert');
};

/* Zeitpläne */
A.editSched = (x) => {
	let s;
	if (x.startsWith('new|')) s = { profile: x.slice(4), label: 'Schlafenszeit', start: '20:30', stop: '07:00', days: [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu' ], enabled: true };
	else s = Object.assign({}, Net.schedules().find((q) => q.id === x));
	S.sform = s;
	openSheet(schedHtml());
};
function schedHtml() {
	const s = S.sform;
	return `<h2>${s.id ? 'Zeitplan bearbeiten' : 'Neuer Zeitplan'}</h2>
		<div class="ph-chips">${[ 'Schlafenszeit', 'Hausaufgaben', 'Essenszeit', 'Schule' ].map((l) => `<button class="ph-chip${s.label === l ? ' on' : ''}" data-a="sLabel" data-x="${l}">${l}</button>`).join('')}</div>
		<label class="ph-field">Name<input id="sLabel" value="${attr(s.label)}"></label>
		<div class="ph-grid2"><label class="ph-field">Kein Internet ab<input type="time" id="sStart" value="${attr(s.start)}"></label><label class="ph-field">bis<input type="time" id="sStop" value="${attr(s.stop)}"></label></div>
		<div class="ph-chips">${DAYS.map((d) => `<button class="ph-chip${s.days.includes(d) ? ' on' : ''}" style="min-width:44px;padding:0 10px" data-a="sDay" data-x="${d}">${DAY_DE[d]}</button>`).join('')}</div>
		<div class="ph-hint">Geht der Zeitraum über Mitternacht, zählt der Starttag (z. B. So 20:30 bis Mo 7:00).</div>
		<button class="ph-btn primary" data-a="saveSched">Speichern</button>
		${s.id ? '<button class="ph-btn danger" data-a="delSched">Zeitplan löschen</button>' : '<button class="ph-btn" data-a="sheetClose">Abbrechen</button>'}`;
}
function readSched() {
	const s = S.sform;
	s.label = document.getElementById('sLabel').value.trim() || 'Zeitplan';
	s.start = document.getElementById('sStart').value || s.start;
	s.stop = document.getElementById('sStop').value || s.stop;
}
A.sLabel = (x) => { readSched(); S.sform.label = x; S.sheet.html = schedHtml(); renderSheet(); };
A.sDay = (x) => { readSched(); const s = S.sform; s.days = s.days.includes(x) ? s.days.filter((d) => d !== x) : s.days.concat([ x ]); S.sheet.html = schedHtml(); renderSheet(); };
A.saveSched = () => {
	readSched();
	const s = S.sform;
	if (!s.days.length) { toast('Mindestens einen Tag wählen', true); return; }
	if (s.start === s.stop) { toast('Start und Ende sind gleich', true); return; }
	closeSheet();
	act('sched', () => Net.saveSchedule(s), 'Zeitplan gespeichert');
};
A.delSched = () => { const id = S.sform.id; closeSheet(); act('sched', () => Net.deleteSchedule(id), 'Zeitplan gelöscht'); };
A.schedOn = (x) => { const s = Net.schedules().find((q) => q.id === x); s.enabled = !s.enabled; act('sched', () => Net.saveSchedule(s), s.enabled ? 'Zeitplan an' : 'Zeitplan aus'); };

/* WLAN */
A.wlan = (x) => {
	const w = Net.wlans().find((q) => q.ssid === x);
	const on = !w.on;
	const main = w.network === 'lan';
	if (!on && main) {
		openSheet(`<h2>„${esc(x)}“ ausschalten?</h2><div class="ph-hint">Alle Geräte in diesem WLAN – vielleicht auch dieses Handy – verlieren die Verbindung. Wieder einschalten geht dann nur per Kabel, über ein anderes WLAN oder die Weboberfläche.</div>
			<button class="ph-btn danger" data-a="wlanYes" data-x="${attr(x)}">Trotzdem ausschalten</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
		return;
	}
	setWlan(x, on, w.guest ? { offAt: 0 } : undefined);
};
A.wlanYes = (x) => { closeSheet(); setWlan(x, false); };
/* WLAN schalten: Schalter springt sofort um, die Router arbeiten im Hintergrund (alle gleichzeitig).
   Klappt es nicht, springt er zurück. */
function setWlan(ssid, on, opts, msg) {
	if (S.busy.wlan) return;
	const secs = Net.sections(Net.wireless, 'wifi-iface').filter((s) => s.ssid === ssid && s.mode === 'ap');
	const old = secs.map((s) => s.disabled);
	secs.forEach((s) => { s.disabled = on ? '0' : '1'; });
	S.busy.wlan = true; renderSoft();
	Net.setWlan(ssid, on, opts).then((errs) => {
		S.busy.wlan = false;
		if (errs.length === Net.routers.length) { secs.forEach((s, i) => { s.disabled = old[i]; }); toast('Nicht erreicht: ' + errs.join(', '), true); }
		else if (errs.length) toast('Nicht erreicht: ' + errs.join(', '), true);
		else toast(msg || ssid + (on ? ' eingeschaltet' : ' ausgeschaltet'));
		renderSoft();
		setTimeout(() => refresh(true), 4000);   // echten Stand nachladen, wenn das WLAN neu gestartet ist
	});
}
A.guestFor = (x) => {
	const g = Net.wlans().find((w) => w.guest);
	let off = 0;
	if (x === 'midnight') { const t = new Date(); t.setHours(23, 59, 0, 0); off = t.getTime(); } else if (Number(x)) off = Date.now() + Number(x) * 60000;
	setWlan(g.ssid, true, { offAt: off }, off ? 'Gäste-WLAN an bis ' + fmtTime(off) : 'Gäste-WLAN an');
};
A.shareGuest = () => {
	const g = Net.wlans().find((w) => w.guest);
	Plat.share('WLAN ' + g.ssid, 'WLAN: ' + g.ssid + (g.key ? '\nPasswort: ' + g.key : '')).then((ok) => { if (!ok) toast('Teilen nicht möglich'); });
};
A.night = () => {
	const n = Net.night();
	const on = !n.on;
	act('night', async () => { const e = await Net.setNight(on, n.start || '00:00', n.stop || '06:00'); if (e.length) throw new Error('Nicht erreicht: ' + e.join(', ')); }, on ? 'Nachtmodus an' : 'Nachtmodus aus');
};
A.nightSave = () => {
	const st = document.getElementById('nStart').value, sp = document.getElementById('nStop').value;
	if (!st || !sp || st === sp) { toast('Bitte zwei verschiedene Zeiten wählen', true); return; }
	act('night', async () => { const e = await Net.setNight(true, st, sp); if (e.length) throw new Error('Nicht erreicht: ' + e.join(', ')); }, 'Nachtmodus: ' + st + '–' + sp);
};

/* Backup (wie „Sicherung herunterladen“ in LuCI) */
async function backupRouter(r) {
	await r.call('system', 'board', {});   // Sitzung frisch halten
	const t = new Date(), day = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
	const name = 'backup-' + String(r.name || r.host).replace(/[^A-Za-z0-9._-]/g, '_') + '-' + day + '.tar.gz';
	return Plat.saveBackup(r.proto + '://' + r.host + '/cgi-bin/cgi-backup', r.sid, r.pin, name);
}
A.backup = (x) => { const r = Net.byId(x); act('backup' + r.id, () => backupRouter(r), (res) => (res && res.path ? 'Gespeichert: ' + res.path : 'Backup erstellt')); };
A.bkPick = async () => { try { S.bkFolder = await Plat.pickBackupFolder(); toast('Backups landen jetzt in „' + S.bkFolder + '“'); } catch (e) { /* abgebrochen */ } renderSoft(); };
A.bkReset = async () => { await Plat.resetBackupFolder(); S.bkFolder = ''; toast('Backups landen wieder in „Download“'); renderSoft(); };
A.backupAll = () => act('backupAll', async () => {
	let n = 0; const bad = [];
	for (const r of Net.routers) { if (!(Net.info[r.id] || {}).ok) { bad.push(r.name || r.host); continue; } try { await backupRouter(r); n++; } catch (e) { bad.push(r.name || r.host); } }
	if (!n) throw new Error('Kein Backup möglich' + (bad.length ? ' (' + bad.join(', ') + ')' : ''));
	return { n, bad };
}, (res) => res.n + (res.n === 1 ? ' Backup' : ' Backups') + ' gespeichert in „' + (S.bkFolder || 'Download') + '“' + (res.bad.length ? ' · nicht: ' + res.bad.join(', ') : ''));

/* WLAN-Kanäle */
A.chanBand = (x) => { S.chanBand = x; renderSoft(); };
A.chanRescan = () => chanScan(true);
function chanRadio(x) { const [ id, radio ] = x.split('|'); return ((Net.chan || {}).radios || []).find((y) => y.r.id === id && y.radio === radio); }
A.chanEdit = (x) => {
	const c = chanRadio(x);
	if (!c) return;
	S.chanEdit = { x, ch: c.cfgChannel === 'auto' ? 'auto' : c.channel, pw: c.txpower ? (c.txmax && c.txpower <= c.txmax - 10 ? 'low' : 'mid') : 'max' };
	chanSheet();
};
function chanSheet() {
	const e = S.chanEdit, c = chanRadio(e.x);
	const opts = c.band === '24' ? [ 1, 6, 11 ] : [ 36, 40, 44, 48, 52, 100, 116 ];
	if (c.channel && !opts.includes(c.channel)) opts.push(c.channel);
	opts.sort((a, b) => a - b);
	openSheet(`<h2>${esc(c.r.name || c.r.host)}</h2><div class="ph-sub">${c.band === '24' ? '2,4 GHz' : '5 GHz'} · jetzt Kanal ${c.channel || '–'}</div>
		${c.mesh ? '<div class="ph-hint">Auf diesem Funk läuft das Mesh. Ein anderer Kanal trennt das Mesh, wenn die anderen Mesh-Router nicht denselben Kanal haben.</div>' : ''}
		<div class="ph-h">KANAL</div><div class="ph-chips">${opts.map((o) => chip(String(e.ch) === String(o), 'chanPick', String(o), String(o))).join('')}${chip(e.ch === 'auto', 'chanPick', 'auto', 'Auto')}</div>
		${c.txmax ? `<div class="ph-h">SENDELEISTUNG</div><div class="ph-chips">${[ [ 'max', 'Maximal' ], [ 'mid', 'Mittel' ], [ 'low', 'Niedrig' ] ].map(([ k, l ]) => chip(e.pw === k, 'chanPower', k, l)).join('')}</div>` : ''}
		<div class="ph-hint">Beim Speichern startet das WLAN dieses Routers kurz neu (ca. 10 Sek.). Geräte verbinden sich von selbst wieder.</div>
		<button class="ph-btn primary" data-a="chanSave">Speichern</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
}
A.chanPick = (x) => { S.chanEdit.ch = x; chanSheet(); };
A.chanPower = (x) => { S.chanEdit.pw = x; chanSheet(); };
A.chanSave = () => {
	const e = S.chanEdit, c = chanRadio(e.x);
	closeSheet();
	const pw = e.pw === 'max' ? 'max' : Math.max(1, c.txmax - (e.pw === 'low' ? 12 : 6));
	act('chanSave', async () => { await Net.setRadio(c.r, c.radio, e.ch, pw); }, 'Gespeichert – WLAN von ' + (c.r.name || c.r.host) + ' startet kurz neu').then(() => setTimeout(() => chanScan(true), 15000));
};
A.chanAuto = () => {
	const plan = chanPlan().filter((p) => p.to !== p.x.channel);
	S.chanPlan = plan;
	openSheet(`<h2>Kanäle verteilen?</h2><div class="ph-card rows">${plan.map((p) => kv(p.x.r.name || p.x.r.host, 'Kanal ' + (p.x.channel || '–') + ' → <b>' + p.to + '</b>')).join('')}</div>
		<div class="ph-hint">Das 2,4-GHz-WLAN dieser Router startet nacheinander kurz neu. Smart-Home-Geräte verbinden sich von selbst wieder, das kann ein, zwei Minuten dauern.</div>
		<button class="ph-btn primary" data-a="chanAutoYes">Übernehmen</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
};
A.chanAutoYes = () => {
	closeSheet();
	const plan = S.chanPlan || [];
	act('chanAuto', async () => { for (const p of plan) await Net.setRadio(p.x.r, p.x.radio, p.to, null); return plan.length; },
		(n) => n + ' Router umgestellt').then(() => setTimeout(() => chanScan(true), 20000));
};

/* Router */
A.reboot = (x) => {
	const r = Net.byId(x);
	openSheet(`<h2>${esc(r.name)} neu starten?</h2><div class="ph-hint">${r === Net.master ? 'Das ganze Netz und das Internet sind ca. 2 Minuten weg.' : 'Geräte an diesem Router wechseln kurz zu einem anderen.'}</div>
		<button class="ph-btn danger" data-a="rebootYes" data-x="${x}">Neu starten</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
};
A.agentInstall = () => act('agent', () => Net.agentInstall(), 'Tageslimit ist eingerichtet');
/* ein einzelner Router */
const rightsRun = (r, fn, ok) => act('rights', async () => { S.rightsAt = r.id; renderSoft(); try { await fn(r); } finally { S.rightsAt = null; } }, ok);
A.rightsOne = (x) => { const r = Net.byId(x); if (r) rightsRun(r, (y) => Net.rightsInstall(y), 'Rechte-Paket auf ' + (r.name || r.host) + ' installiert'); };
A.rightsOneRm = (x) => {
	const r = Net.byId(x), i = r && Net.info[r.id];
	if (!r) return;
	openSheet(`<h2>Rechte-Paket von ${esc(r.name || r.host)} entfernen?</h2><div class="ph-hint">${i && i.rightsSsh ? 'Die Rechte bleiben über die SSH-Datei erhalten.' : 'Auf diesem Router fehlen danach die WLAN-Liste, „Kabelgerät online“ und die Temperatur.'}</div>
	<button class="ph-btn danger" data-a="rightsOneRmYes" data-x="${attr(x)}">Entfernen</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
};
A.rightsOneRmYes = (x) => { closeSheet(); const r = Net.byId(x); if (r) rightsRun(r, (y) => Net.rightsRemove(y), 'Rechte-Paket von ' + (r.name || r.host) + ' entfernt'); };
A.rightsRemove = () => {
	const n = Net.routers.filter((r) => { const i = Net.info[r.id]; return i && i.ok && i.rightsPkg; }).length;
	openSheet(`<h2>Rechte-Paket entfernen?</h2><div class="ph-hint">„phantom-rights“ wird von ${n} ${n === 1 ? 'Router' : 'Routern'} entfernt.</div><div class="ph-hint">Wo die Rechte nicht zusätzlich per SSH oder Firmware da sind, fehlen danach die WLAN-Liste, „Kabelgerät online“ und die Temperatur.</div>
	<button class="ph-btn danger" data-a="rightsRemoveYes">Entfernen</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
};
A.rightsRemoveYes = () => { closeSheet(); act('rights', async () => {
	const todo = Net.routers.filter((r) => { const i = Net.info[r.id]; return i && i.ok && i.rightsPkg; });
	const bad = [];
	for (const r of todo) {
		S.rightsAt = r.id; renderSoft();
		try { await Net.rightsRemove(r); } catch (e) { bad.push((r.name || r.host) + ': ' + (e.message || e)); }
	}
	S.rightsAt = null;
	if (bad.length) throw new Error('Nicht entfernt – ' + bad.join(' · '));
	return todo.length;
}, (n) => n === 1 ? 'Paket von 1 Router entfernt' : 'Paket von ' + n + ' Routern entfernt'); };
/* Rechte-Paket auf jedem erreichbaren Router ohne Paket, nacheinander */
A.rightsInstall = () => act('rights', async () => {
	const todo = Net.routers.filter((r) => { const i = Net.info[r.id]; return i && i.ok && !i.rightsPkg; });
	const bad = [];
	for (const r of todo) {
		S.rightsAt = r.id; renderSoft();
		try { await Net.rightsInstall(r); } catch (e) { bad.push((r.name || r.host) + ': ' + (e.message || e)); }
	}
	S.rightsAt = null;
	if (bad.length) throw new Error('Nicht eingerichtet – ' + bad.join(' · '));
	return todo.length;
}, (n) => n === 1 ? 'Rechte auf 1 Router eingerichtet' : 'Rechte auf ' + n + ' Routern eingerichtet');
A.agentRemove = () => openSheet(`<h2>Tageslimit-Zähler entfernen?</h2><div class="ph-hint">Tageslimits zählen dann nicht mehr, aktive Limit-Sperren werden aufgehoben. Profile, Pausen und Zeitpläne bleiben.</div>
	<button class="ph-btn danger" data-a="agentRemoveYes">Entfernen</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
A.agentRemoveYes = () => { closeSheet(); act('agent', () => Net.agentRemove(), 'Tageslimit-Zähler entfernt'); };
A.rebootYes = (x) => { closeSheet(); const r = Net.byId(x); act('reboot', () => Net.reboot(r), r.name + ' startet neu …'); };
A.cudyMenu = (x) => {
	const r = Net.byId(x);
	openSheet(`<h2>${esc(r.name || r.host)}</h2>
		<div class="ph-card rows">${kv('Adresse', '<span class="mono">' + esc(r.host) + '</span>')}${kv('Verbindung', r.proto.toUpperCase())}${kv('Rolle', r === Net.master ? 'Master' : 'Access Point')}</div>
		<button class="ph-btn" data-a="cudyOpen" data-x="${x}">Details ansehen</button>
		<button class="ph-btn cyan" data-a="pwSheet" data-x="${x}">Passwort eingeben</button>
		<button class="ph-btn" data-a="hostSheet" data-x="${x}">Adresse ändern</button>
		${r === Net.master ? '' : `<button class="ph-btn danger" data-a="delCudy" data-x="${x}">Aus der App entfernen</button>`}`);
};
A.cudyOpen = (x) => { closeSheet(); push({ v: 'cudy', id: x }); };
A.pwSheet = (x) => {
	const r = Net.byId(x);
	openSheet(`<h2>Passwort für ${esc(r.name || r.host)}</h2><label class="ph-field">Passwort (root)<input id="cPw" type="password"></label>
		<button class="ph-btn primary" data-a="pwSave" data-x="${x}">Anmelden</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
	setTimeout(() => { const i = document.getElementById('cPw'); if (i) i.focus(); }, 50);
};
A.pwSave = async (x) => {
	const r = Net.byId(x), pw = document.getElementById('cPw').value;
	closeSheet();
	await act('pw', async () => {
		try { await loginRoot(r, pw); } catch (e) {
			if (e.needTrust) { trustSheet(r, e.fingerprint, () => A.pwSaveRetry(r, pw)); throw new Error('Bitte Zertifikat bestätigen'); }
			throw new Error('Anmeldung bei ' + r.name + ' fehlgeschlagen');
		}
		S.rootPw = S.rootPw || pw;
		await saveRouters();
		await Net.loadCudy(r); Net.buildDevices();
	}, 'Angemeldet bei ' + r.name);
};
A.pwSaveRetry = async (r, pw) => { await act('pw', async () => { await loginRoot(r, pw); await saveRouters(); await Net.loadCudy(r); Net.buildDevices(); }, 'Angemeldet'); };
A.hostSheet = (x) => {
	const r = Net.byId(x);
	openSheet(`<h2>Adresse ändern</h2><label class="ph-field">IP-Adresse oder Name<input id="cHost" value="${attr(r.host)}" autocapitalize="off" spellcheck="false"></label>
		<button class="ph-btn primary" data-a="hostSave" data-x="${x}">Speichern</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
};
A.hostSave = async (x) => { const r = Net.byId(x); r.host = document.getElementById('cHost').value.trim() || r.host; r.sid = null; closeSheet(); await saveRouters(); refresh(); };
A.delCudy = async (x) => {
	closeSheet();
	await Plat.setSecret('pw.' + x, null);
	Net.routers = Net.routers.filter((r) => r.id !== x);
	delete Net.info[x];
	await saveRouters(); Net.buildDevices(); renderSoft();
	toast('Entfernt');
};
A.rescan = () => act('rescan', async () => {
	const found = await relocate();
	const n = (await addDiscovered(S.rootPw)) + (await scanAndAdd());
	if (n) await refresh(true);
	return { found: found.length, n };
}, (r) => (r.n ? r.n + (r.n === 1 ? ' Router neu hinzugefügt' : ' Router neu hinzugefügt') : 'Keine neuen Router gefunden'));
A.addCudy = () => {
	S.addProto = defProto();
	openSheet(`<h2>Router von Hand hinzufügen</h2>
		<label class="ph-field">IP-Adresse oder Name<input id="aHost" placeholder="z. B. 192.168.1.2" autocapitalize="off" spellcheck="false"></label>
		${S.allowHttp ? `<div class="ph-chips" id="aProto">${chip(S.addProto === 'https', 'aProto', 'https', 'HTTPS')}${chip(S.addProto === 'http', 'aProto', 'http', 'HTTP')}</div>` : ''}
		<label class="ph-field">Passwort (leer = wie Master)<input id="aPw" type="password"></label>
		<button class="ph-btn primary" data-a="addCudyYes">Hinzufügen</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
};
A.aProto = (x, el) => { S.addProto = x; document.querySelectorAll('#aProto .ph-chip').forEach((b) => b.classList.toggle('on', b === el)); };
A.addCudyYes = async () => {
	const host = document.getElementById('aHost').value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
	let pw = document.getElementById('aPw').value;
	if (!host) { toast('Adresse fehlt', true); return; }
	if (Net.routers.some((r) => r.host === host)) { toast('Diesen Router gibt es schon', true); return; }
	closeSheet();
	if (!pw) pw = S.rootPw || await Plat.getSecret('pw.' + Net.master.id);
	const r = new Router({ id: uid(), host, proto: S.addProto, role: 'ap' });
	await act('add', async () => {
		try { await loginRoot(r, pw); } catch (e) {
			if (e.needTrust) { Net.routers.push(r); await saveRouters(); trustSheet(r, e.fingerprint, () => A.pwSaveRetry(r, pw)); throw new Error('Bitte Zertifikat bestätigen'); }
			throw new Error('Anmeldung bei ' + host + ' fehlgeschlagen');
		}
		const b = await r.call('system', 'board', {});
		r.name = b.hostname || host; r.model = b.model || '';
		Net.routers.push(r);
		await saveRouters();
		await Net.loadCudy(r); Net.buildDevices();
	}, 'Router hinzugefügt');
};
A.setProto = async (x) => {
	const [ id, p ] = x.split('|');
	const r = Net.byId(id);
	r.proto = p; r.sid = null;
	await saveRouters();
	act('proto', async () => {
		try { await r.relogin(); } catch (e) {
			if (e.needTrust) { trustSheet(r, e.fingerprint, () => act('proto', () => r.relogin(), 'HTTPS aktiv')); throw new Error('Bitte Zertifikat bestätigen'); }
			throw new Error(e.message + (p === 'https' ? ' – ist luci-ssl auf dem Router?' : ''));
		}
	}, r.name + ': ' + p.toUpperCase());
};
A.allowHttp = async () => { S.allowHttp = !S.allowHttp; await Plat.setPref('allowHttp', S.allowHttp); renderSoft(); };
A.allHttps = () => act('allHttps', async () => {
	const bad = [];
	for (const r of Net.routers.filter((x) => x.proto !== 'https')) {
		r.proto = 'https'; r.sid = null;
		try { await r.relogin(); } catch (e) { r.proto = 'http'; r.sid = null; bad.push(r.name || r.host); }
	}
	await saveRouters();
	syncRunner().catch(() => {});
	if (bad.length) throw new Error('Kein HTTPS bei: ' + bad.join(', ') + ' – ist luci-ssl installiert?');
}, 'Alle Router laufen jetzt über HTTPS');
A.lockLater = async () => { S.lock.asked = true; await lockSaveState(); if (S.stack.length && view().v === 'lockSetup') back(); else renderSoft(); };
A.lockSave = () => {
	// Felder vor dem Neuzeichnen lesen
	const user = document.getElementById('lkUser').value.trim(), pw = document.getElementById('lkPw').value, pw2 = document.getElementById('lkPw2').value;
	const fpEl = document.getElementById('lkFp');
	const fp = !!(fpEl && fpEl.checked);
	// Prüfen, ohne das Formular neu zu zeichnen (Eingaben bleiben stehen)
	const err = !user ? 'Bitte einen Benutzernamen eingeben' : pw.length < 4 ? 'Das Passwort braucht mindestens 4 Zeichen' : pw !== pw2 ? 'Die Passwörter sind nicht gleich' : '';
	if (err) { toast(err, true); return; }
	return A.lockSaveRun(user, pw, fp);
};
A.lockSaveRun = (user, pw, fp) => act('lockSave', async () => {
	if (fp && !S.lock.fp) await Plat.biometric('Fingerabdruck bestätigen', 'Damit entsperrst du künftig die App');
	await Plat.setSecret('applock', JSON.stringify(await Plat.hashPw(pw)));
	S.lock = Object.assign({}, S.lock, { on: true, user, fp, asked: true });
	await lockSaveState();
	S.stack = S.stack.filter((v) => v.v !== 'lockSetup');
	if (!S.stack.some((v) => v.v === 'security')) S.stack.push({ v: 'security' });
}, 'App-Login gespeichert');
A.lockOff = () => openSheet(`<h2>App-Login entfernen?</h2><div class="ph-hint">Die App öffnet sich dann wieder ohne Nachfrage.</div>
	<button class="ph-btn danger" data-a="lockOffYes">Entfernen</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
A.lockOffYes = async () => { closeSheet(); await Plat.setSecret('applock', null); S.lock = Object.assign({}, S.lock, { on: false, fp: false, asked: true }); await lockSaveState(); toast('App-Login entfernt'); renderSoft(); };
A.lockFp = async () => {
	try { if (!S.lock.fp) await Plat.biometric('Fingerabdruck bestätigen', 'Damit entsperrst du künftig die App'); } catch (e) { toast('Fingerabdruck nicht bestätigt', true); return; }
	S.lock.fp = !S.lock.fp; await lockSaveState(); renderSoft();
};
A.lockDelay = async (x) => { S.lock.delay = Number(x); await lockSaveState(); renderSoft(); };
A.unlockBio = async () => {
	try { await Plat.biometric('Phantom Network entsperren', S.lock.user ? 'Hallo ' + S.lock.user : ''); unlockDone(); } catch (e) { /* abgebrochen: Passwort geht weiter */ }
};
A.unlock = async () => {
	const el = document.getElementById('ulPw'); const pw = el ? el.value : '';
	if (!pw) { S.unlockErr = 'Bitte Passwort eingeben'; render(); return; }
	let ok = false;
	if (S.unlockRouter) {
		const m = Net.master; ok = !!m && pw === await Plat.getSecret('pw.' + m.id);
	} else {
		try { const st = JSON.parse(await Plat.getSecret('applock') || 'null'); ok = !!st && (await Plat.hashPw(pw, st.salt, st.iter)).hash === st.hash; } catch (e) { ok = false; }
	}
	if (!ok) { S.unlockErr = S.unlockRouter ? 'Router-Passwort stimmt nicht' : 'Passwort stimmt nicht'; render(); return; }
	unlockDone();
};
A.unlockForgot = () => { S.unlockRouter = !S.unlockRouter; S.unlockErr = ''; render(); };
A.forgetPin = async (x) => { const r = Net.byId(x); r.pin = ''; r.sid = null; await saveRouters(); renderSoft(); };

/* SSH-Block (Router-Rechte) kopieren/teilen */
A.copyHelper = async () => {
	const txt = window.PHANTOM_HELPER || '';
	try { await navigator.clipboard.writeText(txt); toast('Kopiert – jetzt in die SSH-Sitzung einfügen'); return; } catch (e) { /* Ersatzweg */ }
	const t = document.createElement('textarea'); t.value = txt; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
	const ok = document.execCommand('copy'); t.remove();
	toast(ok ? 'Kopiert – jetzt in die SSH-Sitzung einfügen' : 'Kopieren nicht möglich – bitte „Teilen“ nutzen', !ok);
};
A.shareHelper = () => Plat.share('Router-Rechte (SSH)', window.PHANTOM_HELPER || '').then((ok) => { if (!ok) A.copyHelper(); });

/* Darstellung */
A.lang = async (x) => { S.lang = x; I18N.set(x); await Plat.setPref('lang', x); render(); syncRunner().catch(() => {}); };
A.theme = async (x) => { S.theme = x; applyTheme(); await Plat.setPref('theme', x); renderSoft(); };

/* Netz-Check */
A.chkHost = (x) => { S.check.host = x; const i = document.getElementById('chkHost'); if (i) i.value = x; };
async function runCheck(kind) {
	const host = (document.getElementById('chkHost').value || '').trim();
	if (!/^[A-Za-z0-9.:-]+$/.test(host)) { toast('Ungültiges Ziel', true); return; }
	S.check.host = host; S.check.busy = true; S.check.out = ''; renderSoft();
	try {
		const r = kind === 'ping' ? await Net.ping(host) : await Net.trace(host);
		S.check.out = ((r.stdout || '') + (r.stderr ? '\n' + r.stderr : '')).trim() || 'Keine Antwort (Code ' + r.code + ')';
	} catch (e) { S.check.out = 'Fehler: ' + e.message; }
	S.check.busy = false; renderSoft();
}
A.ping = () => runCheck('ping');
A.trace = () => runCheck('trace');
A.speedRun = () => speedRun();

/* Benachrichtigungen */
async function syncRunner() {
	const n = S.notify, m = Net.master;
	if (!n.on || !m) { await Plat.checkConfig({ on: false }); return; }
	// das Passwort selbst bleibt im verschlüsselten Speicher – der Job bekommt nur den Schlüsselnamen
	// gleiches Protokoll wie in der App (HTTP oder HTTPS mit bestätigtem Zertifikat)
	await Plat.checkConfig({ on: true, url: m.url, pin: m.pin || '', user: m.user, secretKey: 'phantom.pw.' + m.id, kinds: n.kinds, lock: !!S.lock.on, lang: I18N.lang,
		others: Net.others().map((r) => ({ name: r.name, url: r.url, pin: r.pin || '' })),
		// Firmware: installierte Versionen (für die Update-Meldung im Hintergrund)
		routers: Net.routers.map((r) => ({ name: r.name || r.host, version: Net.fwInstalled(r) })).filter((x) => x.version) });
}
A.notifyOn = async () => {
	const n = S.notify;
	if (!n.on) {
		const ok = await Plat.notifyPermission();
		if (!ok) { toast(Plat.native ? 'Benachrichtigungen sind in Android nicht erlaubt' : 'Nur in der Android-App', true); return; }
	}
	n.on = !n.on;
	await Plat.setPref('notify', n);
	await syncRunner();
	renderSoft();
};
A.notifyKind = async (x) => {
	const n = S.notify;
	n.kinds = n.kinds.includes(x) ? n.kinds.filter((k) => k !== x) : n.kinds.concat([ x ]);
	await Plat.setPref('notify', n); await syncRunner(); renderSoft();
};
A.notifyTest = async () => {
	if (!(await Plat.notifyPermission())) { toast('Benachrichtigungen nicht erlaubt', true); return; }
	await Plat.notify('Phantom Network', I18N.t('So sehen Benachrichtigungen aus 👻'));
	if (S.notify.on) { await syncRunner(); await Plat.checkNow(); toast('Prüfe jetzt einmal im Hintergrund …'); }
};

/* VPN */
A.vpn = () => {
	const v = Net.vpn();
	if (!v.on) {
		openSheet(`<h2>VPN-Server einschalten?</h2><div class="ph-hint">WireGuard „${esc(v.iface)}“ startet und Port ${esc(v.port)} wird ${v.rule ? 'in der Firewall geöffnet' : 'genutzt (keine passende Firewall-Regel gefunden – bitte prüfen)'}. Der Server bleibt an, bis du ihn wieder ausschaltest.</div>
			<button class="ph-btn primary" data-a="vpnYes" data-x="1">Einschalten</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
		return;
	}
	act('vpn', () => Net.setVpn(false), 'VPN aus');
};
A.wgPhone = async () => {
	const inp = document.getElementById('wgTunnel');
	const tunnel = ((inp && inp.value) || S.wgTunnel || '').trim();
	if (!tunnel) { toast('Bitte den Namen des Tunnels aus der WireGuard-App eintragen', true); if (inp) inp.focus(); return; }
	// WireGuard erlaubt nur diese Zeichen, max. 15 – Leerzeichen gibt es dort nie
	if (!/^[a-zA-Z0-9_=+.-]{1,15}$/.test(tunnel)) { toast('So kann der Tunnel in WireGuard nicht heißen (keine Leerzeichen, max. 15 Zeichen). Bitte den Namen genau aus der WireGuard-Liste abschreiben.', true); if (inp) inp.focus(); return; }
	if (tunnel !== S.wgTunnel) { S.wgTunnel = tunnel; await Plat.setPref('wgTunnel', tunnel); }
	const up = !(S.wg && S.wg.vpn);
	try {
		if (!(S.wg && S.wg.allowed) && !(await Plat.wgPermission())) { toast('Ohne Erlaubnis kann die App WireGuard nicht schalten', true); return; }
		await Plat.wgSet(tunnel, up);
	} catch (e) { toast('WireGuard: ' + e.message, true); return; }
	toast(up ? 'VPN wird verbunden …' : 'VPN wird getrennt …');
	// WireGuard braucht einen Moment – danach Status neu lesen
	for (const ms of [ 1500, 3000 ]) setTimeout(() => { S.wgAt = 0; wgRefresh(); }, ms);
	setTimeout(() => { if (S.wg && S.wg.vpn !== up) toast(up ? 'Nicht verbunden – stimmt der Tunnel-Name? Ist „Allow remote control apps“ in WireGuard an?' : 'VPN läuft noch', true); }, 4500);
};

A.vpnYes = () => { closeSheet(); act('vpn', () => Net.setVpn(true), 'VPN an'); };
A.addPeer = async () => {
	const name = (document.getElementById('vpnName').value || '').trim() || 'Handy';
	const ep = (document.getElementById('vpnEp').value || '').trim();
	const full = document.getElementById('vpnFull').checked;
	if (!ep) { toast('Bitte die Adresse von außen eintragen', true); return; }
	let conf = '';
	await act('peer', async () => {
		await Net.setVpnEndpoint(ep); S.vpnEp = ep;
		conf = await Net.addVpnPeer(name, ep, full);
	}, 'Zugang erstellt');
	if (conf) {
		S.vpnConf = conf;
		openSheet(`<h2>${esc(name)}</h2><div class="ph-qr">${qrSvg(conf)}<b>Mit der WireGuard-App scannen</b><small>„+“ → „QR-Code scannen“</small></div>
			<button class="ph-btn cyan" data-a="shareConf">${icon('share', 18)}&nbsp; Als Text teilen</button>
			<div class="ph-hint">Der private Schlüssel steht in diesem Code – nur auf dem eigenen Gerät scannen.</div>
			<button class="ph-btn" data-a="sheetClose">Fertig</button>`);
	}
};
A.shareConf = () => Plat.share('WireGuard', S.vpnConf || '');
A.delPeer = (x) => {
	openSheet(`<h2>Zugang löschen?</h2><div class="ph-hint">Das Gerät kann sich danach nicht mehr verbinden.</div>
		<button class="ph-btn danger" data-a="delPeerYes" data-x="${attr(x)}">Löschen</button><button class="ph-btn" data-a="sheetClose">Abbrechen</button>`);
};
A.delPeerYes = (x) => { closeSheet(); act('peer', () => Net.removeVpnPeer(x), 'Zugang gelöscht'); };

/* ================= Ereignisse ================= */
document.addEventListener('click', (ev) => {
	const el = ev.target.closest('[data-a]');
	if (!el || el.disabled) return;
	const fn = A[el.dataset.a];
	if (!fn) return;
	if (el.dataset.a !== 'sheetBg') ev.preventDefault();
	fn(el.dataset.x || '', el, ev);
});
document.addEventListener('input', (ev) => {
	const k = ev.target.dataset && ev.target.dataset.in;
	if (k === 'devSearch') {
		S.devSearch = ev.target.value;
		const box = document.querySelector('[data-list=dev]');
		if (box) { box.innerHTML = devListHtml(); I18N.dom(box); }
	}
});
document.addEventListener('keydown', (ev) => {
	if (ev.key === 'Enter' && ev.target.closest && ev.target.closest('form[data-f=login]')) { ev.preventDefault(); doLogin(); }
	if (ev.key === 'Enter' && ev.target.closest && ev.target.closest('form[data-f=unlock]')) { ev.preventDefault(); A.unlock(); }
});
if (window.matchMedia) matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (S.theme === 'auto') applyTheme(); });

/* Hintergrund-Check mit aktuellen Daten versorgen, sobald angemeldet */
const _origRefresh = refresh;
let runnerSynced = false;
refresh = async function (q) { await _origRefresh(q); if (!runnerSynced && S.notify.on) { runnerSynced = true; syncRunner(); } };

start();
