# phantom-agent

Daily limit and usage counter for the Phantom Network app. Runs on the master router only.
It needs no extra packages – only what OpenWrt 25.12 already ships
(ucode, uci, fw4 and the kernel's connection tracking).

The app installs the package by itself (Family → profile → set up daily limit,
or the master's router page). This folder holds its source.

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

## Settings (optional)

```sh
uci set phantom.agent=agent
uci set phantom.agent.min_bytes=20000   # bytes per minute from which a minute counts as used
uci commit phantom
```
