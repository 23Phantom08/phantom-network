#!/bin/sh
# Builds phantom-agent.apk and signs it with your own key.
#   ./build.sh [path/to/apk] [path/to/app/www]
# With the second path, package and public key are copied straight into the app
# (and it checks that AGENT_VER in data.js matches the version).
# apk = apk-tools 3 with "mkpkg" (e.g. from the OpenWrt Image Builder:
#        staging_dir/host/bin/apk)
# Keys live in keys/ – if they are missing, a new pair is created once.
set -e
cd "$(dirname "$0")"
APK="${1:-apk}"
NAME=phantom-agent
VERSION=$(sed -n "s/^const VERSION = '\(.*\)';/\1/p" files/usr/share/phantom/agent.uc)-r1

mkdir -p keys out
if [ ! -f keys/phantom-agent.key ]; then
	openssl ecparam -name prime256v1 -genkey -noout -out keys/phantom-agent.key
	openssl ec -in keys/phantom-agent.key -pubout -out keys/phantom-agent.pem
fi

rm -rf out/root && cp -a files out/root
mkdir -p out/root/lib/apk/packages
(cd out/root && find . -type f,l -printf "/%P\n" | sort > lib/apk/packages/$NAME.list)

"$APK" mkpkg \
	--info "name:$NAME" \
	--info "version:$VERSION" \
	--info "description:Daily limit and usage time for the Phantom Network app" \
	--info "arch:noarch" \
	--info "license:GPL-3.0-or-later" \
	--info "origin:$NAME" \
	--info "depends:ucode ucode-mod-fs ucode-mod-uci ucode-mod-uloop firewall4" \
	--script "post-install:scripts/post-install" \
	--script "post-upgrade:scripts/post-upgrade" \
	--script "pre-deinstall:scripts/pre-deinstall" \
	--script "post-deinstall:scripts/post-deinstall" \
	--files out/root \
	--output "out/$NAME.apk"

"$APK" adbsign --allow-untrusted --sign-key keys/phantom-agent.key "out/$NAME.apk"
rm -rf out/root
echo "done: out/$NAME.apk ($VERSION)"

if [ -n "$2" ]; then
	mkdir -p "$2/agent"
	cp "out/$NAME.apk" keys/phantom-agent.pem "$2/agent/"
	V=${VERSION%-r*}
	grep -q "AGENT_VER: '$V'" "$2/js/data.js" \
		&& echo "copied into the app: $2/agent/" \
		|| { echo "WARNING: AGENT_VER in $2/js/data.js is not '$V' – please update it" >&2; exit 1; }
fi
