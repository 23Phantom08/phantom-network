// Phantom-Agent – Tageslimit und Nutzungszeit für die Phantom-Network-App
// Läuft als Dienst auf dem Master (dem Router mit Internet) und braucht nur,
// was OpenWrt schon mitbringt: ucode, uci, Firewall (fw4) und die
// Verbindungszähler des Kernels (/proc/net/nf_conntrack).
//
//  - zählt jede Minute die Datenmenge je Gerät (MAC-Adresse)
//  - eine Minute zählt als „genutzt“, wenn ein Gerät darin mehr als
//    min_bytes (Standard 20 kB) übertragen hat
//  - Profile und Limits legt die App in der Firewall an
//    (Regel phantom_ppause_<id>: Geräte in src_mac, Limit in phantom_limit,
//     am Wochenende phantom_limit_we, Bonus für heute phantom_bonus + phantom_bonus_day)
//  - Limit erreicht → Regel phantom_limit_<id> an, laufende Verbindungen trennen
//  - um Mitternacht: Zähler auf null, Limit-Sperren wieder aus
//  - wird ein Gerät pausiert (App, Zeitplan, Limit), trennt der Agent
//    zusätzlich dessen laufende Verbindungen – so wirkt die Pause sofort
'use strict';

import * as fs from 'fs';
import * as uloop from 'uloop';
import { cursor } from 'uci';

const VERSION = '1.1.0';

// Nur für Tests: Eingaben aus Dateien statt aus dem Kernel
const TEST = getenv('PHANTOM_TEST');
const CT = TEST ? TEST + '/nf_conntrack' : '/proc/net/nf_conntrack';
const ARP = TEST ? TEST + '/arp' : '/proc/net/arp';

const STATE = '/tmp/phantom';
const PERSIST = '/etc/phantom';
const TODAY = STATE + '/today.json';
const SAVED = PERSIST + '/agent-state.json';
const USAGE = PERSIST + '/usage.json';
const EVENTS = PERSIST + '/events.log';
const NOMAC = '00:00:00:00:00:00';
const DAYS = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];

fs.mkdir(STATE);
fs.mkdir(PERSIST);

/* ---------- kleine Helfer ---------- */
function now() {
	const t = TEST ? fs.readfile(TEST + '/now') : null;
	return t ? +trim(t) : time();
}

function sh(cmd) {
	if (TEST) return fs.readfile(TEST + '/' + replace(cmd, /[^a-z0-9]+/g, '_')) ?? '';
	const p = fs.popen(cmd, 'r');
	if (!p) return '';
	const out = p.read('all') ?? '';
	p.close();
	return out;
}

function readjson(path, dflt) {
	const s = fs.readfile(path);
	if (!s) return dflt;
	try { return json(s) ?? dflt; } catch (e) { return dflt; }
}

function writejson(path, obj) {
	fs.writefile(path + '.new', sprintf('%J', obj));
	fs.rename(path + '.new', path);
}

function list(v) {
	if (type(v) == 'array') return v;
	return v ? split(trim(v), /\s+/) : [];
}

function clock(t) {
	const l = localtime(t);
	return {
		day: sprintf('%04d-%02d-%02d', l.year, l.mon, l.mday),
		hm: sprintf('%02d:%02d:%02d', l.hour, l.min, l.sec),
		wd: DAYS[l.wday % 7]   // ucode: Montag = 1 … Sonntag = 7
	};
}

function event(kind, text) {
	const f = fs.open(EVENTS, 'a');
	if (f) { f.write(sprintf('%d|%s|%s\n', now(), kind, replace(text, /[|\n]/g, ' '))); f.close(); }
	const lines = split(trim(fs.readfile(EVENTS) ?? ''), '\n');
	if (length(lines) > 300)
		fs.writefile(EVENTS, join('\n', slice(lines, -200)) + '\n');
}

/* IPv6 einheitlich schreiben (der Kernel schreibt 2001:0db8:0000:…, „ip“ schreibt 2001:db8::) */
function ip6full(a) {
	a = lc(a);
	if (index(a, '.') >= 0) return a;      // ::ffff:1.2.3.4 – kommt hier nicht vor
	const parts = split(a, '::');
	const head = parts[0] != '' ? split(parts[0], ':') : [];
	const tail = length(parts) > 1 && parts[1] != '' ? split(parts[1], ':') : [];
	const g = [ ...head ];
	if (length(parts) > 1)
		for (let i = length(head) + length(tail); i < 8; i++) push(g, '0');
	push(g, ...tail);
	return join(':', map(g, (x) => substr('0000' + x, -4)));
}

function normip(a) {
	return index(a, ':') >= 0 ? ip6full(a) : a;
}

/* ---------- Netzwerk-Infos ---------- */

// eigene Adressen des Routers (Verkehr dorthin – DNS, Weboberfläche – zählt nicht)
function own_addrs() {
	const own = {};
	for (let l in split(sh('ip -o addr show'), '\n')) {
		const m = match(l, /inet6? ([0-9a-fA-F:.]+)\//);
		if (m) own[normip(m[1])] = true;
	}
	return own;
}

// IP → MAC: IPv4 aus /proc/net/arp, IPv6 aus der Nachbartabelle
function neighbours() {
	const out = {};
	// IP  HW-Typ  Flags  MAC  Maske  Gerät (Flags 0x0 = unvollständig)
	for (let l in split(fs.readfile(ARP) ?? '', '\n')) {
		const m = match(l, /^([0-9.]+)\s+\S+\s+(0x[0-9a-f]+)\s+([0-9a-fA-F:]{17})/);
		if (m && m[2] != '0x0' && lc(m[3]) != NOMAC) out[m[1]] = lc(m[3]);
	}
	for (let l in split(sh('ip -6 neigh show'), '\n')) {
		const m = match(l, /^([0-9a-fA-F:]+) dev \S+ lladdr ([0-9a-fA-F:]{17})/);
		if (m && lc(m[2]) != NOMAC) out[ip6full(m[1])] = lc(m[2]);
	}
	return out;
}

function local_dst(ip) {
	return match(ip, /^(127\.|22[4-9]\.|23[0-9]\.|255\.255\.255\.255)/) || match(ip, /^(fe[89ab]|ff)/);
}

// Verbindungen der Geräte im Heimnetz: Schlüssel → { src, dst, bytes (beide Richtungen) }
// (der Kernel schreibt IPv6 schon in voller Form – passt direkt zu neighbours())
function connections(neigh) {
	const out = {};
	const txt = fs.readfile(CT);
	if (txt == null) return null;
	for (let l in split(txt, '\n')) {
		const s0 = match(l, /src=([0-9a-fA-F:.]+)/);
		if (!s0 || !neigh[s0[1]]) continue;      // nicht von einem Gerät mit bekannter MAC
		const f = split(trim(l), /\s+/);
		let key = f[0] + ' ' + f[2], src = null, dst = null, bytes = 0, orig = true, acct = false;
		for (let i = 3; i < length(f); i++) {
			const t = f[i];
			if (substr(t, 0, 4) == 'src=') {
				if (src != null) orig = false;
				else src = substr(t, 4);
			}
			else if (substr(t, 0, 4) == 'dst=') {
				if (dst == null) dst = substr(t, 4);
			}
			else if (substr(t, 0, 6) == 'bytes=') {
				bytes += +substr(t, 6); acct = true;
				continue;
			}
			if (orig && index(t, '=') > 0 && substr(t, 0, 8) != 'packets=')
				key += ' ' + t;
		}
		if (src && dst && acct) out[key] = { src, dst: normip(dst), bytes };
	}
	return out;
}

/* ---------- Firewall-Regeln der App ---------- */

function rules(ctx) {
	const all = [];
	ctx.foreach('firewall', 'rule', (r) => { push(all, r); });
	return all;
}

function macs_of(r) {
	return filter(map(list(r.src_mac), lc), (m) => m != NOMAC && match(m, /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/));
}

// Zeitplan gerade aktiv? (gleiche Logik wie fw4: Wochentage + Start/Stop in Ortszeit)
function sched_active(r, c) {
	const days = list(r.weekdays);
	if (length(days) && index(days, c.wd) < 0) return false;
	let a = r.start_time ?? '00:00:00', b = r.stop_time ?? '23:59:59';
	if (length(a) == 5) a += ':00';
	if (length(b) == 5) b += ':59';
	return c.hm >= a && c.hm <= b;
}

// alle Geräte, die gerade gesperrt sind (Pause, Profil-Pause, Tageslimit, Zeitplan)
function blocked_macs(all, c) {
	const out = {};
	for (let r in all) {
		const n = r['.name'];
		if (r.enabled == '0' || r.target != 'REJECT' && r.target != 'DROP') continue;
		const on = match(n, /^(block_|phantom_ppause_|phantom_limit_)/) ? true
			: match(n, /^phantom_sched_/) ? sched_active(r, c) : false;
		if (on) for (let m in macs_of(r)) out[m] = true;
	}
	return out;
}

let cut_log = [];

/* laufende Verbindungen eines Geräts trennen (OpenWrt-Kernel: Adresse nach /proc/net/nf_conntrack schreiben) */
function cut(mac, neigh) {
	for (let ip, m in neigh) {
		if (m != mac) continue;
		// nur gültige Adressen schreiben – ein leerer Wert würde ALLE Verbindungen trennen
		if (!match(ip, /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/) && !match(ip, /^[0-9a-f:]+$/)) continue;
		if (TEST) { push(cut_log, ip); continue; }
		fs.writefile('/proc/net/nf_conntrack', ip + '\n');
	}
}

function fw_reload() {
	if (!TEST) system('/etc/init.d/firewall reload >/dev/null 2>&1');
}

// Limit eines Profils für heute: Wochenende eigenes Limit, plus Bonus von heute
function limit_today(r, c) {
	const we = (c.wd == 'Sat' || c.wd == 'Sun') && r.phantom_limit_we != null && r.phantom_limit_we != '';
	let limit = +((we ? r.phantom_limit_we : r.phantom_limit) ?? 0) || 0;
	if (limit > 0 && r.phantom_bonus_day == c.day) limit += +(r.phantom_bonus ?? 0) || 0;
	return limit;
}

/* ---------- Zustand ---------- */

let st = null;            // { day, bytes:{mac}, mmin:{mac}, prof:{id} }
let prev = null;          // letzte Zählerstände je Verbindung
let blocked = null;       // gesperrte Geräte beim letzten Durchlauf
let saved_at = 0, dirty = false;
let recut = {};           // neu gesperrt: beim nächsten Durchlauf noch einmal trennen
let last_dst = null;      // Sommer-/Winterzeit

function fresh(day) { return { day, bytes: {}, mmin: {}, prof: {}, lim: {} }; }

function save(force) {
	if (!dirty || (!force && now() - saved_at < 900)) return;
	writejson(SAVED, st);
	saved_at = now(); dirty = false;
}

function load(day) {
	const s = readjson(SAVED, null);
	st = s && s.day ? s : fresh(day);
	for (let k in [ 'bytes', 'mmin', 'prof', 'lim' ]) st[k] ??= {};
}

// neuer Tag: Verbrauch von gestern in den Verlauf, Zähler und Limit-Sperren zurücksetzen
function new_day(day, ctx, all) {
	if (st && st.day) {
		const hist = readjson(USAGE, { days: [], months: [] });
		// Tage: gut ein Monat (für die Monatsansicht je Gerät)
		hist.days = filter(hist.days ?? [], (d) => d.day != st.day);
		push(hist.days, { day: st.day, macs: st.bytes, minutes: st.prof });
		hist.days = slice(hist.days, -35);
		// Monate: Summe je Gerät, 12 Monate
		const mon = substr(st.day, 0, 7);
		hist.months ??= [];
		let m = filter(hist.months, (x) => x.month == mon)[0];
		if (!m) { m = { month: mon, macs: {} }; push(hist.months, m); }
		for (let mac, b in st.bytes) m.macs[mac] = (m.macs[mac] ?? 0) + b;
		hist.months = slice(hist.months, -12);
		writejson(USAGE, hist);
	}
	st = fresh(day);
	dirty = true; save(true);
	let lim = false;
	for (let r in all)
		if (match(r['.name'], /^phantom_limit_/) && r.enabled != '0') {
			ctx.set('firewall', r['.name'], 'enabled', '0');
			lim = true;
		}
	if (lim) { ctx.commit('firewall'); fw_reload(); event('limit', 'Neuer Tag: Tageslimits zurückgesetzt'); }
	return lim;
}

/* ---------- jede Minute: zählen und Limits prüfen ---------- */
function count_minute() {
	const ctx = cursor();
	let all = rules(ctx);
	const c = clock(now());
	if (!st) load(c.day);
	if (st.day != c.day && new_day(c.day, ctx, all)) all = rules(ctx);

	const isdst = localtime(now()).isdst;
	if (!TEST && last_dst != null && isdst != last_dst) { system('hwclock -u --systz >/dev/null 2>&1'); fw_reload(); }
	last_dst = isdst;

	// L2: Limit-Regeln ohne Profil (Profil in der App gelöscht) entfernen
	let orphan = false;
	for (let r in all) {
		if (!match(r['.name'], /^phantom_limit_/)) continue;
		if (ctx.get('firewall', 'phantom_ppause_' + substr(r['.name'], 14)) == null) { ctx.delete('firewall', r['.name']); orphan = true; }
	}
	if (orphan) { ctx.commit('firewall'); fw_reload(); all = rules(ctx); }

	const minb = +(ctx.get('phantom', 'agent', 'min_bytes') ?? 20000) || 20000;
	const neigh = neighbours();
	const cur = connections(neigh);
	const own = own_addrs();
	const delta = {};

	if (cur != null && prev != null) {
		for (let k, x in cur) {
			if (own[x.src] || own[x.dst] || local_dst(x.dst)) continue;
			const mac = neigh[x.src];
			if (!mac) continue;
			const p = prev[k];
			const d = p != null && x.bytes >= p ? x.bytes - p : x.bytes;
			if (d > 0) delta[mac] = (delta[mac] ?? 0) + d;
		}
	}
	if (cur != null) {
		prev = {};
		for (let k, x in cur) prev[k] = x.bytes;
	}

	const active = {};
	for (let mac, d in delta) {
		st.bytes[mac] = (st.bytes[mac] ?? 0) + d;
		if (d >= minb) { active[mac] = true; st.mmin[mac] = (st.mmin[mac] ?? 0) + 1; }
		dirty = true;
	}

	// Profile = Pause-Regeln der App (phantom_ppause_<id>)
	let changed = false;
	const reached = [];
	const profs = {};
	for (let r in all) {
		if (!match(r['.name'], /^phantom_ppause_/)) continue;
		const id = substr(r['.name'], 15);
		const macs = macs_of(r);
		if (length(filter(macs, (m) => active[m]))) { st.prof[id] = (st.prof[id] ?? 0) + 1; dirty = true; }

		const limit = limit_today(r, c);
		const used = st.prof[id] ?? 0;
		profs[id] = { name: r.phantom_name ?? id, used, limit };
		const rule = 'phantom_limit_' + id;
		const cur_on = ctx.get('firewall', rule) != null && ctx.get('firewall', rule, 'enabled') != '0';
		const want = limit > 0 && used >= limit && length(macs) > 0;
		// Sicherheitsnetz: die Firewall hebt die Sperre um Mitternacht selbst auf,
		// auch wenn der Zähler nicht mehr läuft (Firmware-Update, Absturz)
		const until = c.day + 'T23:59:59';

		if (want && !cur_on) {
			ctx.set('firewall', rule, 'rule');
			ctx.set('firewall', rule, 'name', 'Tageslimit ' + (r.phantom_name ?? id));
			ctx.set('firewall', rule, 'src', '*');
			ctx.set('firewall', rule, 'dest', 'wan');
			ctx.set('firewall', rule, 'target', 'REJECT');
			ctx.set('firewall', rule, 'src_mac', macs);
			ctx.set('firewall', rule, 'stop_date', until);
			ctx.set('firewall', rule, 'enabled', '1');
			st.lim[id] = limit;
			changed = true;
			push(reached, sprintf('Tageslimit für %s erreicht (%d Min.)', r.phantom_name ?? id, limit));
		}
		else if (want && cur_on && (ctx.get('firewall', rule, 'stop_date') != until ||
		         join(' ', sort(macs_of({ src_mac: ctx.get('firewall', rule, 'src_mac') }))) != join(' ', sort([ ...macs ])))) {
			ctx.set('firewall', rule, 'src_mac', macs);
			ctx.set('firewall', rule, 'stop_date', until);
			changed = true;
		}
		else if (!want && cur_on) {
			// Limit in der App erhöht/ausgeschaltet oder keine Geräte mehr → Sperre aufheben
			ctx.set('firewall', rule, 'enabled', '0');
			delete st.lim[id];
			changed = true;
			event('limit', sprintf('Tageslimit für %s aufgehoben', r.phantom_name ?? id));
		}
	}
	if (changed) { ctx.commit('firewall'); fw_reload(); dirty = true; save(true); }
	for (let t in reached) event('limit', t);

	writejson(TODAY, { ver: VERSION, day: st.day, updated: now(), min_bytes: minb, macs: st.bytes, mmin: st.mmin, minutes: st.prof, profiles: profs });
	save(false);
	return { ctx, neigh };
}

/* ---------- alle 15 Sekunden: neu gesperrte Geräte sofort trennen ---------- */
function check_blocks(neigh) {
	const ctx = cursor();
	const now_b = blocked_macs(rules(ctx), clock(now()));
	if (blocked != null) {
		let nb = null;
		const again = recut;
		recut = {};
		for (let m in keys(now_b)) {
			if (!blocked[m]) { cut(m, nb ??= (neigh ?? neighbours())); recut[m] = true; }
			else if (again[m]) cut(m, nb ??= (neigh ?? neighbours()));
		}
	}
	blocked = now_b;
}

// Fehler dürfen den Dienst nicht beenden – ins Systemprotokoll schreiben und weiterlaufen
function safe(fn) {
	try { fn(); }
	catch (e) { warn(sprintf('phantom-agent: %s\n%s\n', e, e.stacktrace?.[0]?.context ?? '')); }
}

function tick_minute() {
	safe(() => {
		const r = count_minute();
		check_blocks(r.neigh);
	});
}

/* ---------- Start ---------- */
if (TEST) {
	// Test: ein Durchlauf je Aufruf, Zustand liegt in Dateien
	const t = readjson(STATE + '/test-mem.json', {});
	prev = t.prev; blocked = t.blocked; recut = t.recut ?? {};
	saved_at = t.saved_at ?? 0;
	if (t.st) st = t.st;
	tick_minute();
	writejson(STATE + '/test-mem.json', { prev, blocked, st, saved_at, recut });
	if (length(cut_log)) print('CUT ', join(' ', cut_log), '\n');
	exit(0);
}

uloop.init();
tick_minute();
uloop.interval(60000, tick_minute);
uloop.interval(15000, () => safe(() => check_blocks(null)));
const stop = () => { save(true); uloop.end(); };
uloop.signal('SIGTERM', stop);
uloop.signal('SIGINT', stop);
uloop.run();
save(true);
