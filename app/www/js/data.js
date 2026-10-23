/* Datenmodell: alles kommt live von den Router – die App speichert keine Netzdaten.
   Was die App ändert, schreibt sie direkt in die Router-Konfiguration (UCI). */
'use strict';

const macId = (m) => String(m || '').toLowerCase().replace(/[^0-9a-f]/g, '');
const macUp = (m) => String(m || '').toUpperCase();
const asList = (v) => (Array.isArray(v) ? v : (v == null || v === '' ? [] : String(v).split(/\s+/)));
const sigPct = (dbm) => (dbm == null ? null : Math.max(0, Math.min(100, Math.round(2 * (Number(dbm) + 100)))));
const DAYS = [ 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun' ];
const NOMAC = '00:00:00:00:00:00';   // Platzhalter: eine Regel ohne Geräte darf nie „alle“ sperren
const DAY_DE = { Mon: 'Mo', Tue: 'Di', Wed: 'Mi', Thu: 'Do', Fri: 'Fr', Sat: 'Sa', Sun: 'So' };
const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

function bandOf(freq) {
	const f = Number(freq) || 0;
	if (f >= 5925) return '6 GHz';
	if (f >= 4900) return '5 GHz';
	if (f > 0) return '2,4 GHz';
	return '';
}

/* IPv4 als Zahl und Netz-Rechnung mit echter Maske (/8 … /32) */
function ipNum(ip) { const p = String(ip || '').split('.').map(Number); return p.length === 4 && p.every((x) => x >= 0 && x <= 255) ? ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0 : null; }
function maskNum(bits) { bits = Number(bits) || 0; return bits <= 0 ? 0 : (0xFFFFFFFF << (32 - Math.min(32, bits))) >>> 0; }
function inSubnet(ip, net, bits) { const a = ipNum(ip), b = ipNum(net); if (a === null || b === null) return false; const m = maskNum(bits); return ((a & m) >>> 0) === ((b & m) >>> 0); }
function netAddr(ip, bits) { const n = (ipNum(ip) & maskNum(bits)) >>> 0; return [ n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255 ].join('.') + '/' + bits; }
function netKeyOf(name) { const n = String(name || '').toLowerCase(); return n === 'lan' ? 'lan' : /gast|guest/.test(n) ? 'gast' : /smart|iot|(^|[_-])sh([_-]|$)/.test(n) ? 'sh' : n; }

/* Firmware-Updates: neueste Version im SELBEN Zweig (25.12.x),
   keine Sprünge auf einen neuen Hauptzweig, keine Release-Candidates */
function fwParse(v) { const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v || '')); return m ? m.slice(1).map(Number) : null; }
function fwLatest(installed, list) {
	const cur = fwParse(installed);
	if (!cur) return null;   // SNAPSHOT oder eigene Versionsnummer: nichts anbieten
	let best = cur;
	for (const v of list || []) { const p = fwParse(v); if (p && p[0] === cur[0] && p[1] === cur[1] && p[2] > best[2]) best = p; }
	return best === cur ? null : best.join('.');
}

/* Gerätetyp aus dem Namen raten, solange keiner gewählt ist */
function guessType(name, net) {
	const n = String(name || '').toLowerCase();
	// Smart-Home-Geräte zuerst (genauer), Konsolen vor „Schalter“ (Nintendo-Switch)
	if (/ps5|ps4|playstation|xbox|nintendo|steam-?deck/.test(n)) return 'console';
	if (/rollo|jalousie|rolllade|rolladen/.test(n)) return 'blind';
	if (/thermostat|heizung|heizkörper|heizkoerper/.test(n)) return 'thermo';
	if (/lichtschalter|schalter|dimmer/.test(n)) return 'lswitch';
	if (/steckdosenleiste|leiste|power-?strip/.test(n)) return 'strip';
	if (/steckdose|gosund|smart-?plug|\bplug/.test(n)) return 'plug';
	if (/(^|[-_ ])led([-_ ]|$)|licht|lampe|leuchte|bulb|hue/.test(n)) return 'bulb';
	if (/drucker|printer|brother|epson|canon|laserjet|deskjet/.test(n)) return 'printer';
	if (/wasch|trockner|dryer|washer/.test(n)) return 'washer';
	if (/strom|shelly|pro3em|energie|energy/.test(n)) return 'meter';
	if (/zelsius|lesekopf|wärme|waerme|zähler|zaehler|gaszaehler/.test(n)) return 'gauge';
	if (/kamera|camera|-cam|cam-|webcam|ipcam/.test(n)) return 'camera';
	if (/doorman|klingel|türsprech|tuersprech|doorbell/.test(n)) return 'doorbell';
	if (/saug|roborock|roomba|vacuum|dreame/.test(n)) return 'vacuum';
	if (/solar|noah|wechselrichter|inverter|growatt|hoymiles|balkonkraftwerk|(^|[-_ ])pv([-_ ]|$)/.test(n)) return 'solar';
	if (/(^|[-_ ])hub([-_ ]|$)|bridge|zigbee|gateway/.test(n)) return 'hub';
	if (/esp|phantom-one|tasmota|wled|esphome/.test(n)) return 'chip';
	if (/tablet|tab-|ipad|fire/.test(n)) return 'tablet';
	if (/laptop|notebook|macbook|thinkpad|-pc$|desktop/.test(n)) return 'laptop';
	if (/tv|fernseher|chromecast|firestick|roku/.test(n)) return 'tv';
	if (/ps5|ps4|playstation|xbox|switch|nintendo|steam/.test(n)) return 'console';
	if (/nas|server|raspi|raspberry|home-?assistant|minipc|proxmox/.test(n)) return 'server';
	if (/watch|gear|band|fitbit/.test(n)) return 'watch';
	if (/echo|alexa|sonos|speaker|toniebox|homepod|nest-?mini/.test(n)) return 'speaker';
	if (/cudy|router|openwrt|ap\d|access/.test(n)) return 'router';
	if (/iphone|android|galaxy|pixel|handy|phone|s2\d|a\d\d|redmi|xiaomi/.test(n)) return 'phone';
	if (net === 'sh') return 'plug';
	return 'other';
}

const Net = {
	routers: [],          // alle Router (Router-Objekte)
	master: null,
	info: {},             // id → { board, sys, temp, wifi[], ok }
	devices: [],
	loadedAt: 0,
	loading: false,
	error: '',
	ifaces: [], leases: [], neigh: {}, events: [], cron: {}, today: { macs: {}, minutes: {} }, week: { days: [] },
	dhcp: {}, phantom: {}, fw: {}, wireless: {}, network: {},

	byId(id) { return this.routers.find((r) => r.id === id); },
	caps() {
		const i = this.master && this.info[this.master.id];
		if (i && i.caps) return i.caps;
		// Master nicht vollständig geladen: am Vorhandensein der Phantom-Einstellungen erkennen
		const h = Object.keys(this.phantom || {}).length > 0;
		return { helper: h, wol: false, conntrack: false, nlbw: h };
	},
	missingRights() { return this.routers.filter((r) => { const i = this.info[r.id]; return i && i.ok && !i.acl; }); },
	missingHelper() { return this.routers.filter((r) => { const i = this.info[r.id]; return i && i.ok && i.caps && !i.caps.helper; }); },
	others() { return this.routers.filter((r) => r !== this.master); },

	/* ---------- Laden ---------- */
	async load() {
		if (!this.master) return;
		this.loading = true;
		const m = this.master;
		try {
			const [ ifd, leases, dhcp, phantom, fw, wireless, network, neighOut, today, week, events, wg ] = await Promise.all([
				m.call('network.interface', 'dump', {}).catch(() => ({ interface: [] })),
				m.call('luci-rpc', 'getDHCPLeases', {}).catch(() => ({ dhcp_leases: [] })),
				m.uciGet('dhcp').catch(() => ({})),
				m.uciGet('phantom').catch(() => ({})),
				m.uciGet('firewall').catch(() => ({})),
				m.uciGet('wireless').catch(() => ({})),
				m.uciGet('network').catch(() => ({})),
				m.read('/proc/net/arp'),
				m.readJson('/tmp/phantom/today.json', { macs: {}, minutes: {} }),
				m.readJson('/etc/phantom/usage.json', { days: [] }),
				m.read('/etc/phantom/events.log'),
				m.call('luci.wireguard', 'getWgInstances', {}).catch(() => ({}))
			]);
			this.ifaces = ifd.interface || [];
			this.leases = leases.dhcp_leases || [];
			this.dhcp = dhcp; this.phantom = phantom; this.fw = fw; this.wireless = wireless; this.network = network;
			this.neigh = this.parseNeigh(neighOut || '');
			this.arpOk = !!neighOut;
			this.today = today || { macs: {}, minutes: {} };
			this.week = week || { days: [] };
			this.events = this.parseEvents(events);
			this.wg = wg || {};
			// Datenverkehr ohne Helfer: Zähler der WAN-Schnittstelle (seit Neustart des Masters)
			const w = this.internet();
			const prev = this.wanStats, prevAt = this.wanAt;
			this.wanDev = w.dev ? await m.call('network.device', 'status', { name: w.dev }).catch(() => ({})) : {};
			this.wanStats = this.wanDev.statistics || null;
			this.wanAt = Date.now();
			// aktuelle Geschwindigkeit aus zwei Messungen (App aktualisiert alle 20 s)
			const dt = (this.wanAt - (prevAt || 0)) / 1000;
			this.wanRate = prev && this.wanStats && dt > 3 && dt < 120 && this.wanStats.rx_bytes >= prev.rx_bytes
				? { rx: (this.wanStats.rx_bytes - prev.rx_bytes) * 8 / dt, tx: (this.wanStats.tx_bytes - prev.tx_bytes) * 8 / dt } : this.wanRate && dt < 120 ? this.wanRate : null;
		} catch (e) {
			this.error = e.message;
			this.loading = false;
			throw e;
		}
		await Promise.all(this.routers.map((r) => this.loadCudy(r)));
		this.buildDevices();
		this.loadedAt = Date.now();
		this.error = '';
		this.loading = false;
	},

	async loadCudy(r) {
		const inf = { ok: false, wifi: [], board: {}, sys: {}, temp: null };
		try {
			const has = (path) => r.call('file', 'stat', { path }).then(() => true, () => false);
			const [ board, sys, devs, temp, helper, wol, ct, nlbw, rPkg, rSsh ] = await Promise.all([
				r.call('system', 'board', {}),
				r.call('system', 'info', {}),
				r.call('iwinfo', 'devices', {}).then((x) => Object.assign(x, { aclOk: true })).catch(() => ({ devices: [] })),
				r.read('/sys/class/thermal/thermal_zone0/temp'),
				has('/usr/share/phantom/agent.uc'), has('/usr/bin/etherwake'), has('/usr/sbin/conntrack'), has('/usr/sbin/nlbw'),
				has('/usr/share/rpcd/acl.d/phantom-rights.json'), has('/usr/share/rpcd/acl.d/root.json')
			]);
			inf.rightsPkg = rPkg; inf.rightsSsh = rSsh;
			inf.board = board; inf.sys = sys; inf.ok = true;
			// Netzwerke (Schnittstellen) und Anschlüsse (Ports)
			const [ ifd, devst ] = await Promise.all([
				r === this.master && this.ifaces.length ? { interface: this.ifaces } : r.call('network.interface', 'dump', {}).catch(() => ({ interface: [] })),
				r.call('network.device', 'status', {}).catch(() => ({}))
			]);
			inf.ifaces = (ifd.interface || []).filter((i) => i.interface !== 'loopback');
			const devs2 = devst && typeof devst === 'object' ? devst : {};
			let ports = Object.keys(devs2).filter((n) => /^(lan\d+|wan\d*|eth\d+)$/.test(n) && devs2[n] && 'carrier' in devs2[n]);
			if (ports.some((n) => /^lan\d+$/.test(n))) ports = ports.filter((n) => !/^eth\d+$/.test(n));   // DSA: eth0 ist nur der interne CPU-Port
			inf.ports = ports.sort((x, y) => (/^wan/.test(x) - /^wan/.test(y)) || x.localeCompare(y, 'de', { numeric: true }))
				.map((n) => ({ name: n, up: !!devs2[n].carrier, speed: devs2[n].speed || '' }));
			const [ cron, log ] = await Promise.all([ this.cronRead(r).catch(() => null), r.call('log', 'read', { lines: 400, stream: false, oneshot: true }).catch(() => ({ log: [] })) ]);
			if (cron !== null) this.cron[r.id] = cron;
			inf.log = this.parseSyslog(log.log || [], r);
			// Was kann dieser Router? (normales OpenWrt hat den Phantom-Helfer nicht)
			inf.caps = { helper, wol, conntrack: ct, nlbw };
			// Rechte vollständig? (WLAN-Liste und ARP-Tabelle lesen geht nur mit root.json bzw. Phantom-Firmware)
			const arp = r === this.master ? this.arpOk : !!(await r.read('/proc/net/arp'));
			inf.acl = !!devs.aclOk && arp;
			inf.aclMissing = [ devs.aclOk ? '' : 'WLAN-Liste', arp ? '' : 'ARP-Tabelle' ].filter(Boolean);
			inf.temp = temp ? Math.round(Number(temp) / 1000) : null;
			// Ohne Rechte für „iwinfo devices“ (normales OpenWrt ohne Phantom-Rechte) die Namen über LuCI holen
			let names = devs.devices || [];
			if (!names.length) {
				const wd = await r.call('network.wireless', 'status', {}).catch(() => r.call('luci-rpc', 'getWirelessDevices', {}).catch(() => ({})));
				for (const radio of Object.values(wd || {})) for (const i of radio.interfaces || []) if (i.ifname && !names.includes(i.ifname)) names.push(i.ifname);
			}
			for (const dev of names) {
				const [ i, a, hc ] = await Promise.all([
					r.call('iwinfo', 'info', { device: dev }).catch(() => ({})),
					r.call('iwinfo', 'assoclist', { device: dev }).catch(() => ({ results: [] })),
					// Datenmenge je WLAN-Gerät seit dem Verbinden (hostapd, ohne Zusatzpakete)
					r.call('hostapd.' + dev, 'get_clients', {}).catch(() => ({}))
				]);
				const hb = {};
				for (const [ mac, c ] of Object.entries((hc && hc.clients) || {})) if (c && c.bytes) hb[macUp(mac)] = c.bytes;
				const clients = (a.results || []).map((c) => Object.assign({}, c, { bytes: hb[macUp(c.mac)] || null }));
				inf.wifi.push({ ifname: dev, ssid: i.ssid, mode: i.mode, band: bandOf(i.frequency), channel: i.channel, txpower: i.txpower, clients });
			}
			if (board.hostname) r.name = board.hostname;
			if (board.model) r.model = board.model;
		} catch (e) {
			inf.error = e.message;
			if (e.needLogin) inf.needLogin = true;
		}
		this.info[r.id] = inf;
	},

	parseNeigh(out) {
		const res = {};
		// /proc/net/arp: IP  HW-Typ  Flags  MAC  Maske  Gerät
		for (const l of out.split('\n')) {
			const m = l.match(/^([0-9.]+)\s+\S+\s+(0x[0-9a-f]+)\s+([0-9a-f:]{17})\s+\S+\s+(\S+)/i);
			if (m && m[2] !== '0x0' && m[3] !== '00:00:00:00:00:00') res[macUp(m[3])] = { ip: m[1], dev: m[4], state: 'REACHABLE' };
		}
		return res;
	},
	/* Systemprotokoll eines Router → Ereignisse (WLAN verbunden/getrennt, IP vergeben) */
	parseSyslog(lines, r) {
		const out = [];
		for (const l of lines) {
			const msg = l.msg || '';
			let m = msg.match(/hostapd(?:\[\d+\])?: (\S+): AP-STA-(CONNECTED|DISCONNECTED) ([0-9a-f:]{17})/i);
			if (m) { out.push({ ts: l.time, kind: m[2].toUpperCase() === 'CONNECTED' ? 'connect' : 'disconnect', mac: macUp(m[3]), ifname: m[1], cudy: r.id }); continue; }
			m = msg.match(/dnsmasq-dhcp(?:\[\d+\])?: DHCPACK\(([^)]+)\) ([0-9.]+) ([0-9a-f:]{17})(?: (\S+))?/i);
			if (m && r === this.master) out.push({ ts: l.time, kind: 'dhcp', mac: macUp(m[3]), ip: m[2], host: m[4] || '', cudy: r.id });
		}
		return out;
	},
	syslogEvents() {
		const all = [];
		for (const r of this.routers) for (const e of ((this.info[r.id] || {}).log || [])) all.push(e);
		all.sort((a, b) => a.ts - b.ts);
		const name = (mac, fb) => { const d = this.devices.find((x) => x.mac === mac); return (d && d.name !== d.mac && d.name) || fb || mac; };
		const bandOfIf = (cudy, ifname) => { const w = (((this.info[cudy] || {}).wifi) || []).find((x) => x.ifname === ifname); return w ? w.band : ''; };
		const cname = (id) => (this.byId(id) || {}).name || '?';
		// Router-Wechsel erkennen: „getrennt“ und „verbunden“ desselben Geräts innerhalb einer Minute = nur gewechselt, nicht offline
		const ROAM = 60000, used = new Set(), out = [];
		for (let i = 0; i < all.length; i++) {
			const e = all[i];
			if (used.has(i) || (e.kind !== 'connect' && e.kind !== 'disconnect')) continue;
			const want = e.kind === 'connect' ? 'disconnect' : 'connect';
			let j = -1;
			for (let k = i + 1; k < all.length && all[k].ts - e.ts <= ROAM; k++) if (!used.has(k) && all[k].mac === e.mac && all[k].kind === want) { j = k; break; }
			if (j < 0) continue;
			used.add(i); used.add(j);
			const con = e.kind === 'connect' ? e : all[j], dis = e.kind === 'connect' ? all[j] : e;
			if (con.cudy === dis.cudy && con.ifname === dis.ifname) continue;   // kurz neu verbunden am selben Router: kein Eintrag
			const b = bandOfIf(con.cudy, con.ifname);
			out.push({ ts: Math.max(con.ts, dis.ts), kind: 'roam', mac: e.mac,
				text: name(e.mac) + (con.cudy === dis.cudy ? ' wechselt auf ' + (b || 'anderes Band') + ' (' + cname(con.cudy) + ')' : ' wechselt von ' + cname(dis.cudy) + ' zu ' + cname(con.cudy) + (b ? ' (' + b + ')' : '')) });
		}
		// IP-Vergabe: pro Gerät und Adresse nur der letzte Eintrag (Verlängerungen nicht wiederholen)
		const lastDhcp = {};
		all.forEach((e, i) => { if (e.kind === 'dhcp') lastDhcp[e.mac + '|' + e.ip] = i; });
		all.forEach((e, i) => {
			if (used.has(i)) return;
			if (e.kind === 'dhcp' && lastDhcp[e.mac + '|' + e.ip] !== i) return;
			const b = e.ifname ? bandOfIf(e.cudy, e.ifname) : '';
			let text;
			if (e.kind === 'connect') text = name(e.mac) + ' mit ' + cname(e.cudy) + (b ? ' (' + b + ')' : '') + ' verbunden';
			else if (e.kind === 'disconnect') text = name(e.mac) + ' von ' + cname(e.cudy) + ' getrennt';
			else text = name(e.mac, e.host) + ' hat ' + e.ip + ' bekommen';
			out.push({ ts: e.ts, kind: e.kind, text, mac: e.mac });
		});
		return out.sort((a, b) => b.ts - a.ts);
	},
	parseEvents(txt) {
		return String(txt || '').trim().split('\n').filter(Boolean).map((l) => {
			const [ ts, kind, ...rest ] = l.split('|');
			return { ts: Number(ts) * 1000, kind, text: rest.join('|') };
		}).reverse();
	},

	/* Netz-Zuordnung über die Adressbereiche des Masters */
	netOf(ip) {
		if (!ip) return '?';
		// Netz mit der längsten passenden Maske gewinnt; die Internet-Seite (Standardroute) zählt nicht
		let best = null;
		for (const i of this.ifaces || []) {
			if ((i.route || []).some((r) => r.target === '0.0.0.0' && r.mask === 0)) continue;
			for (const a of i['ipv4-address'] || []) {
				if (inSubnet(ip, a.address, a.mask) && (!best || a.mask > best.mask)) best = { mask: a.mask, name: i.interface };
			}
		}
		return best ? netKeyOf(best.name) : '?';
	},

	sections(cfg, type) { return Object.values(cfg || {}).filter((s) => s['.type'] === type); },
	rule(name) { return (this.fw || {})[name]; },
	ruleOn(name) { const r = this.rule(name); return !!r && r.enabled !== '0'; },

	/* Profile liegen als Pause-Regel in der Firewall (phantom_ppause_<id>) – keine Zusatz-Datei nötig */
	profiles() {
		return Object.values(this.fw || {}).filter((r) => r['.type'] === 'rule' && /^phantom_ppause_/.test(r['.name'])).map((r) => ({
			id: r['.name'].slice(15), name: r.phantom_name || r['.name'].slice(15), color: r.phantom_color || '#a855f7', kid: r.phantom_kid === '1',
			limit: Number(r.phantom_limit || 0), macs: asList(r.src_mac).map(macUp).filter((m) => m !== NOMAC), paused: r.enabled !== '0',
			// Wochenende eigenes Limit (fehlt = wie werktags), Bonus nur für den Tag in phantom_bonus_day
			limitWe: r.phantom_limit_we != null && r.phantom_limit_we !== '' ? Number(r.phantom_limit_we) : null,
			bonus: Number(r.phantom_bonus || 0), bonusDay: r.phantom_bonus_day || ''
		}));
	},
	/* Zeitpläne = Firewall-Regeln mit Uhrzeit (wirken direkt in fw4, ohne Helfer) */
	schedules(pid) {
		return Object.values(this.fw || {}).filter((r) => r['.type'] === 'rule' && /^phantom_sched_/.test(r['.name']) && !/_b$/.test(r['.name']))
			.filter((r) => !pid || r.phantom_profile === pid).map((r) => ({
				id: r['.name'].slice(14), profile: r.phantom_profile, label: r.phantom_label || 'Zeitplan',
				start: r.phantom_start || String(r.start_time || '20:00').slice(0, 5), stop: r.phantom_stop || String(r.stop_time || '07:00').slice(0, 5),
				days: asList(r.phantom_days || r.weekdays).length ? asList(r.phantom_days || r.weekdays) : DAYS.slice(), enabled: r.phantom_enabled ? r.phantom_enabled === '1' : r.enabled !== '0'
			}));
	},

	buildDevices() {
		const map = {};
		const add = (mac) => (map[mac] = map[mac] || { mac, name: '', ip: '', online: false, wifi: false });
		// statische Leases (feste IPs + Namen)
		const statics = {};
		for (const h of this.sections(this.dhcp, 'host')) for (const m of asList(h.mac)) statics[macUp(m)] = { name: h.name, ip: h.ip, sec: h['.name'] };
		for (const [ m, s ] of Object.entries(statics)) { const d = add(m); d.name = s.name || d.name; d.ip = s.ip || d.ip; d.fixed = true; d.fixedSec = s.sec; }
		for (const l of this.leases || []) {
			const d = add(macUp(l.macaddr)); d.ip = l.ipaddr || d.ip; if (!d.name && l.hostname) d.name = l.hostname; d.lease = true;
			// Ohne Lesezugriff auf die ARP-Tabelle: aktiver DHCP-Lease = online
			if (!this.arpOk) d.leaseOnly = true;
		}
		// ARP: nur Geräte in den eigenen Netzen (nicht der Router davor auf der Internet-Seite)
		for (const [ m, n ] of Object.entries(this.neigh || {})) { if (this.netOf(n.ip) === '?' && !map[m]) continue; const d = add(m); if (!d.ip) d.ip = n.ip; if (/REACHABLE|DELAY|PROBE|STALE/.test(n.state)) d.wired = true; }
		// WLAN-Clients an allen Router
		const ssidNet = {};
		for (const s of this.sections(this.wireless, 'wifi-iface')) if (s.ssid) ssidNet[s.ssid] = s.network;
		for (const r of this.routers) {
			const inf = this.info[r.id];
			if (!inf || !inf.ok) continue;
			for (const w of inf.wifi) {
				if (/mesh/i.test(w.mode || '')) continue;
				for (const c of w.clients) {
					const d = add(macUp(c.mac));
					d.online = true; d.wifi = true;
					d.cudy = r.id; d.cudyName = r.name; d.ifname = w.ifname; d.band = w.band; d.ssid = w.ssid;
					d.signal = c.signal; d.pct = sigPct(c.signal);
					d.rx = c.rx && c.rx.rate ? Math.round(c.rx.rate / 1000) : null;
					d.tx = c.tx && c.tx.rate ? Math.round(c.tx.rate / 1000) : null;
					d.connected = c.connected_time || null;
					// Sicht des Routers: rx = vom Gerät gesendet (Upload), tx = zum Gerät (Download)
					d.wifiBytes = c.bytes ? { down: Number(c.bytes.tx) || 0, up: Number(c.bytes.rx) || 0 } : null;
				}
			}
		}
		const profiles = this.profiles();
		const now = new Date();
		const pauseUntil = (r) => (r && r.phantom_until ? Number(r.phantom_until) * 1000 : null) || this.cronAt(this.master, 'pause_' + (r && r['.name'] || '').slice(6));
		const list = [];
		for (const d of Object.values(map)) {
			if (!d.wifi && d.wired) { d.online = true; d.band = 'Kabel'; }
			// Ersatz ohne ARP-Rechte: aktiver Lease zählt – aber nicht bei Handys/Uhren/Tablets (sonst noch Stunden nach dem Gehen „online“)
			if (!d.online && d.leaseOnly) {
				const ts = (this.phantom || {})['d_' + macId(d.mac)];
				const t = (ts && ts.type) || guessType(d.name, this.netOf(d.ip));
				if (!/^(phone|watch|tablet)$/.test(t)) { d.online = true; d.band = 'Kabel'; }
			}
			// Router selbst: online, wenn die App sie gerade erreicht (auch ohne Zugriff auf die ARP-Tabelle)
			const cudy = !d.wifi && this.routers.find((r) => r.host === d.ip && this.info[r.id] && this.info[r.id].ok);
			if (cudy) { d.online = true; d.band = 'Kabel'; d.isCudy = true; }
			if (!d.name) d.name = d.mac;
			d.id = macId(d.mac);
			d.net = this.netOf(d.ip);
			const typeSec = (this.phantom || {})['d_' + d.id];
			d.type = (typeSec && typeSec.type) || guessType(d.name, d.net);
			const prof = profiles.find((p) => p.macs.includes(d.mac));
			d.profile = prof ? prof.id : '';
			const own = this.rule('block_' + d.id);
			d.pausedSelf = !!own && own.enabled !== '0';
			d.pauseUntil = d.pausedSelf ? pauseUntil(own) : null;
			d.pausedProfile = !!prof && prof.paused;
			d.pausedLimit = !!prof && this.ruleOn('phantom_limit_' + prof.id);
			d.pausedSched = !!prof && this.schedules(prof.id).some((s) => s.enabled && this.schedActive(s, now));
			d.paused = d.pausedSelf || d.pausedProfile || d.pausedLimit || d.pausedSched;
			d.prio = !!this.rule('phantom_prio_' + d.id);
			d.usageToday = (this.today.macs || {})[d.mac.toLowerCase()] || 0;
			d.week = this.weekOf(d.mac.toLowerCase());
			// nur relevante Geräte zeigen: online, mit fester IP oder mit Lease
			if (d.online || d.fixed || d.lease) list.push(d);
		}
		list.sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name, 'de'));
		this.devices = list;
	},

	weekOf(mac) {
		const days = (this.week.days || []).slice(-6).map((x) => ({ day: x.day, bytes: (x.macs || {})[mac] || 0 }));
		days.push({ day: this.today.day || 'heute', bytes: (this.today.macs || {})[mac] || 0 });
		return days;
	},

	schedActive(s, d) {
		const day = DAYS[(d.getDay() + 6) % 7];
		const prev = DAYS[(d.getDay() + 5) % 7];
		const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
		if (s.start <= s.stop) return s.days.includes(day) && hm >= s.start && hm < s.stop;
		return (s.days.includes(day) && hm >= s.start) || (s.days.includes(prev) && hm < s.stop);
	},

	internet() {
		const w = (this.ifaces || []).find((i) => (i.route || []).some((r) => r.target === '0.0.0.0' && r.mask === 0) && i.up);
		return w ? { up: true, iface: w.interface, ip: ((w['ipv4-address'] || [])[0] || {}).address || '', uptime: w.uptime, dev: w.l3_device || w.device || '', raw: w } : { up: false };
	},
	/* ---------- Router davor (Gateway) per UPnP – Standard „Internet Gateway Device“, ohne Passwort ----------
	   Adresse kommt automatisch vom Master (Gateway der WAN-Verbindung); 49000 ist der übliche UPnP-Port */
	async gatewayInfo(force) {
		const n = this.internet();
		const gw = n.raw && ((n.raw.route || []).find((r) => r.target === '0.0.0.0' && r.mask === 0) || {}).nexthop;
		if (!gw) { this.gwInfo = { gw: '', at: Date.now(), ok: false }; return this.gwInfo; }
		if (!force && this.gwInfo && this.gwInfo.gw === gw && Date.now() - this.gwInfo.at < 30000) return this.gwInfo;
		const out = { gw, at: Date.now(), ok: false };
		const base = 'http://' + gw + ':49000';
		try {
			// Beschreibung lesen; klappt das nicht, die üblichen Standard-Pfade probieren
			const desc = await Plat.rawHttp(base + '/igddesc.xml', 'GET', '', {}, 3000).catch(() =>
				'<service><serviceType>urn:schemas-upnp-org:service:WANIPConnection:1</serviceType><controlURL>/igdupnp/control/WANIPConn1</controlURL></service>' +
				'<service><serviceType>urn:schemas-upnp-org:service:WANCommonInterfaceConfig:1</serviceType><controlURL>/igdupnp/control/WANCommonIFC1</controlURL></service>');
			const svcs = [ ...desc.matchAll(/<service>([\s\S]*?)<\/service>/g) ].map((m) => ({
				type: (m[1].match(/<serviceType>([^<]+)</) || [])[1] || '', url: (m[1].match(/<controlURL>([^<]+)</) || [])[1] || '' }));
			const find = (re) => svcs.find((x) => re.test(x.type));
			const soap = async (svc, action) => {
				if (!svc) return {};
				const env = '<?xml version="1.0" encoding="utf-8"?><s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:' + action + ' xmlns:u="' + svc.type + '"/></s:Body></s:Envelope>';
				const xml = await Plat.rawHttp(base + svc.url, 'POST', env, { 'Content-Type': 'text/xml; charset="utf-8"', SOAPAction: '"' + svc.type + '#' + action + '"' }, 3000).catch(() => '');
				const res = {};
				for (const m of xml.matchAll(/<(New\w+)>([^<]*)<\/\1>/g)) res[m[1]] = m[2];
				return res;
			};
			const conn = find(/WAN(IP|PPP)Connection:1/), common = find(/WANCommonInterfaceConfig:1/);
			const r = await Promise.all([ soap(conn, 'GetExternalIPAddress'), soap(conn, 'GetStatusInfo'), soap(common, 'GetCommonLinkProperties'), soap(common, 'GetAddonInfos') ]);
			Object.assign(out, ...r);
			out.ok = !!(out.NewExternalIPAddress || out.NewLayer1DownstreamMaxBitRate || out.NewUptime);
		} catch (e) { out.error = e.message; }
		this.gwInfo = out;
		return out;
	},
	/* Ping + Namensauflösung vom Master aus (wie der Netz-Check) */
	async inetCheck(host) {
		if (this.pingInfo && this.pingInfo.host === host && Date.now() - this.pingInfo.at < 60000) return this.pingInfo;
		const r = { host, at: Date.now() };
		try {
			const o = await this.master.exec('/bin/ping', [ '-c', '3', '-W', '2', host ], 15000);
			const out = (o.stdout || '') + (o.stderr || '');
			r.dns = !/bad address|unknown host|could not resolve/i.test(out);
			const m = out.match(/= [\d.]+\/([\d.]+)\//);
			r.ms = m ? Math.round(Number(m[1])) : null;
			const loss = out.match(/(\d+)% packet loss/);
			r.loss = loss ? Number(loss[1]) : null;
		} catch (e) { r.error = e.message; }
		this.pingInfo = r;
		return r;
	},

	/* Weitere OpenWrt-Router im Netz finden: alle bekannten Adressen im Netz des Masters (DHCP, feste IPs, ARP)
	   kurz fragen, ob dort ubus antwortet – klappt mit jedem OpenWrt mit LuCI, ohne Zusatzpakete */
	async scanRouters() {
		const m = this.master;
		if (!m) return [];
		const own = (this.ifaces || []).flatMap((i) => (i['ipv4-address'] || []).map((a) => ({ i, a })));
		const home = own.find((x) => x.a.address === m.host) || own.find((x) => x.i.interface === 'lan');
		if (!home) return [];
		const inHome = (ip) => ip && inSubnet(ip, home.a.address, home.a.mask);
		const skip = new Set([ ...this.routers.map((r) => r.host), ...own.map((x) => x.a.address) ]);
		const cands = new Map();
		for (const l of this.leases || []) if (inHome(l.ipaddr)) cands.set(l.ipaddr, l.hostname || '');
		for (const h of this.sections(this.dhcp, 'host')) if (inHome(h.ip) && !cands.get(h.ip)) cands.set(h.ip, h.name || '');
		for (const n of Object.values(this.neigh || {})) if (inHome(n.ip) && !cands.has(n.ip)) cands.set(n.ip, '');
		for (const ip of skip) cands.delete(ip);
		const list = [ ...cands.entries() ], found = [];
		const probe = async ([ ip, name ]) => {
			const body = { jsonrpc: '2.0', id: 1, method: 'call', params: [ NULL_SID, 'session', 'access', {} ] };
			const r = await Plat.httpJson('http://' + ip + '/ubus', body, { timeout: 1200 }).catch(() => null);
			if (r && r.jsonrpc === '2.0') found.push({ ip, name: name || ip, role: 'ap', via: 'scan' });
		};
		// bis zu 24 Geräte gleichzeitig prüfen
		let next = 0;
		await Promise.all(Array.from({ length: Math.min(24, list.length) }, async () => { while (next < list.length) await probe(list[next++]); }));
		return found;
	},

	/* Offizielle Versionsliste (alle 12 Std., auf dem Handy zwischengespeichert) */
	async fwVersions() {
		const AGE = 12 * 3600e3;
		if (this.fwList && Date.now() - this.fwList.at < AGE) return this.fwList.v;
		const cached = await Plat.getPref('fwVersions', null);
		if (cached && Date.now() - cached.at < AGE) { this.fwList = cached; return cached.v; }
		try {
			const d = JSON.parse(await Plat.getPublic('https://downloads.openwrt.org/.versions.json', 10000));
			const all = new Set([ ...(d.versions_list || []), d.stable_version, d.oldstable_version ].filter(Boolean));
			this.fwList = { at: Date.now(), v: [ ...all ].filter((v) => fwParse(v)) };
			await Plat.setPref('fwVersions', this.fwList);
		} catch (e) {
			this.fwList = cached || { at: Date.now() - AGE + 3600e3, v: [] };   // ohne Internet: in 1 Std. nochmal
		}
		return this.fwList.v;
	},
	fwInstalled(r) { const i = this.info[r.id]; return (i && i.board && i.board.release && i.board.release.version) || ''; },
	fwUpdate(r) { return fwLatest(this.fwInstalled(r), this.fwList ? this.fwList.v : []); },

	/* ---------- WLAN-Kanäle: Funkmodule aller Router + Nachbar-WLANs (wie die Kanalanalyse in LuCI) ---------- */
	async scanChannels(onPart) {
		const own = new Set();
		const done = {};   // Router-ID → fertige Funkmodule
		const show = (partial) => {
			const prev = (this.chan && this.chan.radios) || [];   // auch ein inzwischen geladener alter Stand
			// fertige Router ersetzen, noch laufende zeigen solange den alten Stand → nichts springt
			const radios = [ ...prev.filter((x) => !done[x.r.id]), ...Object.values(done).flat() ]
				.sort((a, b) => this.routers.indexOf(a.r) - this.routers.indexOf(b.r))
				.map((x) => Object.assign({}, x, { seen: x.seen.filter((n) => !own.has(n.ssid)) }));
			this.chan = { at: Date.now(), radios, partial };
		};
		// alle Router und alle Funkmodule gleichzeitig scannen (dauert so lange wie der langsamste Scan, nicht die Summe)
		const perRouter = await Promise.all(this.routers.map(async (r) => {
			const inf = this.info[r.id];
			if (!inf || !inf.ok) return [];
			// Funkmodule aus der WLAN-Konfiguration, laufende Werte aus iwinfo (Zuordnung über das Band)
			const [ w, wd ] = await Promise.all([
				r.uciGet('wireless').catch(() => ({})),
				// Funkmodul → laufende Schnittstellen (wie LuCI, auch ohne Zusatzrechte)
				r.call('luci-rpc', 'getWirelessDevices', {}).catch(() => ({}))
			]);
			const ifaces = Object.values(w || {}).filter((x) => x['.type'] === 'wifi-iface');
			ifaces.forEach((x) => { if (x.ssid) own.add(x.ssid); });
			(inf.wifi || []).forEach((x) => { if (x.ssid) own.add(x.ssid); });
			const res = await Promise.all(Object.values(w || {}).filter((x) => x['.type'] === 'wifi-device').map(async (dev) => {
				const radio = dev['.name'];
				const band = dev.band === '2g' ? '24' : dev.band === '5g' ? '5' : dev.band === '6g' ? '6' : (String(dev.hwmode || '').includes('a') ? '5' : '24');
				const bandTxt = band === '24' ? '2,4 GHz' : band === '5' ? '5 GHz' : '6 GHz';
				const names = (((wd || {})[radio] || {}).interfaces || []).map((x) => x.ifname).filter(Boolean);
				let live = (inf.wifi || []).filter((x) => names.includes(x.ifname));
				if (!live.length && !names.length) live = (inf.wifi || []).filter((x) => x.band === bandTxt);   // Notlösung: über das Band
				const ap = live.find((x) => !/mesh/i.test(x.mode || '')) || live[0];
				// Scannen geht auch über den Funkmodul-Namen (OpenWrt legt dafür kurz eine Hilfs-Schnittstelle an)
				const scanDev = ap ? ap.ifname : (dev.disabled !== '1' ? radio : '');
				const mesh = ifaces.some((x) => x.device === radio && x.mode === 'mesh' && x.disabled !== '1');
				const [ scan, pw ] = scanDev ? await Promise.all([
					r.call('iwinfo', 'scan', { device: scanDev }, 20000).catch(() => ({ results: [] })),
					r.call('iwinfo', 'txpowerlist', { device: scanDev }).catch(() => ({ results: [] }))
				]) : [ { results: [] }, { results: [] } ];
				return {
					r, radio, band, mesh, up: dev.disabled !== '1' && !!ap,
					cfgChannel: String(dev.channel || 'auto'), channel: Number((ap && ap.channel) || dev.channel) || null,
					width: String(dev.htmode || '').replace(/^[A-Z]+/, '') || '', txpower: dev.txpower ? Number(dev.txpower) : null,
					txmax: Math.max(0, ...((pw && pw.results) || []).map((x) => Number(x.dbm) || 0)) || null,
					seen: ((scan && scan.results) || []).map((x) => ({ ssid: x.ssid || '(versteckt)', bssid: x.bssid, channel: Number(x.channel), signal: Number(x.signal) }))
				};
			}));
			// Ergebnis dieses Routers sofort zeigen
			done[r.id] = res;
			if (onPart) { show(true); onPart(); }
			return res;
		}));
		// eigene WLANs (auch Mesh) sind keine Nachbarn
		const all = perRouter.flat();
		this.routers.forEach((r) => { done[r.id] = all.filter((x) => x.r === r); });
		show(false);
		// letzten Scan merken → beim nächsten Öffnen sofort sichtbar
		Plat.setPref('chanCache', { at: this.chan.at, radios: this.chan.radios.map((x) => Object.assign({}, x, { r: undefined, rid: x.r.id })) }).catch(() => {});
		return this.chan;
	},
	async loadChanCache() {
		const c = await Plat.getPref('chanCache', null).catch(() => null);
		if (!c || this.chan) return;
		const radios = (c.radios || []).map((x) => Object.assign({}, x, { r: this.byId(x.rid) })).filter((x) => x.r);
		if (radios.length) this.chan = { at: c.at, radios, cached: true };
	},
	/* Kanal und Sendeleistung eines Funkmoduls ändern (WLAN dieses Routers startet kurz neu) */
	async setRadio(r, radio, channel, power) {
		await r.uciSet('wireless', radio, { channel: String(channel) });
		if (power === 'max') await r.uciDel('wireless', radio, [ 'txpower' ]).catch(() => {});
		else if (power) await r.uciSet('wireless', radio, { txpower: String(power) });
		await r.uciCommit('wireless');
	},

	/** IPv6-Anschluss (z. B. wan6), falls vorhanden */
	internet6() {
		return (this.ifaces || []).find((i) => i.up && (i.route || []).some((r) => r.target === '::' && r.mask === 0)) || null;
	},
	lanDev() {
		const l = (this.ifaces || []).find((i) => i.interface === 'lan');
		return (l && (l.l3_device || l.device)) || 'br-lan';
	},
	ipOf(mac) {
		const d = this.devices.find((x) => x.mac === macUp(mac));
		return d && d.ip;
	},

	wlans() {
		// WLANs nach Netzwerk gruppiert (SSID + Netz), wie sie auf dem Master eingerichtet sind
		const groups = {};
		for (const s of this.sections(this.wireless, 'wifi-iface')) {
			if (s.mode !== 'ap' || !s.ssid) continue;
			const k = s.ssid + '|' + (s.network || '');
			const g = groups[k] = groups[k] || { ssid: s.ssid, network: s.network || '', secs: [], on: false, key: s.key || '', enc: s.encryption || 'psk2' };
			g.secs.push(s['.name']);
			if (s.disabled !== '1') g.on = true;
		}
		return Object.values(groups).map((g) => Object.assign(g, { guest: /gast|guest/i.test(g.network) }));
	},

	vpn() {
		const wg = this.sections(this.network, 'interface').find((i) => i.proto === 'wireguard');
		if (!wg) return null;
		const live = (((this.wg || {})[wg['.name']]) || {}).peers || [];
		const peers = this.sections(this.network, 'wireguard_' + wg['.name']).map((p) => {
			const l = live.find((x) => x.public_key === p.public_key) || {};
			return Object.assign({}, p, { handshake: Number(l.latest_handshake) || 0, rx: Number(l.transfer_rx) || 0, tx: Number(l.transfer_tx) || 0, endpoint: l.endpoint && l.endpoint !== '(none)' ? l.endpoint : '' });
		});
		const rule = this.sections(this.fw, 'rule').find((r) => String(r.dest_port) === String(wg.listen_port || '51820') && r.src === 'wan');
		return { iface: wg['.name'], on: wg.disabled !== '1', port: wg.listen_port || '51820', addresses: asList(wg.addresses), privkey: wg.private_key, peers, rule };
	},

	/* ---------- Ändern: Hilfen ---------- */
	async commitAll(router, configs) { for (const c of configs) await router.uciCommit(c); },
	async flush(mac) {
		const ip = this.ipOf(mac);
		if (!ip) return;
		await this.master.exec('/usr/sbin/conntrack', [ '-D', '-s', ip ]).catch(() => {});
		await this.master.exec('/usr/sbin/conntrack', [ '-D', '-d', ip ]).catch(() => {});
	},

	/* Internet-Pause für ein Gerät (Regel block_<mac>, wie deine bisherigen Sperren) */
	async pauseDevice(d, on, untilMs) {
		const m = this.master, name = 'block_' + d.id;
		const vals = { name: 'Block ' + d.name, src: '*', dest: 'wan', target: 'REJECT', src_mac: d.mac, enabled: on ? '1' : '0' };
		if (this.rule(name)) await m.uciSet('firewall', name, vals);
		else await m.uciAdd('firewall', 'rule', name, vals);
		if (on && untilMs) await m.uciSet('firewall', name, { phantom_until: String(Math.floor(untilMs / 1000)) });
		else await m.uciDel('firewall', name, [ 'phantom_until' ]).catch(() => {});
		await m.uciCommit('firewall');
		// Ende der Pause plant der Router selbst (cron) – das Handy muss dafür nicht an sein
		const key = 'pause_' + d.id;
		if (on && untilMs) await this.cronSet(m, key, [ this.cronWhen(untilMs) + ' /sbin/uci set firewall.' + name + '.enabled=0; /sbin/uci -q delete firewall.' + name + '.phantom_until; /sbin/uci commit firewall; /etc/init.d/firewall reload; ' + this.selfDelete(key) ]);
		else await this.cronSet(m, key, []).catch(() => {});
		if (on) await this.flush(d.mac);
	},

	/* Bevorzugen: Pakete beim Hochladen markieren (wirkt mit SQM/cake) */
	async setPrio(d, on) {
		const m = this.master, name = 'phantom_prio_' + d.id;
		if (on) await m.uciAdd('firewall', 'rule', name, { name: 'Bevorzugt ' + d.name, src: '*', dest: 'wan', src_mac: d.mac, target: 'DSCP', set_dscp: 'AF41' });
		else await m.uciDel('firewall', name).catch(() => {});
		await m.uciCommit('firewall');
	},

	/* Feste IP = statischer DHCP-Eintrag (host_<mac>, wie dein SSH-Skript) */
	async setFixed(d, on) {
		const m = this.master;
		if (on) {
			const sec = 'host_' + d.id;
			await m.uciAdd('dhcp', 'host', sec, { name: d.name.replace(/[^A-Za-z0-9-]/g, '-').replace(/^-+|-+$/g, '') || 'Geraet', mac: d.mac, ip: d.ip });
		} else {
			for (const h of this.sections(this.dhcp, 'host')) if (asList(h.mac).map(macUp).includes(d.mac)) await m.uciDel('dhcp', h['.name']);
		}
		await m.uciCommit('dhcp');
	},

	async rename(d, name) {
		const m = this.master;
		const clean = name.replace(/[^A-Za-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || d.name;
		if (d.fixedSec) await m.uciSet('dhcp', d.fixedSec, { name: clean });
		else await m.uciAdd('dhcp', 'host', 'host_' + d.id, { name: clean, mac: d.mac, ip: d.ip });
		await m.uciCommit('dhcp');
	},

	async setType(d, type) {
		await this.master.uciAdd('phantom', 'device', 'd_' + d.id, { mac: d.mac, type });
		await this.master.uciCommit('phantom');
	},

	/* Gerät einem Profil zuordnen = MAC in die Regeln des Profils eintragen */
	async setProfile(d, pid) {
		for (const p of this.profiles()) {
			const has = p.macs.includes(d.mac);
			if (p.id === pid && !has) p.macs.push(d.mac);
			else if (p.id !== pid && has) p.macs = p.macs.filter((x) => x !== d.mac);
			else continue;
			await this.writeProfileMacs(p);
		}
		await this.master.uciCommit('firewall');
	},
	async setProfileMacs(pid, macs) {
		for (const p of this.profiles()) {
			const before = p.macs.join();
			if (p.id === pid) p.macs = macs.slice();
			else p.macs = p.macs.filter((x) => !macs.includes(x));
			if (p.macs.join() !== before) await this.writeProfileMacs(p);
		}
		await this.master.uciCommit('firewall');
	},
	/* Geräteliste in Pause-, Limit- und Zeitplan-Regeln des Profils schreiben (ohne Geräte: Platzhalter + aus) */
	async writeProfileMacs(p) {
		const m = this.master, macs = p.macs.length ? p.macs : [ NOMAC ];
		await m.uciSet('firewall', 'phantom_ppause_' + p.id, { src_mac: macs, enabled: p.macs.length && p.paused ? '1' : '0' });
		const lim = this.rule('phantom_limit_' + p.id);
		// Ein/Aus der Limit-Sperre steuert der Zähler auf dem Router – hier nur die Geräte (oder aus, wenn keine mehr)
		if (lim) await m.uciSet('firewall', 'phantom_limit_' + p.id, p.macs.length ? { src_mac: macs } : { src_mac: macs, enabled: '0' });
		for (const r of Object.values(this.fw || {})) {
			if (r['.type'] !== 'rule' || !/^phantom_sched_/.test(r['.name']) || r.phantom_profile !== p.id) continue;
			const want = r.phantom_enabled ? r.phantom_enabled === '1' : r.enabled !== '0';
			await m.uciSet('firewall', r['.name'], { src_mac: macs, enabled: want && p.macs.length ? '1' : '0' });
		}
	},

	async saveProfile(p) {
		const m = this.master;
		const id = p.id || ('p' + Date.now().toString(36));
		const old = this.profiles().find((x) => x.id === id);
		const macs = old && old.macs.length ? old.macs : [ NOMAC ];
		await m.uciAdd('firewall', 'rule', 'phantom_ppause_' + id, {
			name: 'Pause ' + p.name, src: '*', dest: 'wan', target: 'REJECT', src_mac: macs, enabled: old && old.paused && old.macs.length ? '1' : '0',
			phantom_name: p.name, phantom_color: p.color, phantom_kid: p.kid ? '1' : '0', phantom_limit: String((old && old.limit) || 0)
		});
		await m.uciCommit('firewall');
		return id;
	},
	async deleteProfile(pid) {
		const m = this.master;
		for (const n of Object.keys(this.fw || {})) {
			const r = this.fw[n];
			if (n === 'phantom_ppause_' + pid || n === 'phantom_limit_' + pid || (/^phantom_sched_/.test(n) && r.phantom_profile === pid)) await m.uciDel('firewall', n).catch(() => {});
		}
		await m.uciCommit('firewall');
	},
	async setLimit(pid, minutes) {
		await this.master.uciSet('firewall', 'phantom_ppause_' + pid, { phantom_limit: String(minutes) });
		const p = this.profiles().find((x) => x.id === pid);
		if (!minutes && !(p && p.limitWe)) await this.master.uciDel('firewall', 'phantom_limit_' + pid).catch(() => {});
		await this.master.uciCommit('firewall');
	},
	/* Wochenende: eigenes Limit (null = wie werktags) */
	async setLimitWe(pid, minutes) {
		if (minutes == null) await this.master.uciDel('firewall', 'phantom_ppause_' + pid, [ 'phantom_limit_we' ]).catch(() => {});
		else await this.master.uciSet('firewall', 'phantom_ppause_' + pid, { phantom_limit_we: String(minutes) });
		await this.master.uciCommit('firewall');
	},
	/* ---------- Tageslimit für heute (gleiche Regeln wie der Zähler auf dem Router) ---------- */
	limitDay() { return this.today.day || ymd(new Date()); },
	isWeekend(day) { const w = new Date(day + 'T12:00:00').getDay(); return w === 0 || w === 6; },
	limitOn(p, day) { return this.isWeekend(day) && p.limitWe != null ? p.limitWe : p.limit; },
	bonusToday(p) { return p.bonusDay === this.limitDay() ? p.bonus : 0; },
	limitToday(p) { const l = this.limitOn(p, this.limitDay()); return l > 0 ? l + this.bonusToday(p) : 0; },
	async giveBonus(pid, add) {
		const p = this.profiles().find((x) => x.id === pid);
		if (!p) return;
		await this.master.uciSet('firewall', 'phantom_ppause_' + pid, { phantom_bonus: String(this.bonusToday(p) + add), phantom_bonus_day: this.limitDay() });
		await this.master.uciCommit('firewall');
	},
	async undoBonus(pid) {
		await this.master.uciDel('firewall', 'phantom_ppause_' + pid, [ 'phantom_bonus', 'phantom_bonus_day' ]).catch(() => {});
		await this.master.uciCommit('firewall');
	},
	/* Nutzungszeit der letzten 7 Tage (Minuten je Tag) */
	profileWeek(pid) {
		const days = (this.week.days || []).slice(-6).map((x) => ({ day: x.day, min: (x.minutes || {})[pid] || 0 }));
		days.push({ day: this.limitDay(), min: (this.today.minutes || {})[pid] || 0, today: true });
		return days;
	},
	/* Datenverbrauch: Tage des laufenden Monats und die letzten Monate (mac = null → alle Geräte) */
	sumMacs(macs, mac) { return mac ? (macs || {})[mac] || 0 : Object.values(macs || {}).reduce((a, b) => a + b, 0); },
	monthDays(mac) {
		const mon = this.limitDay().slice(0, 7);
		const days = (this.week.days || []).filter((x) => String(x.day).startsWith(mon)).map((x) => ({ day: x.day, bytes: this.sumMacs(x.macs, mac) }));
		days.push({ day: this.limitDay(), bytes: this.sumMacs(this.today.macs, mac), today: true });
		return days;
	},
	monthsOf(mac) {
		const mon = this.limitDay().slice(0, 7);
		const list = (this.week.months || []).filter((x) => x.month !== mon).map((x) => ({ month: x.month, bytes: this.sumMacs(x.macs, mac) }));
		const cur = (this.week.months || []).find((x) => x.month === mon);
		list.push({ month: mon, bytes: this.sumMacs(cur && cur.macs, mac) + this.sumMacs(this.today.macs, mac), now: true });
		return list.slice(-6);
	},
	/* Verbrauch je Gerät: heute oder im laufenden Monat */
	usageByMac(month) {
		const out = Object.assign({}, this.today.macs || {});
		if (month) {
			const cur = (this.week.months || []).find((x) => x.month === this.limitDay().slice(0, 7));
			for (const [ m, b ] of Object.entries((cur && cur.macs) || {})) out[m] = (out[m] || 0) + b;
		}
		return out;
	},
	async pauseProfile(pid, on) {
		const p = this.profiles().find((x) => x.id === pid);
		if (!p) return;
		if (on && !p.macs.length) throw new Error('Diesem Profil sind noch keine Geräte zugeordnet');
		await this.master.uciSet('firewall', 'phantom_ppause_' + pid, { enabled: on ? '1' : '0' });
		await this.master.uciCommit('firewall');
		if (on) for (const mac of p.macs) await this.flush(mac);
	},
	async saveSchedule(s) {
		const m = this.master;
		const p = this.profiles().find((x) => x.id === s.profile);
		if (!p) throw new Error('Profil nicht gefunden');
		const id = s.id || (s.profile + '_' + Date.now().toString(36));
		await m.uciDel('firewall', 'phantom_sched_' + id).catch(() => {});
		await m.uciDel('firewall', 'phantom_sched_' + id + '_b').catch(() => {});
		const macs = p.macs.length ? p.macs : [ NOMAC ];
		// über Mitternacht: zwei Regeln (bis 23:59 und ab 00:00 am Folgetag)
		const parts = s.start < s.stop ? [ [ s.start, s.stop, '' ] ] : [ [ s.start, '23:59', '' ], [ '00:00', s.stop, '_b' ] ];
		for (const [ a, b, suf ] of parts) {
			const days = suf ? s.days.map((x) => DAYS[(DAYS.indexOf(x) + 1) % 7]) : s.days;
			await m.uciAdd('firewall', 'rule', 'phantom_sched_' + id + suf, {
				name: 'Zeitplan ' + p.name + ': ' + s.label, src: '*', dest: 'wan', target: 'REJECT', src_mac: macs,
				start_time: a + ':00', stop_time: b === '23:59' ? '23:59:59' : b + ':00', weekdays: days.join(' '),
				enabled: s.enabled && p.macs.length ? '1' : '0', phantom_enabled: s.enabled ? '1' : '0',
				phantom_profile: p.id, phantom_label: s.label, phantom_start: s.start, phantom_stop: s.stop, phantom_days: s.days.join(' ')
			});
		}
		await m.uciCommit('firewall');
	},
	async deleteSchedule(id) {
		await this.master.uciDel('firewall', 'phantom_sched_' + id).catch(() => {});
		await this.master.uciDel('firewall', 'phantom_sched_' + id + '_b').catch(() => {});
		await this.master.uciCommit('firewall');
	},

	/* ---------- Tageslimit-Zähler: Paket „phantom-agent“, steckt in der App (www/agent/) ----------
	   Installation wie „Paket hochladen“ in der Weboberfläche: Paket nach /tmp/upload.apk,
	   dann die Paketverwaltung des Routers. Das Paket ist mit eigenem Schlüssel signiert;
	   der öffentliche Schlüssel liegt nur während der Installation auf dem Router. */
	AGENT_VER: '1.1.0',
	agentVer() { return (this.today && this.today.ver) || ''; },
	agentOld() {
		const a = fwParse(this.agentVer()), b = fwParse(this.AGENT_VER);
		return !!a && !!b && ((a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2])) < 0;
	},
	async agentFile(path, b64) {
		const r = await fetch(path, { cache: 'no-store' });
		if (!r.ok) throw new Error('Paket fehlt in der App');
		if (!b64) return r.text();
		const u = new Uint8Array(await r.arrayBuffer());
		let s = '';
		for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
		return btoa(s);
	},
	async agentPm(args, router) {
		let r;
		try { r = await (router || this.master).exec('/usr/libexec/package-manager-call', args, 90000); } catch (e) {
			if (e.ubus === 6 || e.ubus === 4) throw new Error('Der Router erlaubt keine Paket-Installation (in der Weboberfläche fehlt „Software“)');
			throw e;
		}
		let o = {};
		try { o = JSON.parse(r.stdout || '{}'); } catch (e) { /* keine Antwort */ }
		if (r.code || o.code) throw new Error(String(o.stderr || r.stderr || 'Paketverwaltung meldet Fehler ' + (o.code || r.code)).trim().split('\n').pop());
		return o;
	},
	async agentInstall() {
		if (!this.master) throw new Error('Kein Master eingerichtet');
		await this.pkgInstall(this.master, 'agent/phantom-agent.apk');
	},
	/* Router-Rechte als Paket „phantom-rights“ (nur die Rechte-Datei für rpcd) – ersetzt den SSH-Block */
	async rightsInstall(r) { await this.pkgInstall(r, 'agent/phantom-rights.apk'); },
	async rightsRemove(r) { await this.agentPm([ 'remove', 'phantom-rights' ], r); await new Promise((res) => setTimeout(res, 5000)); },
	async pkgInstall(m, file) {
		const [ apk, key ] = await Promise.all([ this.agentFile(file, true), this.agentFile('agent/phantom-agent.pem') ]);
		const KEY = '/etc/apk/keys/phantom-agent.pem', PKG = '/tmp/upload.apk';
		try {
			await m.call('file', 'write', { path: KEY, data: key });
			await m.call('file', 'write', { path: PKG, data: apk, base64: true });
			await this.agentPm([ 'install', PKG ], m);
		} catch (e) {
			if (e.ubus === 6) throw new Error('Der Router erlaubt keine Paket-Installation (in der Weboberfläche fehlt „Software“)');
			throw e;
		} finally {
			await m.call('file', 'remove', { path: KEY }).catch(() => {});
			await m.call('file', 'remove', { path: PKG }).catch(() => {});
		}
		await new Promise((res) => setTimeout(res, 5000));   // Router lädt die neuen Leserechte
		// Schlüssel sicher wieder weg (falls das Aufräumen in den Neustart der Rechte fiel)
		if (await m.call('file', 'stat', { path: KEY }).then(() => true, () => false)) await m.call('file', 'remove', { path: KEY }).catch(() => {});
	},
	async agentRemove() {
		await this.agentPm([ 'remove', 'phantom-agent' ]);
		await new Promise((res) => setTimeout(res, 5000));
	},

	/* ---------- Zeitgesteuertes über cron (Standard in OpenWrt, wie „Geplante Aufgaben“ in LuCI) ----------
	   Jede Zeile der App endet mit „# phantom:<name>“, alles andere in der crontab bleibt unberührt. */
	async cronRead(r) {
		try { return (await r.call('file', 'read', { path: '/etc/crontabs/root' })).data || ''; } catch (e) {
			if (e.ubus === 4) return '';      // noch keine crontab
			throw e;                          // sonst lieber nichts schreiben als etwas zu löschen
		}
	},
	async cronSet(r, key, lines) {
		const tag = '# phantom:' + key;
		const keep = (await this.cronRead(r)).split('\n').filter((l) => l.trim() && !l.endsWith(tag));
		const out = keep.concat(lines.map((l) => l + ' ' + tag));
		const data = out.length ? out.join('\n') + '\n' : '';
		await r.call('file', 'write', { path: '/etc/crontabs/root', data });
		await r.exec('/etc/init.d/cron', [ 'reload' ]).catch(() => {});
		this.cron[r.id] = data;
	},
	cronLines(r, key) {
		const t = (r && this.cron[r.id]) || '';
		return t.split('\n').filter((l) => l.endsWith('# phantom:' + key));
	},
	/* Zeitpunkt einer einmaligen Zeile „M H T Mo *“ */
	cronAt(r, key) {
		const l = this.cronLines(r, key)[0];
		if (!l) return null;
		const f = l.trim().split(/\s+/);
		const d = new Date(); d.setMonth(Number(f[3]) - 1, Number(f[2])); d.setHours(Number(f[1]), Number(f[0]), 0, 0);
		if (d.getTime() < Date.now() - 86400000) d.setFullYear(d.getFullYear() + 1);
		return d.getTime();
	},
	cronWhen(ms) { const d = new Date(ms); return d.getMinutes() + ' ' + d.getHours() + ' ' + d.getDate() + ' ' + (d.getMonth() + 1) + ' *'; },
	wifiCmd(sections, disabled) {
		return sections.map((x) => '/sbin/uci set wireless.' + x + '.disabled=' + disabled).join('; ') + '; /sbin/uci commit wireless; /sbin/wifi reload';
	},
	selfDelete(key) { return "sed -i '/# phantom:" + key + "$/d' /etc/crontabs/root"; },

	/* WLAN auf allen Router schalten (gleiche SSID); Gäste-WLAN optional mit Ausschalt-Zeit */
	async setWlan(ssid, on, opts) {
		opts = opts || {};
		const errs = [];
		for (const r of this.routers) {
			try {
				const w = await r.uciGet('wireless');
				const secs = Object.values(w).filter((s) => s['.type'] === 'wifi-iface' && s.ssid === ssid && s.mode === 'ap').map((s) => s['.name']);
				for (const x of secs) await r.uciSet('wireless', x, { disabled: on ? '0' : '1' });
				if (secs.length) await r.uciCommit('wireless');
				if (opts.offAt !== undefined && secs.length) {
					if (on && opts.offAt) await this.cronSet(r, 'guest', [ this.cronWhen(opts.offAt) + ' ' + this.wifiCmd(secs, 1) + '; ' + this.selfDelete('guest') ]);
					else await this.cronSet(r, 'guest', []);
				}
			} catch (e) { errs.push(r.name); }
		}
		return errs;
	},
	guestOffAt() { return this.cronAt(this.master, 'guest'); },

	/* Nachtmodus: Haupt-WLAN (Netz „lan“) zu festen Zeiten aus/an – auf jedem Router per cron */
	night() {
		const ls = this.cronLines(this.master, 'night');
		const off = ls.find((l) => /disabled=1/.test(l)), onl = ls.find((l) => /disabled=0/.test(l));
		const hm = (l) => { const f = l.trim().split(/\s+/); return String(f[1]).padStart(2, '0') + ':' + String(f[0]).padStart(2, '0'); };
		return { on: !!(off && onl), start: off ? hm(off) : '00:00', stop: onl ? hm(onl) : '06:00' };
	},
	async setNight(on, start, stop) {
		const errs = [];
		const at = (hm) => { const [ h, mi ] = hm.split(':').map(Number); return mi + ' ' + h + ' * * *'; };
		for (const r of this.routers) {
			try {
				const w = await r.uciGet('wireless');
				const secs = Object.values(w).filter((s) => s['.type'] === 'wifi-iface' && s.network === 'lan' && s.mode === 'ap').map((s) => s['.name']);
				await this.cronSet(r, 'night', on && secs.length ? [ at(start) + ' ' + this.wifiCmd(secs, 1), at(stop) + ' ' + this.wifiCmd(secs, 0) ] : []);
			} catch (e) { errs.push(r.name); }
		}
		return errs;
	},

	async kick(d) {
		const r = this.byId(d.cudy);
		if (!r || !d.ifname) throw new Error('Gerät ist nicht im WLAN');
		await r.call('hostapd.' + d.ifname, 'del_client', { addr: d.mac.toLowerCase(), reason: 5, deauth: true, ban_time: 60000 });
	},
	async wake(d) {
		return this.master.exec('/usr/bin/etherwake', [ '-i', this.lanDev(), d.mac ]);
	},
	async reboot(r) { return r.call('system', 'reboot', {}); },

	async ping(host) { return this.master.exec('/bin/ping', [ '-c', '4', '-W', '2', host ], 20000); },
	// Traceroute dauert: bis zu 15 Stationen × 1 s – deshalb längere Wartezeit
	async trace(host) { return this.master.exec('/bin/traceroute', [ '-n', '-w', '1', '-q', '1', '-m', '15', host ], 30000); },

	/* ---------- VPN (WireGuard auf dem Master) ---------- */
	async setVpn(on) {
		const v = this.vpn();
		if (!v) throw new Error('Kein WireGuard-Netz eingerichtet');
		await this.master.uciSet('network', v.iface, { disabled: on ? '0' : '1' });
		if (v.rule) await this.master.uciSet('firewall', v.rule['.name'], { enabled: on ? '1' : '0' });
		await this.master.uciCommit('network');
		await this.master.uciCommit('firewall');
	},
	async addVpnPeer(label, endpoint, fullTunnel) {
		const v = this.vpn();
		if (!v) throw new Error('Kein WireGuard-Netz eingerichtet');
		const m = this.master;
		const kp = await m.call('luci.wireguard', 'generateKeyPair', {});
		const keys = kp.keys || kp;
		const srv = await m.call('luci.wireguard', 'getPublicAndPrivateKeyFromPrivate', { privkey: v.privkey });
		const srvPub = (srv.keys || srv).pubkey;
		// freie Adresse im VPN-Netz (aus der WireGuard-Schnittstelle, nichts fest eingetragen)
		const [ vAddr, vBits ] = String(v.addresses[0] || '').split('/');
		if (ipNum(vAddr) === null) throw new Error('Das VPN-Netz hat noch keine IPv4-Adresse – bitte in der Weboberfläche eintragen');
		const bits = Number(vBits) || 24;
		const used = new Set([ ipNum(vAddr), ...v.peers.map((p) => ipNum(String(asList(p.allowed_ips)[0] || '').split('/')[0])) ]);
		const first = (ipNum(vAddr) & maskNum(bits)) >>> 0, size = 2 ** (32 - bits);
		let num = null;
		for (let k = 2; k < size - 1; k++) if (!used.has((first + k) >>> 0)) { num = (first + k) >>> 0; break; }
		if (num === null) throw new Error('Im VPN-Netz ist keine Adresse mehr frei');
		const addr = [ num >>> 24, (num >>> 16) & 255, (num >>> 8) & 255, num & 255 ].join('.');
		const sec = 'wgpeer_' + Date.now().toString(36);
		await m.uciAdd('network', 'wireguard_' + v.iface, sec, { description: label, public_key: keys.pubkey, private_key: keys.privkey, allowed_ips: [ addr + '/32' ], route_allowed_ips: '0' });
		await m.uciCommit('network');
		// Netze des Masters (ohne Internet-Seite, Gäste und das VPN selbst) – für „nur Zuhause“
		const homeNets = (this.ifaces || []).filter((i) => i.up && i.interface !== v.iface && netKeyOf(i.interface) !== 'gast' && !(i.route || []).some((r) => r.target === '0.0.0.0' && r.mask === 0))
			.flatMap((i) => (i['ipv4-address'] || []).map((a) => ({ name: i.interface, net: netAddr(a.address, a.mask), ip: a.address })));
		const lanNet = homeNets.find((x) => x.name === 'lan') || homeNets[0];
		const lanIp = lanNet ? lanNet.ip : '';
		const vpnNet = netAddr(vAddr, bits);
		const conf = [
			'[Interface]', 'PrivateKey = ' + keys.privkey, 'Address = ' + addr + '/32', lanIp ? 'DNS = ' + lanIp : '', '',
			'[Peer]', 'PublicKey = ' + srvPub, 'Endpoint = ' + endpoint + ':' + v.port,
			'AllowedIPs = ' + (fullTunnel ? '0.0.0.0/0' : [ ...new Set([ ...homeNets.map((x) => x.net), vpnNet ]) ].join(', ')),
			'PersistentKeepalive = 25'
		].filter((x) => x !== null).join('\n');
		return conf;
	},
	async removeVpnPeer(sec) {
		await this.master.uciDel('network', sec);
		await this.master.uciCommit('network');
	},
	async setVpnEndpoint(ep) { await Plat.setPref('vpnEndpoint', ep); },
};

window.Net = Net;
window.macId = macId; window.macUp = macUp; window.asList = asList; window.DAYS = DAYS; window.DAY_DE = DAY_DE;
