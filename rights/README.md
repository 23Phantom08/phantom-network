# phantom-rights

Router permissions for the Phantom Network app, as a tiny package.

Stock OpenWrt does not allow every ubus call and file read for `root` over the RPC interface the app uses
(for example the Wi‑Fi client list, the ARP table and the temperature). This package only adds one rpcd ACL file,
`/usr/share/rpcd/acl.d/phantom-rights.json`, and lists it in `/etc/sysupgrade.conf` so it survives a firmware
update with "keep settings". Nothing else is installed or changed.

The app installs it on all routers with one tap (More → Router packages) and it can be removed again in LuCI
under System → Software. It can coexist with a `root.json` that was added by hand via SSH.

Build: `./build.sh path/to/apk ../app/www` – see [`../agent/README.md`](../agent/README.md) for the `apk` tool.
