/* ubus/JSON-RPC – dieselbe Schnittstelle wie Weboberfläche, LuCI und die HA-Integration */
'use strict';

const NULL_SID = '00000000000000000000000000000000';

class Router {
	constructor(o) {
		this.id = o.id;                 // stabil: Adresse beim ersten Fund
		this.host = o.host;             // Adresse (aus Suche oder von Hand)
		this.proto = o.proto || 'http';
		this.name = o.name || o.host;
		this.role = o.role || 'ap';
		this.model = o.model || '';
		this.user = o.user || 'root';
		this.pin = o.pin || '';         // gemerktes Zertifikat (HTTPS)
		this.sid = null;
		this.online = false;
		this.lastError = '';
	}
	get url() { return this.proto + '://' + this.host + '/ubus'; }
	toJSON() { return { id: this.id, host: this.host, proto: this.proto, name: this.name, role: this.role, model: this.model, user: this.user, pin: this.pin }; }

	async rpc(sid, object, method, params, timeout) {
		const body = { jsonrpc: '2.0', id: Date.now(), method: 'call', params: [ sid, object, method, params || {} ] };
		let r;
		try { r = await Plat.httpJson(this.url, body, { pin: this.pin, timeout }); } catch (e) {
			// HTTPS, erster Kontakt: Zertifikat merken (wie SSH beim ersten Verbinden).
			// Hat sich ein gemerktes Zertifikat geändert, wird NIE automatisch übernommen.
			if (!(e.needTrust && !e.changed && !this.pin && e.fingerprint && Router.autoTrust)) throw e;
			this.pin = e.fingerprint;
			if (Router.onPin) await Router.onPin(this);
			r = await Plat.httpJson(this.url, body, { pin: this.pin, timeout });
		}
		if (r.error) { const e = new Error(r.error.message || 'Fehler'); e.code = r.error.code; throw e; }
		const res = r.result || [];
		if (res[0] !== 0) {
			const e = new Error(res[0] === 6 ? 'Keine Berechtigung' : res[0] === 4 ? 'Nicht gefunden' : 'Fehler ' + res[0]);
			e.ubus = res[0];
			throw e;
		}
		return res[1] || {};
	}

	async login(password) {
		const r = await this.rpc(NULL_SID, 'session', 'login', { username: this.user, password });
		if (!r.ubus_rpc_session) throw new Error('Anmeldung fehlgeschlagen');
		this.sid = r.ubus_rpc_session;
		this.online = true;
		return true;
	}

	/* Aufruf mit automatischer Neuanmeldung, wenn die Sitzung abgelaufen ist */
	async call(object, method, params, timeout) {
		if (!this.sid) await this.relogin();
		try {
			const r = await this.rpc(this.sid, object, method, params, timeout);
			this.online = true;
			return r;
		} catch (e) {
			if (e.code === -32002 || e.ubus === 6) {
				await this.relogin();
				return this.rpc(this.sid, object, method, params, timeout);
			}
			if (!e.ubus) { this.online = false; this.lastError = e.message; }
			throw e;
		}
	}
	async relogin() {
		const pw = await Plat.getSecret('pw.' + this.id);
		if (pw == null) { const e = new Error('Passwort fehlt'); e.needLogin = true; throw e; }
		await this.login(pw);
	}

	/* ---------- Helfer ---------- */
	async uciGet(config) { return (await this.call('uci', 'get', { config })).values || {}; }
	async uciSet(config, section, values) { return this.call('uci', 'set', { config, section, values }); }
	async uciAdd(config, type, name, values) { return this.call('uci', 'add', { config, type, name, values }); }
	async uciDel(config, section, options) { return this.call('uci', 'delete', options ? { config, section, options } : { config, section }); }
	/* Speichern und den Dienst gezielt neu laden
	   (verlässt sich nicht nur auf das automatische Neuladen nach dem Speichern) */
	async uciCommit(config) {
		const r = await this.call('uci', 'commit', { config });
		const reload = { wireless: [ 'network', 'reload', {} ], network: [ 'network', 'reload', {} ],
			firewall: [ 'rc', 'init', { name: 'firewall', action: 'reload' } ], dhcp: [ 'rc', 'init', { name: 'dnsmasq', action: 'reload' } ] }[config];
		if (reload) await this.call(reload[0], reload[1], reload[2]).catch(() => {});
		return r;
	}
	async exec(command, params, timeout) { return this.call('file', 'exec', { command, params: params || [] }, timeout); }
	async read(path) { try { return (await this.call('file', 'read', { path })).data || ''; } catch (e) { return ''; } }
	async readJson(path, dflt) { try { return JSON.parse(await this.read(path)) || dflt; } catch (e) { return dflt; } }
}

Router.autoTrust = true;
window.Router = Router;
window.NULL_SID = NULL_SID;
