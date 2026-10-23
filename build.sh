#!/bin/bash
# Phantom Network app – build the APK (runs inside the container, see docker-compose.yml)
# Result: out/PhantomNetwork-<version>.apk and out/PhantomNetwork-latest.apk
set -e
W=/work
# Tools/caches live in a Docker volume (not in the Synology share – tar fails there with “Function not implemented”)
C=/cache
# the build runs on a copy inside the container; only the APK and the keys end up in the project folder
B=/build
export ANDROID_HOME=$C/android-sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export GRADLE_USER_HOME=$C/gradle
export npm_config_cache=$C/npm
export PATH=$C/node/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

VERSION_NAME=${APP_VERSION:-1.0}
VERSION_CODE=$(date +%y%m%d%H)   # increases with every build → installs as an update over the old app

log() { echo; echo "=== $* ==="; }
retry() { local n=0; until "$@"; do n=$((n+1)); [ $n -ge 5 ] && return 1; echo "… failed, retry $n/5 in 10 s"; sleep 10; done; }
fetch() { retry curl -fL --retry 3 --connect-timeout 30 -o "$2" "$1"; }

mkdir -p $C $W/out $W/keys

log "Checking tools"
if ! command -v unzip >/dev/null || ! command -v xz >/dev/null || ! command -v curl >/dev/null; then
	retry apt-get update -qq
	retry apt-get install -y -qq unzip xz-utils curl ca-certificates >/dev/null
fi

# ---------- Node.js 22 ----------
if [ ! -x $C/node/bin/node ]; then
	log "Downloading Node.js 22"
	NODE_TAR=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | grep -o 'node-v22[0-9.]*-linux-x64.tar.xz' | head -1)
	[ -n "$NODE_TAR" ] || { echo "Node version not found"; exit 1; }
	fetch "https://nodejs.org/dist/latest-v22.x/$NODE_TAR" /tmp/node.tar.xz
	rm -rf $C/node && mkdir -p $C/node
	tar --no-same-owner -xJf /tmp/node.tar.xz -C $C/node --strip-components=1
	rm -f /tmp/node.tar.xz
fi
echo "Node $(node -v), npm $(npm -v)"

# ---------- Android SDK ----------
if [ ! -x $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager ]; then
	log "Downloading Android command-line tools"
	ZIP=$(curl -fsSL https://dl.google.com/android/repository/repository2-3.xml | grep -o 'commandlinetools-linux-[0-9]*_latest.zip' | sort -t- -k3 -n | tail -1)
	[ -n "$ZIP" ] || { echo "cmdline-tools not found"; exit 1; }
	fetch "https://dl.google.com/android/repository/$ZIP" /tmp/clt.zip
	rm -rf $ANDROID_HOME/cmdline-tools && mkdir -p $ANDROID_HOME/cmdline-tools
	unzip -q /tmp/clt.zip -d $ANDROID_HOME/cmdline-tools
	mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest
	rm -f /tmp/clt.zip
fi
if [ ! -d $ANDROID_HOME/platforms/android-36 ] || [ ! -d $ANDROID_HOME/build-tools/36.0.0 ]; then
	log "Installing Android SDK 36 (once, about 1 GB)"
	yes | sdkmanager --licenses >/dev/null || true
	retry sdkmanager --install "platforms;android-36" "build-tools;36.0.0" "platform-tools"
fi
BT=$ANDROID_HOME/build-tools/36.0.0

# ---------- App ----------
log "Copying project into the container"
rm -rf $B && mkdir -p $B && cp -r $W/app $B/app
cd $B/app
log "npm packages"
retry npm ci --no-audit --no-fund
# Capacitor core for the page (needed without a bundler, otherwise all plugins are missing)
cp -f node_modules/@capacitor/core/dist/capacitor.js www/vendor/capacitor.js
log "Copying web part into the Android project"
npx cap sync android

log "Building APK (version $VERSION_NAME / $VERSION_CODE) – first build takes 10–20 minutes"
cd android
chmod +x gradlew
retry ./gradlew --no-daemon --console=plain assembleRelease \
	-PphantomVersionCode=$VERSION_CODE -PphantomVersionName=$VERSION_NAME

# ---------- Signing ----------
KS=$B/phantom.jks
PASSF=$B/passwort.txt
if [ -f $W/keys/phantom.jks ] && [ -f $W/keys/passwort.txt ]; then
	cp $W/keys/phantom.jks "$KS"; cp $W/keys/passwort.txt "$PASSF"
else
	log "Creating your own signing key (once – keep the keys/ folder safe!)"
	head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' > "$PASSF"
	keytool -genkeypair -v -keystore "$KS" -alias phantom -keyalg RSA -keysize 3072 -validity 10000 \
		-storepass "$(cat $PASSF)" -keypass "$(cat $PASSF)" -dname "CN=Phantom Network, O=Phantom Network, C=DE" >/dev/null
	cp "$KS" "$PASSF" $W/keys/
fi
UNSIGNED=app/build/outputs/apk/release/app-release-unsigned.apk
OUT=$B/PhantomNetwork-$VERSION_NAME-$VERSION_CODE.apk
$BT/zipalign -p -f 4 $UNSIGNED /tmp/aligned.apk
PW=$(tr -d '\r\n' < "$PASSF")
$BT/apksigner sign --ks "$KS" --ks-key-alias phantom --ks-pass "pass:$PW" --key-pass "pass:$PW" --out "$OUT" /tmp/aligned.apk
$BT/apksigner verify "$OUT"
cp -f "$OUT" $W/out/
cp -f "$OUT" $W/out/PhantomNetwork-latest.apk
rm -f /tmp/aligned.apk

log "DONE"
ls -la $W/out/*.apk
echo "→ copy out/PhantomNetwork-latest.apk to your phone and install it."
