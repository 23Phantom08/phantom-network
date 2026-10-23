#!/bin/sh
# Builds phantom-rights.apk – only the rpcd permission file for the app – and signs it
# with the same key as phantom-agent (../agent/keys, created there if missing).
#   ./build.sh [path/to/apk] [path/to/app/www]
# apk = apk-tools 3 with "mkpkg" (e.g. from the OpenWrt Image Builder: staging_dir/host/bin/apk)
set -e
WWW="${2:+$(cd "$2" && pwd)}"
cd "$(dirname "$0")"
APK="${1:-apk}"
NAME=phantom-rights
VERSION=1.0.0-r1
K=../agent/keys

mkdir -p $K out
if [ ! -f $K/phantom-agent.key ]; then
	openssl ecparam -name prime256v1 -genkey -noout -out $K/phantom-agent.key
	openssl ec -in $K/phantom-agent.key -pubout -out $K/phantom-agent.pem
fi

rm -rf out/root && cp -a files out/root
mkdir -p out/root/lib/apk/packages
(cd out/root && find . -type f,l -printf "/%P\n" | sort > lib/apk/packages/$NAME.list)

"$APK" mkpkg \
	--info "name:$NAME" \
	--info "version:$VERSION" \
	--info "description:Router permissions for the Phantom Network app" \
	--info "arch:noarch" \
	--info "license:GPL-3.0-or-later" \
	--info "origin:$NAME" \
	--info "depends:rpcd" \
	--script "post-install:scripts/post-install" \
	--script "post-upgrade:scripts/post-install" \
	--script "post-deinstall:scripts/post-deinstall" \
	--files out/root \
	--output "out/$NAME.apk"

"$APK" adbsign --allow-untrusted --sign-key $K/phantom-agent.key "out/$NAME.apk"
rm -rf out/root
echo "done: out/$NAME.apk ($VERSION)"

if [ -n "$WWW" ]; then
	mkdir -p "$WWW/agent"
	cp "out/$NAME.apk" "$WWW/agent/"
	echo "copied into the app: $WWW/agent/"
fi
