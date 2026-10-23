# phantom-agent

Daily limit and usage counter for the Phantom Network app. Runs on the master router only.
It needs no extra packages – only what OpenWrt 25.12 already ships
(ucode, uci, fw4 and the kernel's connection tracking).

The app installs the package by itself (Family → profile → set up daily limit,
or the master's router page). This folder only holds the source for rebuilding it.

## What it does

- counts every minute in which a device noticeably uses data (per MAC) and the data volume per day and month
- enforces daily limits (with weekend limit and bonus time) via the app's firewall rules
- cuts running connections of a device as soon as it gets blocked (pause, profile pause, schedule or limit) – about every 15 seconds
- keeps 35 days of daily values and 12 months of monthly totals in `/etc/phantom/`

## Contents

| File | Purpose |
|---|---|
| `files/usr/share/phantom/agent.uc` | the counter (procd service, runs permanently) |
| `files/etc/init.d/phantom-agent` | start/stop the service |
| `files/usr/share/rpcd/acl.d/phantom-agent.json` | read permissions for the app |
| `scripts/*` | install / upgrade / remove hooks |
| `build.sh` | builds and signs `out/phantom-agent.apk` |
| `keys/` | signing key pair (not in the repository – created on the first build) |

## Rebuilding (only needed when the agent changes)

With the `apk` tool from the OpenWrt Image Builder (it includes `mkpkg`):

```sh
docker run --rm -v "$PWD/agent:/agent" -v "$PWD/app/www:/www" openwrt/imagebuilder:mediatek-filogic-v25.12.6 \
  sh -c './setup.sh >/dev/null && /agent/build.sh "$PWD/staging_dir/host/bin/apk" /www'
```

Bump `VERSION` in `agent.uc` and `AGENT_VER` in `app/www/js/data.js` first –
the app only offers the update when the version changes. With the second path,
`build.sh` copies the package and the public key to `app/www/agent/`.

If you build with your own key, the app installs your public key on the router together with the package,
so a self-built app and agent always match. Keep `keys/phantom-agent.key` private.

## Settings (optional)

```sh
uci set phantom.agent=agent
uci set phantom.agent.min_bytes=20000   # bytes per minute from which a minute counts as used
uci commit phantom
```
