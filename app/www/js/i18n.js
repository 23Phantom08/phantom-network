/* Phantom Network – Englisch.
   Die App ist auf Deutsch geschrieben. Ist Englisch gewählt, übersetzt I18N.dom() die fertig gezeichnete Seite:
   ganze Texte zuerst, danach bekannte Textstücke (z. B. „Keine Verbindung zu …“). Fehlt ein Text hier, bleibt er deutsch. */
'use strict';

const EN = {
	// Allgemein, Einheiten, Zeit
	'Heute': "Today", 'Gestern': "Yesterday", 'Std': "h", 'Min': "min", 'Sek.': "sec", 'Min.': "min",
	'So': "Sun", 'Mo': "Mon", 'Di': "Tue", 'Mi': "Wed", 'Do': "Thu", 'Fr': "Fri", 'Sa': "Sat",
	'Sonntag': "Sunday", 'Montag': "Monday", 'Dienstag': "Tuesday", 'Mittwoch': "Wednesday", 'Donnerstag': "Thursday", 'Freitag': "Friday", 'Samstag': "Saturday",
	'Jan': "Jan", 'Feb': "Feb", 'Mär': "Mar", 'Apr': "Apr", 'Mai': "May", 'Jun': "Jun", 'Jul': "Jul", 'Aug': "Aug", 'Sep': "Sep", 'Okt': "Oct", 'Nov': "Nov", 'Dez': "Dec",
	'Januar': "January", 'Februar': "February", 'März': "March", 'April': "April", 'Juni': "June", 'Juli': "July", 'August': "August", 'September': "September", 'Oktober': "October", 'November': "November", 'Dezember': "December",
	'Mo – Fr': "Mon – Fri", 'Mo–Fr': "Mon–Fri", 'Sa+So': "Sat+Sun", 'So–Do': "Sun–Thu", 'Jeden Tag': "Every day",
	'An': "On", 'Aus': "Off", 'an': "on", 'aus': "off", 'Alle': "All", 'Fertig': "Done", 'Zurück': "Back", 'Speichern': "Save", 'Abbrechen': "Cancel",
	'Löschen': "Delete", 'Entfernen': "Remove", 'Hinzufügen': "Add", 'Ändern': "Change", 'Bearbeiten': "Edit", 'Übernehmen': "Apply", 'Ansehen': "View",
	'Einrichten': "Set up", 'Einschalten': "Turn on", 'Später': "Later", 'Sofort': "Immediately", 'Kopieren': "Copy", 'Teilen': "Share",
	'Online': "Online", 'Offline': "Offline", 'Fehler': "Error", 'Fehler:': "Error:", 'Unbekannt': "Unknown", 'Verbunden': "Connected", 'Getrennt': "Disconnected",
	'Gespeichert:': "Saved:", 'Eingeschaltet': "Turned on", 'Ausgeschaltet': "Turned off", 'Läuft …': "Running …", 'Prüfe …': "Checking …",
	'wird geprüft …': "checking …", 'nicht möglich': "not possible", 'nicht erreichbar': "unreachable", 'Nicht erreichbar': "Unreachable",
	'nur in der App': "app only", 'Nur in der Android-App': "Android app only", 'Nur in der Android-App abrufbar.': "Only available in the Android app.",
	'Keine Einträge': "No entries", 'Noch nicht geladen': "Not loaded yet", 'Noch keine Daten': "No data yet", 'Weniger zeigen': "Show less",

	// Gerätetypen und Netze
	'Handy': "Phone", 'Tablet': "Tablet", 'Laptop/PC': "Laptop/PC", 'Fernseher': "TV", 'Spielkonsole': "Game console", 'Lautsprecher': "Speaker",
	'Uhr': "Watch", 'Server/NAS': "Server/NAS", 'Drucker': "Printer", 'Kamera': "Camera", 'Rollo': "Blind", 'Thermostat': "Thermostat", 'Licht': "Light",
	'Lichtschalter': "Light switch", 'Steckdose': "Plug", 'Steckdosenleiste': "Power strip", 'Solaranlage': "Solar system", 'Waschmaschine': "Washing machine",
	'Stromzähler': "Power meter", 'Wärmezähler': "Heat meter", 'Türklingel': "Doorbell", 'Saugroboter': "Robot vacuum", 'Mikrocontroller': "Microcontroller",
	'Netzwerk': "Network", 'Sonstiges': "Other", 'Gäste': "Guests", 'Gäste ·': "Guests ·", 'Kabel': "Cable",

	// Ereignisse und Mitteilungsarten
	'Router-Wechsel': "Router change", 'IP vergeben': "IP assigned", 'Neue Geräte': "New devices", 'Pausen & Limits': "Pauses & limits", 'Tageslimit': "Daily limit",
	'Router offline': "Router offline", 'Tageslimit erreicht': "Daily limit reached", 'Kurz vor dem Tageslimit': "Close to the daily limit",
	'Fehler & kritische Meldungen': "Errors & critical messages", 'Firmware-Updates': "Firmware updates",

	// Anmeldung, Start
	'Master nicht erreichbar:': "Master unreachable:", 'Bitte die Adresse des Masters eingeben.': "Please enter the master's address.",
	'Bitte das Passwort eingeben.': "Please enter the password.", 'Hinweis: Dieser Router hat keinen Internet-Anschluss (kein Master?)': "Note: this router has no internet connection (not the master?)",
	'Passwort falsch oder Benutzer gesperrt.': "Wrong password or user locked.", 'Keine Verbindung zu': "No connection to", 'Zertifikat bestätigen': "Confirm certificate",
	'Passwort nötig': "Password needed", ': Passwort nötig': ": password needed", 'Zertifikat hat sich geändert!': "Certificate has changed!", 'Bitte neu anmelden.': "Please sign in again.",
	'antwortet nicht': "not responding", 'Verbinde mit dem Master …': "Connecting to the master …", 'Phantom Network startet …': "Phantom Network is starting …",
	'Router im WLAN gefunden': "Router found on Wi‑Fi", 'Router im Netz': "Routers on the network", 'HTTPS (Standard)': "HTTPS (default)", 'Anmelden': "Sign in",
	'Lade Daten vom Master …': "Loading data from the master …", 'Suche Master …': "Searching for master …", 'im WLAN, über Gateway und mDNS': "on Wi‑Fi, via gateway and mDNS",
	'Neu suchen': "Search again", 'Kein Master gefunden': "No master found", 'Adresse unten von Hand eingeben': "Enter the address below manually",
	'Dein Heimnetz': "Your home network", 'Adresse des Masters': "Master address", 'Benutzer': "User", 'Passwort': "Password",
	'Angemeldet bleiben (Passwort im Android-Schlüsselspeicher)': "Stay signed in (password in the Android keystore)",
	'Weitere Router werden danach automatisch gefunden.': "Other routers are then found automatically.", 'z. B. 192.168.1.1 oder phantom.lan': "e.g. 192.168.1.1 or phantom.lan",
	'Vergleichen kannst du den Fingerabdruck im Browser:': "You can compare the fingerprint in your browser:",
	'öffnen → Symbol links neben der Adresse → Zertifikat → SHA-256.': "open → icon left of the address → certificate → SHA-256.",
	'Die App merkt sich dieses Zertifikat. Ändert es sich später, fragt sie erneut.': "The app remembers this certificate. If it changes later, it will ask again.",
	'Zertifikat noch nicht bestätigt': "Certificate not confirmed yet", 'Anmeldung fehlgeschlagen': "Sign-in failed", 'Passwort fehlt': "Password missing",
	'Keine Berechtigung': "No permission", 'Nicht gefunden': "Not found", 'HTTPS braucht die Android-App': "HTTPS needs the Android app",

	// Navigation
	'Übersicht': "Overview", 'Geräte': "Devices", 'Familie': "Family", 'Netz': "Network", 'Firewall': "Firewall", 'Mehr': "More",

	// Übersicht
	'seit Neustart': "since restart", 'oder Fingerabdruck': "or fingerprint", 'braucht ein Passwort': "needs a password", 'Router brauchen Aufmerksamkeit': "routers need attention",
	'Neues Gerät im Netz': "New device on the network", 'neue Geräte heute': "new devices today", 'Internet verbunden': "Internet connected", 'Kein Internet': "No internet",
	'Seit': "Since", 'Der Master hat keine Verbindung nach draußen': "The master has no connection to the outside", 'nicht eingerichtet': "not set up", 'Jetzt messen': "Measure now",
	'Gerät': "Device", 'Nichts pausiert': "Nothing paused", 'Noch nichts passiert': "Nothing happened yet", 'Neu: App-Login': "New: app login",
	', bevor die App deine Router anspricht.': ", before the app talks to your routers.", 'Firmware-Update: OpenWrt': "Firmware update: OpenWrt",
	'· installieren über die Weboberfläche': "· install via the web interface", 'Daten dieser Router fehlen gerade': "Data from these routers is currently missing",
	'Geräte online': "Devices online", 'Router aktiv': "Routers active", 'Pausen': "Pauses", 'HEUTE AM MEISTEN': "MOST USED TODAY", 'LETZTE EREIGNISSE': "RECENT EVENTS",
	'Alle Ereignisse': "All events", '· direkt vom Master': "· straight from the master", 'Offline ·': "Offline ·", 'Router stehen unter „Netz“': "routers are listed under “Network”",

	// Geräte
	'Keine Geräte gefunden': "No devices found", 'Ausblenden': "Hide", 'Anzeigen': "Show", '· aus': "· off", 'online ·': "online ·", 'Pause': "Pause",
	'Gerät nicht mehr in der Liste': "Device no longer in the list", 'Pausiert': "Paused", 'Pausiert über Profil': "Paused via profile", 'Gesperrt durch Zeitplan': "Blocked by schedule",
	'30 Min': "30 min", '1 Std': "1 h", '2 Std': "2 h", '3 Std': "3 h", '4 Std': "4 h", '1,5 Std': "1.5 h", '24 Std': "24 h", '1 Min': "1 min", '5 Min': "5 min", '15 Min': "15 min",
	'+15 Min': "+15 min", '+30 Min': "+30 min", '+1 Std': "+1 h", 'Bis 7 Uhr': "Until 7 am", 'Bis ich freigebe': "Until I resume", 'Bis Mitternacht': "Until midnight", 'Ohne Limit': "No limit",
	'Ohne Paket „conntrack“ wirkt die Pause erst bei neuen Verbindungen.': "Without the “conntrack” package the pause only affects new connections.",
	'Bevorzugen': "Prioritize", 'Hat Vorrang, wenn die Leitung voll ist (mit SQM)': "Gets priority when the line is busy (with SQM)", 'Feste IP-Adresse': "Fixed IP address",
	'Bekommt immer': "Always gets", 'Erst wenn das Gerät eine Adresse hat': "Only once the device has an address", 'Keinem Familienmitglied zugeordnet': "Not assigned to a family member",
	'IP-Adresse': "IP address", 'MAC-Adresse': "MAC address", 'Verbunden mit': "Connected to", 'Band': "Band", 'Verbindung': "Connection", 'Kabel / über Router': "Cable / via router",
	'Signal': "Signal", 'Geschwindigkeit': "Speed", 'Verbunden seit': "Connected since", 'Daten seit Verbindung': "Data since connecting", 'Letzte Monate': "Recent months",
	'bis heute': "to date", 'Durchschnitt pro Monat': "Average per month", 'Ein Balken pro Tag, heute in Türkis.': "One bar per day, today in turquoise.",
	'Bis zu 12 Monate, gespeichert auf dem Master.': "Up to 12 months, stored on the master.", 'Name, IP oder MAC': "Name, IP or MAC", 'Umbenennen': "Rename",
	'INTERNET PAUSIEREN': "PAUSE INTERNET", 'DATEN HEUTE': "DATA TODAY", 'AKTIV HEUTE': "ACTIVE TODAY", 'Minuten mit spürbarer Nutzung': "minutes of noticeable use", 'DETAILS': "DETAILS",
	'ist wieder online': "is back online", 'Nicht mehr bevorzugt': "No longer prioritized", 'wird bevorzugt': "is prioritized", 'Das Gerät hat noch keine IP-Adresse': "The device has no IP address yet",
	'Feste IP entfernt': "Fixed IP removed", 'getrennt (60 s gesperrt)': "disconnected (blocked for 60 s)", 'Weckruf an': "Wake-up sent to", 'Name gespeichert': "Name saved",
	'Gerätetyp': "Device type", 'Profil für': "Profile for", 'Kein Profil': "No profile", 'Name (ohne Leerzeichen, wie im Router)': "Name (no spaces, as on the router)",
	'Wird als fester DHCP-Eintrag auf dem Master gespeichert.': "Saved as a static DHCP lease on the master.", 'Name': "Name",

	// Familie
	'Geräten online': "devices online", 'Alle Pausen beenden': "End all pauses", 'Alle Profile pausieren': "Pause all profiles",
	'Profile, Pausen und Zeitpläne liegen auf dem Master – jedes Handy mit der App sieht dasselbe.': "Profiles, pauses and schedules live on the master – every phone with the app sees the same.",
	'Profile': "Profiles", 'Profil': "Profile", 'Update verfügbar': "Update available", 'Update': "Update", 'Limit erreicht': "Limit reached", '· Limit': "· limit", 'kein Limit': "no limit",
	'Profil gelöscht': "Profile deleted", 'Internet pausieren': "Pause internet", 'Alle Geräte von': "All devices of", 'sofort offline': "offline right away",
	'kein Limit – nur gezählt': "no limit – counted only", 'Wochenende anders': "Different on weekends", 'Sa & So eigenes Limit': "Own limit for Sat & Sun", 'Keine Zeitpläne': "No schedules",
	'Zeitplan': "Schedule", 'Noch keine Profile': "No profiles yet",
	'Fasse die Geräte einer Person zusammen. Dann kannst du alle auf einmal pausieren, Schlafenszeiten festlegen und ein Tageslimit setzen.': "Group a person's devices. Then you can pause them all at once, set bedtimes and a daily limit.",
	'TAGESLIMIT': "DAILY LIMIT",
	'Die Nutzungszeit zählt ein kleiner Zusatz auf dem Master – auch wenn dein Handy aus ist. Er steckt in der App und ist mit einem Tipp installiert.': "Usage time is counted by a small add-on on the master – even when your phone is off. It ships with the app and installs with one tap.",
	'Die Geräte von': "The devices of", 'sind bis Mitternacht offline.': "are offline until midnight.", 'Heute ausnahmsweise mehr Zeit geben:': "Give extra time just for today:", 'Heute ·': "Today ·",
	'Gezählt wird jede Minute, in der ein Gerät spürbar Daten nutzt (kurzes Synchronisieren im Standby zählt nicht). Um Mitternacht geht es von vorn los.': "Every minute in which a device noticeably uses data is counted (brief syncing in standby doesn't count). It starts over at midnight.",
	'DIESE WOCHE': "THIS WEEK", 'pro Tag': "per day", 'ZEITPLÄNE (KEIN INTERNET)': "SCHEDULES (NO INTERNET)", 'Zeitplan hinzufügen': "Add schedule", 'GERÄTE (': "DEVICES (",
	'Neues Profil': "New profile", 'Profil gespeichert': "Profile saved", 'Profil bearbeiten': "Edit profile", 'Bitte einen Namen eingeben': "Please enter a name", 'Pause beendet': "Pause ended",
	'Alle pausiert': "All paused", 'Alle Pausen beendet': "All pauses ended", 'Wochenende:': "Weekend:", 'Wochenende hat jetzt ein eigenes Limit': "Weekend now has its own limit",
	'Wochenende wie werktags': "Weekend same as weekdays", 'für heute – gleich wieder online': "for today – back online shortly", 'Bonus zurückgenommen': "Bonus withdrawn", 'Limit:': "Limit:",
	'Limit aus': "Limit off", 'Geräte zuordnen': "Assign devices", 'jetzt bei': "now with", 'Geräte gespeichert': "Devices saved", 'Schlafenszeit': "Bedtime", 'Zeitplan bearbeiten': "Edit schedule",
	'Neuer Zeitplan': "New schedule", 'Hausaufgaben': "Homework", 'Essenszeit': "Mealtime", 'Schule': "School", 'Zeitplan löschen': "Delete schedule", 'Mindestens einen Tag wählen': "Pick at least one day",
	'Start und Ende sind gleich': "Start and end are the same", 'Zeitplan gespeichert': "Schedule saved", 'Zeitplan gelöscht': "Schedule deleted", 'Zeitplan an': "Schedule on", 'Zeitplan aus': "Schedule off",
	'Kind (Zeitpläne und Limits vorschlagen)': "Child (suggest schedules and limits)", 'Farbe': "Color", 'z. B. Lena': "e.g. Lena", 'löschen?': "delete?",
	'Pausen, Zeitpläne und Limit dieses Profils werden entfernt. Die Geräte bleiben im Netz.': "This profile's pauses, schedules and limit will be removed. The devices stay on the network.",
	'Kein Internet ab': "No internet from", 'Geht der Zeitraum über Mitternacht, zählt der Starttag (z. B. So 20:30 bis Mo 7:00).': "If the period crosses midnight, the start day counts (e.g. Sun 20:30 to Mon 7:00).",
	'Diesem Profil sind noch keine Geräte zugeordnet': "No devices assigned to this profile yet", 'Profil nicht gefunden': "Profile not found",

	// Netz
	'Funkmodule': "radios", 'WLAN-NETZE (AUF ALLEN ROUTERN)': "WI‑FI NETWORKS (ON ALL ROUTERS)", 'Gäste-WLAN': "Guest Wi‑Fi", 'QR-Code & Timer': "QR code & timer",
	'Nachtmodus': "Night mode", 'WLAN nachts aus': "Wi‑Fi off at night", 'Speedtest': "Speed test", 'Handy ↔ Internet': "Phone ↔ internet", 'Netz-Check': "Network check",
	'Ping & Traceroute': "Ping & traceroute", 'WLAN-Kanäle': "Wi‑Fi channels", 'Wer funkt wo – Störungen finden und Kanäle verteilen': "Who transmits where – find interference and spread channels",
	'Router': "Router", 'Master': "Master",

	// Firewall
	'Freigaben': "Port forwards", 'Freigabe': "port forward", 'Regeln': "Rules", 'Zonen': "Zones", 'ins Internet aktiv': "open to the internet",
	'Keine Portfreigaben eingerichtet.': "No port forwards set up.", 'VON PHANTOM': "FROM PHANTOM", 'EIGENE / OPENWRT': "CUSTOM / OPENWRT", 'Keine Regeln.': "No rules.",
	'Pausen, Zeitpläne und Limits änderst du bei Geräten und Familie.': "Change pauses, schedules and limits under Devices and Family.",
	'Eingang': "Input", 'Ausgang': "Output", 'Weiterleiten': "Forward", 'Darf nach': "May forward to", 'Maskierung': "Masquerading", 'Keine Zonen gefunden.': "No zones found.",
	'erlauben': "allow", 'ablehnen': "reject", 'bevorzugt': "prioritized", 'alle': "all", 'Block': "Block", 'Bevorzugt': "Prioritized",

	// Router
	'Modell': "Model", 'Firmware': "Firmware", 'Installierte Version': "Installed version", 'Neueste Version': "Latest version", 'Firmware-Status': "Firmware status",
	'Kernel': "Kernel", 'Läuft seit': "Uptime", 'Auslastung': "Load", 'Arbeitsspeicher': "Memory", 'Temperatur': "Temperature", 'Adresse': "Address", 'Rolle': "Role",
	'Master (Router)': "Master (router)", 'Access Point': "Access point", 'Zähler': "Counter", '· Update da': "· update available", 'aktiv (keine IP)': "active (no IP)",
	'nicht verbunden': "not connected", '· Kanal': "· channel", 'Mesh-Verbindung': "Mesh link", 'Keine Geräte': "No devices", 'Tageslimit-Zähler entfernen': "Remove daily limit counter",
	'Passwort eingeben': "Enter password", 'SYSTEM': "SYSTEM", 'NETZWERKE': "NETWORKS", 'ANSCHLÜSSE': "PORTS", 'neu starten': "restart", 'aktuell': "up to date",
	'wird geprüft': "checking", 'Firmware-Update': "Firmware update", 'Tageslimit ist eingerichtet': "Daily limit is set up", 'Tageslimit-Zähler entfernt': "Daily limit counter removed",
	'startet neu …': "is restarting …", 'neu starten?': "restart?", 'Neu starten': "Restart", 'Das ganze Netz und das Internet sind ca. 2 Minuten weg.': "The whole network and the internet will be gone for about 2 minutes.",
	'Geräte an diesem Router wechseln kurz zu einem anderen.': "Devices on this router briefly switch to another one.", 'Tageslimit-Zähler entfernen?': "Remove daily limit counter?",
	'Tageslimits zählen dann nicht mehr, aktive Limit-Sperren werden aufgehoben. Profile, Pausen und Zeitpläne bleiben.': "Daily limits will no longer be counted and active limit blocks are lifted. Profiles, pauses and schedules stay.",
	'Paket fehlt in der App': "Package missing in the app", 'Der Router erlaubt keine Paket-Installation (in der Weboberfläche fehlt „Software“)': "The router doesn't allow package installation (“Software” is missing in the web interface)",
	'Paketverwaltung meldet Fehler': "Package manager reports an error", 'Kein Master eingerichtet': "No master set up",

	// Internet
	'DHCP (automatisch)': "DHCP (automatic)", 'Feste IP': "Static IP", 'PPPoE (Einwahl)': "PPPoE (dial-up)", 'Anschluss': "Connection", 'Art': "Type", 'Kabel-Verbindung': "Cable link",
	'Halbduplex': "Half duplex", 'IPv4-Adresse': "IPv4 address", 'DNS-Server': "DNS servers", 'IPv6-Adresse': "IPv6 address", 'IPv6-Präfix (fürs Heimnetz)': "IPv6 prefix (for the home network)",
	'Monate': "Months", 'Geräte zeigen': "Show devices", 'Empfangen': "Received", 'Gesendet': "Sent", 'Gesamt': "Total", 'Pakete': "Packets", 'Fehler / verworfen': "Errors / dropped",
	'Ethernet (Kabel/Glasfaser/Modem)': "Ethernet (cable/fiber/modem)", 'Telefon': "Phone line", 'Glasfaser': "Fiber", 'Wird abgefragt …': "Querying …", 'Öffentliche IPv4': "Public IPv4",
	'Anschlussart': "Connection type", 'Leitung': "Line", 'Leitungsstatus': "Line status", 'Beim Anbieter verbunden seit': "Connected to the provider since", 'Ganze Leitung gerade': "Whole line right now",
	'GERADE JETZT': "RIGHT NOW", 'Durchschnitt der letzten ~20 Sekunden, alle Geräte zusammen.': "Average of the last ~20 seconds, all devices combined.", 'VERBINDUNG': "CONNECTION",
	'DATENVERBRAUCH': "DATA USAGE", 'alle Geräte': "all devices", 'Gezählt vom Tageslimit-Zähler auf dem Master, jede Minute.': "Counted every minute by the daily limit counter on the master.",
	'DATENVERKEHR SEIT NEUSTART': "TRAFFIC SINCE RESTART", 'ROUTER DAVOR': "UPSTREAM ROUTER",
	'Keine Antwort per UPnP. Im Router davor die Statusübertragung per UPnP einschalten (Fritzbox: Heimnetz → Netzwerk → Netzwerkeinstellungen → „Statusinformationen über UPnP übertragen“). Unterwegs geht es nur über VPN.': "No answer via UPnP. Enable UPnP status reporting on the upstream router (FRITZ!Box: Home Network → Network → Network Settings → “Transmit status information over UPnP”). Away from home this only works via VPN.",
	'VERBINDUNGSTEST': "CONNECTION TEST", 'Ping (': "Ping (", '% Verlust': "% loss", 'keine Antwort': "no answer", 'Namensauflösung (DNS)': "Name resolution (DNS)",

	// WLAN-Kanäle
	'Scan nicht möglich:': "Scan not possible:", 'Scanne …': "Scanning …", 'Scanne … ·': "Scanning … ·", 'Router funken': "routers transmitting", 'nur 1, 6, 11 überlappen nicht': "only 1, 6, 11 don't overlap",
	'Kanäle mit Funkverkehr': "Channels with traffic", 'Mesh – Kanal muss auf allen Mesh-Routern gleich sein': "Mesh – channel must be the same on all mesh routers", 'Gleicher Kanal wie': "Same channel as",
	'Nachbar-WLANs auf diesem Kanal': "neighbor Wi‑Fis on this channel", 'Kanal frei': "Channel clear", 'Auto ·': "Auto ·", 'Keine Funkmodule auf diesem Band': "No radios on this band",
	'Gescannt vor': "Scanned", 'auf Kanal': "on channel", 'Sie stören sich gegenseitig – besonders für 2,4-GHz-Geräte. Besser: auf 1, 6 und 11 verteilen.': "They interfere with each other – especially for 2.4 GHz devices. Better: spread across 1, 6 and 11.",
	'BELEGUNG': "USAGE", 'Nachbar-WLANs': "Neighbor Wi‑Fis", 'deine Router': "your routers", 'DEINE ROUTER': "YOUR ROUTERS", 'Kanäle automatisch verteilen': "Spread channels automatically",
	'Verteilt 2,4 GHz auf 1, 6 und 11 – mit den wenigsten Nachbarn zuerst. Mesh-Funk bleibt unverändert. Du bestätigst vorher.': "Spreads 2.4 GHz across 1, 6 and 11 – fewest neighbors first. Mesh radios stay unchanged. You confirm first.",
	'STÄRKSTE NACHBARN': "STRONGEST NEIGHBORS", 'Kanal': "Channel", 'KANAL': "CHANNEL", 'Maximal': "Maximum", 'Mittel': "Medium", 'Niedrig': "Low", '· jetzt Kanal': "· now channel",
	'Auf diesem Funk läuft das Mesh. Ein anderer Kanal trennt das Mesh, wenn die anderen Mesh-Router nicht denselben Kanal haben.': "The mesh runs on this radio. Another channel breaks the mesh unless the other mesh routers use the same channel.",
	'Gespeichert – WLAN von': "Saved – Wi‑Fi of", 'startet kurz neu': "restarts briefly", 'Router umgestellt': "routers changed",
	'Beim Speichern startet das WLAN dieses Routers kurz neu (ca. 10 Sek.). Geräte verbinden sich von selbst wieder.': "Saving briefly restarts this router's Wi‑Fi (about 10 sec). Devices reconnect on their own.",
	'Kanäle verteilen?': "Spread channels?", 'Das 2,4-GHz-WLAN dieser Router startet nacheinander kurz neu. Smart-Home-Geräte verbinden sich von selbst wieder, das kann ein, zwei Minuten dauern.': "The 2.4 GHz Wi‑Fi of these routers restarts briefly one after another. Smart home devices reconnect on their own; that can take a minute or two.",

	// Backups
	'Ordner': "Folder", 'Download (Standard)': "Download (default)", 'Zurück auf Download': "Back to Download", 'Backups': "Backups", 'Backup erstellt': "Backup created",
	'Backups landen jetzt in „': "Backups now go to “", 'Backups landen wieder in „Download“': "Backups go to “Download” again", 'Kein Backup möglich': "Backup not possible", 'Backup': "Backup",
	'gespeichert in „': "saved in “", '· nicht:': "· not:", 'SPEICHERORT': "LOCATION", 'ROUTER': "ROUTERS",
	'Du kannst jeden Ordner auswählen, auch auf einer Speicherkarte oder in einer Cloud-App mit Ordnerzugriff (z. B. Google Drive).': "You can pick any folder, including on a memory card or in a cloud app with folder access (e.g. Google Drive).",
	'Das Backup enthält die Einstellungen des Routers – genau wie „Sicherung herunterladen“ in der Weboberfläche. Wiederherstellen geht dort unter System → Backup.': "The backup contains the router's settings – just like “Download backup” in the web interface. Restore it there under System → Backup.",
	'Backup geht nur in der Android-App': "Backups only work in the Android app", 'gewählter Ordner': "chosen folder",

	// Gäste-WLAN, Nachtmodus
	'Kein Gäste-WLAN gefunden': "No guest Wi‑Fi found", 'Lege in der Weboberfläche ein WLAN im Netz „Gast_Wlan“ an. Die App erkennt es dann automatisch.': "Create a Wi‑Fi in the “Gast_Wlan” network in the web interface. The app detects it automatically.",
	'An bis': "On until", 'An, ohne Zeitlimit': "On, no time limit", 'AUTOMATISCH AUSSCHALTEN': "TURN OFF AUTOMATICALLY", 'EINSCHALTEN FÜR': "TURN ON FOR", 'QR-Code zu groß': "QR code too large",
	'Mit der Handy-Kamera scannen': "Scan with the phone camera", 'Der Timer läuft auf den Router selbst – auch wenn dein Handy aus ist.': "The timer runs on the routers themselves – even when your phone is off.",
	'Gäste-WLAN an bis': "Guest Wi‑Fi on until", 'Gäste-WLAN an': "Guest Wi‑Fi on", 'WLAN': "Wi‑Fi", 'WLAN:': "Wi‑Fi:", 'WLAN „': "Wi‑Fi “", '“ nachts aus': "” off at night",
	'Teilen nicht möglich': "Sharing not possible", 'Nachtmodus an': "Night mode on", 'Nachtmodus aus': "Night mode off", 'Bitte zwei verschiedene Zeiten wählen': "Please pick two different times",
	'Nachtmodus:': "Night mode:", 'Aus von': "Off from", 'ZEITEN': "TIMES", 'Aus ab': "Off from", 'An ab': "On from",
	'Schaltet nur das Haupt-WLAN. Smart Home und Kabel laufen weiter. Die Router schalten selbst um, die App muss nicht laufen.': "Only switches the main Wi‑Fi. Smart home and cable keep running. The routers switch by themselves; the app doesn't need to run.",
	'“ ausschalten?': "” off?", 'Trotzdem ausschalten': "Turn off anyway",
	'Alle Geräte in diesem WLAN – vielleicht auch dieses Handy – verlieren die Verbindung. Wieder einschalten geht dann nur per Kabel, über ein anderes WLAN oder die Weboberfläche.': "All devices on this Wi‑Fi – maybe this phone too – lose their connection. Turning it back on then only works via cable, another Wi‑Fi or the web interface.",
	'Nicht erreicht:': "Not reached:",

	// Speedtest, Netz-Check
	'Ping …': "Ping …", 'Download …': "Download …", 'Upload …': "Upload …", 'Nochmal messen': "Measure again", 'Test starten': "Start test", 'Test fehlgeschlagen:': "Test failed:",
	'Läuft auf dem Master …': "Running on the master …", 'Ping ms': "Ping ms",
	'Misst die Strecke von diesem Handy über WLAN und Master ins Internet (Server: Cloudflare). Für den reinen Anschluss am besten nah am Router messen.': "Measures the path from this phone via Wi‑Fi and the master to the internet (server: Cloudflare). For the line alone, measure close to the router.",
	'Ziel (Name oder IP)': "Target (name or IP)", 'Der Test läuft direkt auf dem Master – so siehst du, ob das Problem am Internet oder am WLAN liegt.': "The test runs directly on the master – so you can tell whether the problem is the internet or the Wi‑Fi.",
	'misst, wie schnell das Ziel antwortet.': "measures how fast the target answers.",
	'zeigt jede Station auf dem Weg dorthin (Router davor, Anbieter, …) – so siehst du, wo es hakt. Dauert bis zu 15 Sekunden.': "shows every hop on the way (upstream router, provider, …) – so you see where it gets stuck. Takes up to 15 seconds.",
	'Ungültiges Ziel': "Invalid target", 'Keine Antwort (Code': "No answer (code",

	// Mehr
	'Protokoll': "Log", 'Neue Geräte, Pausen, WLAN': "New devices, pauses, Wi‑Fi", 'Router & Anmeldungen': "Routers & sign-ins", 'brauchen Hilfe': "need help",
	'VPN (WireGuard)': "VPN (WireGuard)", 'Benachrichtigungen': "Notifications", 'Einstellungen aller Router aufs Handy sichern': "Back up all router settings to the phone",
	'Router-Rechte': "Router permissions", 'Fehlen auf': "Missing on", 'Auf allen Routern vollständig': "Complete on all routers", 'Sicherheit': "Security", 'App-Login an': "App login on",
	'· Fingerabdruck': "· fingerprint", 'App-Login aus': "App login off", 'Alle Router mit HTTPS': "All routers on HTTPS", 'Router noch ohne HTTPS': "routers still without HTTPS",
	'Darstellung': "Appearance", 'Dunkel': "Dark", 'Hell': "Light", 'Wie das System': "Same as system", 'Über die App': "About the app", 'Version 1.0': "Version 1.0",
	'Sprache': "Language", 'Deutsch': "Deutsch", 'English': "English", 'Abmelden': "Sign out",
	'Abmelden?': "Sign out?", 'Das gespeicherte Passwort des Masters wird vom Handy gelöscht. Auf den Router ändert sich nichts.': "The saved master password is deleted from the phone. Nothing changes on the router.",
	'Aus dem Systemprotokoll der Router (WLAN-Verbindungen, vergebene IPs). Es reicht je Router etwa einige Stunden zurück.': "From the routers' system log (Wi‑Fi connections, assigned IPs). It goes back a few hours per router.",

	// Router & Anmeldungen, Verbindung
	'Angemeldet': "Signed in", 'OpenWrt': "OpenWrt", 'Alle Router auf HTTPS umstellen': "Switch all routers to HTTPS", 'HTTP erlauben': "Allow HTTP",
	'Nur für Router ohne HTTPS (ältere OpenWrt-Versionen)': "Only for routers without HTTPS (older OpenWrt versions)",
	'„Nach Router suchen“ prüft die Geräte im Netz des Masters. Firmware-Updates werden alle 12 Stunden geprüft: neueste Version im selben OpenWrt-Zweig.': "“Search for routers” checks the devices in the master's network. Firmware updates are checked every 12 hours: latest version in the same OpenWrt branch.",
	'Passwörter liegen nur im Android-Schlüsselspeicher.': "Passwords are kept only in the Android keystore.", 'Router noch ohne Verschlüsselung': "routers still unencrypted",
	'Mit einem Tipp auf HTTPS umstellen. Beim ersten Kontakt merkt sich die App das Zertifikat selbst.': "Switch to HTTPS with one tap. The app remembers the certificate on first contact.",
	'Alle Router verschlüsselt': "All routers encrypted", 'Ändert sich ein Zertifikat, fragt die App nach.': "If a certificate changes, the app asks.",
	'Neue Router verbindet die App immer zuerst über HTTPS. Zurück auf HTTP fällt sie nie von selbst – das würde Angreifern helfen.': "The app always connects new routers via HTTPS first. It never falls back to HTTP by itself – that would help attackers.",
	'Details ansehen': "View details", 'Adresse ändern': "Change address", 'Passwort für': "Password for", 'Passwort (root)': "Password (root)", 'IP-Adresse oder Name': "IP address or name",
	'Router von Hand hinzufügen': "Add router manually", 'z. B. 192.168.1.2': "e.g. 192.168.1.2", 'Bitte Zertifikat bestätigen': "Please confirm the certificate", 'Anmeldung bei': "Sign-in to",
	'Angemeldet bei': "Signed in to", 'Entfernt': "Removed", 'Router neu hinzugefügt': "routers newly added", 'Keine neuen Router gefunden': "No new routers found", 'Adresse fehlt': "Address missing",
	'Diesen Router gibt es schon': "This router already exists", 'Router hinzugefügt': "Router added", 'HTTPS aktiv': "HTTPS active", '– ist luci-ssl auf dem Router?': "– is luci-ssl on the router?",
	'Kein HTTPS bei:': "No HTTPS on:", '– ist luci-ssl installiert?': "– is luci-ssl installed?", 'Alle Router laufen jetzt über HTTPS': "All routers now run on HTTPS",
	'DATEN': "DATA", 'Quelle': "Source", 'Router (live)': "Router (live)", 'Stand': "As of", 'Automatisch neu laden': "Reload automatically", 'alle 20 s, beim Öffnen': "every 20 s, on open",

	// App-Login
	'oder deinem Fingerabdruck': "or your fingerprint", 'App-Login': "App login", '· beim Öffnen fragen': "· ask on open", 'Fingerabdruck': "Fingerprint",
	'statt Passwort entsperren': "unlock instead of password", 'Benutzername & Passwort ändern': "Change username & password", 'App-Login entfernen': "Remove app login",
	'Login ändern': "Change login", 'App-Login einrichten': "Set up app login", 'Login speichern': "Save login", 'Router-Passwort des Masters': "Master's router password",
	'oder Passwort': "or password", 'Zurück zum App-Passwort': "Back to app password", 'Passwort vergessen? Mit dem Router-Passwort entsperren': "Forgot password? Unlock with the router password",
	'SPERREN NACH': "LOCK AFTER", 'Wie lange die App im Hintergrund sein darf, bevor sie wieder nach dem Login fragt.': "How long the app may be in the background before it asks for the login again.",
	'Benachrichtigungen kommen auch, wenn die App gesperrt ist – sie zeigen aber nur, was passiert ist. Zum Ändern (z. B. „+30 Min geben“) fragt die App nach dem Login.': "Notifications still arrive while the app is locked – but they only show what happened. To change something (e.g. “+30 min”) the app asks for the login.",
	'Vor dem Zugriff auf deine Router fragt die App nach diesem Login. Er bleibt nur auf diesem Handy – gespeichert wird nur eine verschlüsselte Prüfsumme, nie das Passwort.': "Before accessing your routers the app asks for this login. It stays on this phone only – only an encrypted checksum is stored, never the password.",
	'Benutzername': "Username", 'Passwort wiederholen': "Repeat password", 'Phantom Network ist gesperrt': "Phantom Network is locked", 'Entsperren': "Unlock",
	'Mit Fingerabdruck entsperren': "Unlock with fingerprint", 'Bitte einen Benutzernamen eingeben': "Please enter a username", 'Das Passwort braucht mindestens 4 Zeichen': "The password needs at least 4 characters",
	'Die Passwörter sind nicht gleich': "The passwords don't match", 'Fingerabdruck bestätigen': "Confirm fingerprint", 'Damit entsperrst du künftig die App': "You'll use it to unlock the app from now on",
	'App-Login gespeichert': "App login saved", 'App-Login entfernt': "App login removed", 'Fingerabdruck nicht bestätigt': "Fingerprint not confirmed", 'Phantom Network entsperren': "Unlock Phantom Network",
	'Hallo': "Hello", 'Bitte Passwort eingeben': "Please enter the password", 'Router-Passwort stimmt nicht': "Router password is wrong", 'Passwort stimmt nicht': "Password is wrong",
	'App-Login entfernen?': "Remove app login?", 'Die App öffnet sich dann wieder ohne Nachfrage.': "The app will then open without asking again.", 'Fingerabdruck nicht verfügbar': "Fingerprint not available",

	// Benachrichtigungen
	'Prüft etwa alle 15 Minuten im Hintergrund': "Checks about every 15 minutes in the background", 'WORÜBER?': "ABOUT WHAT?", 'Test-Benachrichtigung': "Test notification",
	'Benachrichtigungen sind in Android nicht erlaubt': "Notifications aren't allowed in Android", 'Benachrichtigungen nicht erlaubt': "Notifications not allowed",
	'So sehen Benachrichtigungen aus 👻': "This is what notifications look like 👻", 'Prüfe jetzt einmal im Hintergrund …': "Checking once in the background now …",

	// VPN
	'VPN': "VPN", 'VPN-Server': "VPN server", 'Läuft auf Port': "Running on port", '– Handys können sich verbinden': "– phones can connect", 'Aus – schaltet sich nie von selbst ein': "Off – never turns on by itself",
	'noch nie verbunden': "never connected", 'Noch keine Zugänge': "No access yet", 'Zugang erstellen': "Create access", 'DIESES HANDY': "THIS PHONE", 'VPN auf diesem Handy': "VPN on this phone",
	'Beim ersten Einschalten fragt Android, ob die App WireGuard steuern darf. In der WireGuard-App muss außerdem unter Einstellungen „Allow remote control apps“ (Fernsteuerung durch Apps) eingeschaltet sein.': "The first time, Android asks whether the app may control WireGuard. In the WireGuard app, “Allow remote control apps” must also be enabled under Settings.",
	'Kein WireGuard eingerichtet': "No WireGuard set up", 'Richte in der Weboberfläche unter VPN ein WireGuard-Netz ein (Port freigeben nicht vergessen). Die App findet es danach automatisch und kann Handys hinzufügen.': "Set up a WireGuard network under VPN in the web interface (don't forget to open the port). The app finds it automatically and can add phones.",
	'VPN-SERVER AM MASTER': "VPN SERVER ON THE MASTER", 'ZUGÄNGE (': "ACCESS (", 'HANDY HINZUFÜGEN': "ADD PHONE", 'Adresse von außen (DynDNS oder feste IP)': "External address (DynDNS or static IP)",
	'Gesamten Verkehr über Zuhause leiten': "Route all traffic through home", 'Der Zugang wird auf dem Master gespeichert. Den QR-Code scannst du mit der WireGuard-App. Den VPN-Server schaltest du oben selbst ein.': "The access is stored on the master. Scan the QR code with the WireGuard app. You turn the VPN server on yourself above.",
	'WireGuard-App fehlt': "WireGuard app missing", 'Installiere „WireGuard“ aus dem Play Store und scanne dort den QR-Code eines Zugangs. Danach kannst du das VPN hier ein- und ausschalten.': "Install “WireGuard” from the Play Store and scan an access QR code there. Then you can turn the VPN on and off here.",
	'Name des Tunnels in der WireGuard-App': "Tunnel name in the WireGuard app", 'STATUS': "STATUS", 'z. B. Handy Max': "e.g. Max's phone", 'z. B. meinname.duckdns.org': "e.g. myname.duckdns.org", 'z. B. Zuhause': "e.g. Home",
	'in der Firewall geöffnet': "opened in the firewall", 'genutzt (keine passende Firewall-Regel gefunden – bitte prüfen)': "used (no matching firewall rule found – please check)", 'VPN aus': "VPN off",
	'Bitte den Namen des Tunnels aus der WireGuard-App eintragen': "Please enter the tunnel name from the WireGuard app",
	'So kann der Tunnel in WireGuard nicht heißen (keine Leerzeichen, max. 15 Zeichen). Bitte den Namen genau aus der WireGuard-Liste abschreiben.': "A WireGuard tunnel can't be named like that (no spaces, max. 15 characters). Please copy the name exactly from the WireGuard list.",
	'Ohne Erlaubnis kann die App WireGuard nicht schalten': "Without permission the app can't switch WireGuard", 'VPN wird verbunden …': "VPN connecting …", 'VPN wird getrennt …': "VPN disconnecting …",
	'Nicht verbunden – stimmt der Tunnel-Name? Ist „Allow remote control apps“ in WireGuard an?': "Not connected – is the tunnel name right? Is “Allow remote control apps” on in WireGuard?",
	'VPN läuft noch': "VPN still running", 'VPN an': "VPN on", 'Bitte die Adresse von außen eintragen': "Please enter the external address", 'Zugang erstellt': "Access created", 'Zugang gelöscht': "Access deleted",
	'VPN-Server einschalten?': "Turn on VPN server?", 'WireGuard „': "WireGuard “", '“ startet und Port': "” starts and port", 'Mit der WireGuard-App scannen': "Scan with the WireGuard app",
	'„+“ → „QR-Code scannen“': "“+” → “Scan from QR code”", 'Der private Schlüssel steht in diesem Code – nur auf dem eigenen Gerät scannen.': "The private key is in this code – only scan it on your own device.",
	'Zugang löschen?': "Delete access?", 'Das Gerät kann sich danach nicht mehr verbinden.': "The device can no longer connect afterwards.", 'Tunnel-Name fehlt': "Tunnel name missing",
	'Gerät ist nicht im WLAN': "Device is not on Wi‑Fi", 'Kein WireGuard-Netz eingerichtet': "No WireGuard network set up",
	'Das VPN-Netz hat noch keine IPv4-Adresse – bitte in der Weboberfläche eintragen': "The VPN network has no IPv4 address yet – please add one in the web interface", 'Im VPN-Netz ist keine Adresse mehr frei': "No free address left in the VPN network",

	// Router-Rechte (SSH)
	'Rechte': "Permissions", 'Es fehlt:': "Missing:", '· alle': "· all", 'nicht eingerichtet (Familie → Profil)': "not set up (Family → profile)", '· Master': "· master",
	'Router-Rechte (SSH)': "Router permissions (SSH)", 'Kopiert – jetzt in die SSH-Sitzung einfügen': "Copied – now paste into the SSH session", 'Kopieren nicht möglich – bitte „Teilen“ nutzen': "Copy not possible – please use “Share”",
	'Normales OpenWrt erlaubt dem Benutzer root über die Schnittstelle der App nicht alles. Ohne diese Rechte fehlen z. B. die WLAN-Liste, „Kabelgerät online“ und die Temperatur. Der Block legt die Datei': "Stock OpenWrt doesn't let the root user do everything through the app's interface. Without these permissions, e.g. the Wi‑Fi list, “cable device online” and the temperature are missing. The block creates the file",
	'an und trägt sie in': "and adds it to", 'ein, damit sie ein Firmware-Update übersteht. Installiert wird nichts.': "so it survives a firmware update. Nothing is installed.",
	'1. Per SSH auf den Router (z. B.': "1. SSH into the router (e.g.", '2. Block kopieren, einfügen, Enter': "2. Copy the block, paste, Enter", '3. Auf jedem Router wiederholen, dann hier neu prüfen': "3. Repeat on every router, then check again here",
	'SSH-Block ansehen': "View SSH block",
	'gibt es nur mit der Phantom-Firmware': "is only available with the Phantom firmware", 'Dafür muss der Router selbst mitzählen – das kann normales OpenWrt ohne Zusatz nicht.': "The router has to count this itself – stock OpenWrt can't do that without an add-on.",

	// Über die App, Rechtliches
	'Kein Server, kein Konto': "No server, no account", 'Die App spricht direkt mit deinen Routern – über dieselbe Schnittstelle wie die Weboberfläche.': "The app talks directly to your routers – through the same interface as the web interface.",
	'Alles liegt auf den Routern': "Everything lives on the routers", 'Profile, Pausen, Zeitpläne und Limits stehen in der Router-Konfiguration – jedes Handy sieht dasselbe.': "Profiles, pauses, schedules and limits are stored in the router configuration – every phone sees the same.",
	'Passwort bleibt auf dem Handy': "Password stays on the phone", 'Verschlüsselt im Android-Schlüsselspeicher, nie im Klartext.': "Encrypted in the Android keystore, never in plain text.",
	'Hintergrund-Check': "Background check", 'Etwa alle 15 Minuten: neue Geräte, Fehler, Router offline, Firmware-Updates, Tageslimit.': "About every 15 minutes: new devices, errors, routers offline, firmware updates, daily limit.",
	'ohne Cloud': "no cloud", 'Router-Firmware': "Router firmware", 'Tageslimit-Zähler': "Daily limit counter", 'App': "App", 'Version 1.0 · auf diesem Handy': "Version 1.0 · on this phone",
	'Open-Source-Lizenzen': "Open source licenses", 'Bausteine, auf denen die App aufbaut': "Building blocks the app is based on", 'Impressum': "Legal notice", 'Wer die App anbietet': "Who provides the app",
	'Datenschutz': "Privacy", 'Welche Daten wo bleiben': "Which data stays where",
	'Phantom Network baut auf freier Software auf. Danke an alle, die sie entwickeln. Tippe auf einen Eintrag für den vollen Lizenztext.': "Phantom Network is built on free software. Thanks to everyone who develops it. Tap an entry for the full license text.",
	'Version 1.0 · für OpenWrt-Router': "Version 1.0 · for OpenWrt routers", 'DEIN NETZ': "YOUR NETWORK", 'AKTUELL?': "UP TO DATE?", 'SO FUNKTIONIERT’S': "HOW IT WORKS", 'RECHTLICHES': "LEGAL",
	'ANBIETER': "PROVIDER", 'KONTAKT': "CONTACT", 'E-Mail:': "Email:", 'HINWEIS': "NOTE",
	'OpenWrt ist eine Marke des OpenWrt-Projekts, Cudy und FRITZ!Box sind Marken ihrer Hersteller. Phantom Network steht mit ihnen in keiner Verbindung.': "OpenWrt is a trademark of the OpenWrt project; Cudy and FRITZ!Box are trademarks of their manufacturers. Phantom Network is not affiliated with them.",
	'Kurz gesagt': "In short", 'Keine Cloud, kein Konto, keine Werbung, keine Statistik. Deine Daten bleiben auf deinem Handy und deinen Routern.': "No cloud, no account, no ads, no analytics. Your data stays on your phone and your routers.",
	'WAS AUF DEM HANDY GESPEICHERT WIRD': "WHAT IS STORED ON THE PHONE",
	'Adressen deiner Router, deine Einstellungen in der App und die Router-Passwörter – die Passwörter verschlüsselt im Android-Schlüsselspeicher. Backups landen nur in dem Ordner, den du auswählst.': "Your router addresses, your app settings and the router passwords – the passwords encrypted in the Android keystore. Backups only go to the folder you choose.",
	'MIT WEM DIE APP SPRICHT': "WHO THE APP TALKS TO", 'WAS AUF DEN ROUTERN LIEGT': "WHAT IS STORED ON THE ROUTERS",
	'Profile, Pausen, Zeitpläne und Limits stehen in der Router-Konfiguration. Der Tageslimit-Zähler speichert Nutzungszeit und Datenmenge je Gerät (MAC-Adresse) für 35 Tage und Monatssummen für 12 Monate – nur auf dem Master.': "Profiles, pauses, schedules and limits are stored in the router configuration. The daily limit counter stores usage time and data volume per device (MAC address) for 35 days and monthly totals for 12 months – on the master only.",
	'BENACHRICHTIGUNGEN': "NOTIFICATIONS", 'Der Hintergrund-Check läuft auf dem Handy und fragt nur deinen Master ab. Mitteilungen erzeugt Android selbst – kein Push-Dienst, kein Server dazwischen.': "The background check runs on the phone and only queries your master. Android creates the notifications itself – no push service, no server in between.",
	'BERECHTIGUNGEN': "PERMISSIONS", 'Mitteilungen · Netzwerk · WireGuard steuern (nur wenn du den VPN-Schalter nutzt) · Ordnerzugriff (nur für Backups)': "Notifications · network · control WireGuard (only if you use the VPN switch) · folder access (backups only)",
	'LÖSCHEN': "DELETION", 'App deinstallieren löscht alles auf dem Handy. Daten auf den Routern löschst du über die App (Profil löschen, Tageslimit-Zähler entfernen) oder die Weboberfläche.': "Uninstalling the app deletes everything on the phone. You delete data on the routers via the app (delete profile, remove daily limit counter) or the web interface.",
	'Verantwortlich: siehe Impressum · Stand: Oktober 2026': "Responsible: see legal notice · As of: October 2026",
	'deine Router (dieselbe Schnittstelle wie die Weboberfläche)': "your routers (the same interface as the web interface)",
	'der Router davor, z. B. die FRITZ!Box (UPnP, nur im Heimnetz)': "the upstream router, e.g. the FRITZ!Box (UPnP, home network only)",
	'downloads.openwrt.org – nur die öffentliche Liste der OpenWrt-Versionen, ohne Daten über dich oder dein Netz': "downloads.openwrt.org – only the public list of OpenWrt versions, without data about you or your network",
	// Nachträge
	'Tageslimit-Zähler installieren': "Install daily limit counter", 'Tageslimit-Zähler aktualisieren (': "Update daily limit counter (",
	'Die Router suchen nach WLANs in der Umgebung – das dauert ein paar Sekunden.': "The routers are looking for nearby Wi‑Fi networks – this takes a few seconds.",
	'Neu scannen': "Scan again", 'Neu prüfen': "Check again", 'Jetzt neu laden': "Reload now", 'Profil löschen': "Delete profile", 'Profil anlegen': "Create profile", 'Ordner wählen': "Choose folder",
	'Haben sie ein anderes Passwort, gibst du es einmal unter „Mehr → Router & Anmeldungen“ ein.': "If they use a different password, enter it once under “More → Routers & sign-ins”.",
	'Vor dem Zugriff auf deine Router fragt die App nach Benutzername & Passwort': "Before accessing your routers the app asks for username & password",
	'. Der Login bleibt nur auf diesem Handy.': ". The login stays on this phone only.", 'Benutzername & Passwort': "Username & password",
	', bevor die App deine Router anspricht.': ", before the app talks to your routers.", '. Der Server bleibt an, bis du ihn wieder ausschaltest.': ". The server stays on until you turn it off again.",
	'App-Gerüst': "App framework", 'In der App': "In the app", 'Auf dem Router': "On the router", 'phantom-agent (Tageslimit-Zähler)': "phantom-agent (daily limit counter)",
	'wechselt auf': "switches to", 'wechselt von': "switches from", 'anderes Band': "another band", 'getrennt': "disconnected",
	'Neues Gerät:': "New device:", 'heute': "today", 'Limit': "limit", 'vollständig': "complete", 'fehlen': "missing", 'Rechte vollständig': "Permissions complete",
	'Router noch ohne HTTPS': "router(s) still without HTTPS", 'Router noch ohne Verschlüsselung': "router(s) still unencrypted",
	'Der Check liest etwa alle 15 Minuten das Systemprotokoll des Masters – wie das Protokoll in der App. Gemeldet werden Geräte, die zum ersten Mal eine Adresse bekommen, Fehler und kritische Meldungen sowie Router, die nicht mehr antworten. Beim Tageslimit kommt die Vorwarnung, sobald nur noch etwa 20 Minuten übrig sind; ist es erreicht, kannst du direkt in der Mitteilung 30 Minuten dazugeben. Das Passwort bleibt dabei verschlüsselt im Android-Schlüsselspeicher. Manche Handys beenden Hintergrunddienste – dann in den Akku-Einstellungen „Nicht optimieren“ wählen.': "About every 15 minutes the check reads the master's system log – like the log in the app. It reports devices getting an address for the first time, errors and critical messages, and routers that stop responding. For the daily limit, a warning comes when only about 20 minutes are left; once it's reached you can add 30 minutes right from the notification. The password stays encrypted in the Android keystore. Some phones kill background services – then choose “Don't optimize” in the battery settings.",
	'Phantom Network ist ein privates, nicht kommerzielles Projekt. Die App wird ohne Gewähr bereitgestellt; für Schäden an Geräten oder Einstellungen wird keine Haftung übernommen, soweit gesetzlich zulässig.': "Phantom Network is a private, non-commercial project. The app is provided without warranty; no liability is accepted for damage to devices or settings, to the extent permitted by law.",
	'Passwort (leer = wie Master)': "Password (empty = same as master)", 'bekannt': "known", 'Typ': "Type", 'Aus WLAN werfen': "Kick off Wi‑Fi", 'genutzt': "used", 'funktioniert': "works", 'gestört': "broken", 'gesehen von': "seen by",
	'Backup aufs Handy speichern': "Save backup to phone", 'Tippen = Backup speichern': "Tap = save backup", 'Backup aller Router': "Back up all routers",
	'Speichern & einschalten': "Save & turn on", 'Nach Router suchen': "Search for routers", 'unbekannt': "unknown", 'von': "of", 'aktiv': "active",
	'APP-GERÜST': "APP FRAMEWORK", 'IN DER APP': "IN THE APP", 'AUF DEM ROUTER': "ON THE ROUTER", 'ANDROID': "ANDROID", '(Schrift)': "(font)",
	'Neuer Tag: Tageslimits zurückgesetzt': "New day: daily limits reset", 'automatisch ausgeschaltet': "turned off automatically",
	'WLAN-Nachtschaltung:': "Wi‑Fi night mode:", 'wieder an': "back on", 'Pause beendet:': "Pause ended:", 'gestartet': "started",
	'Die Rechte sind schon da (per SSH oder Firmware). Das Paket brauchst du nicht – damit tauchen die Rechte nur zusätzlich in der Weboberfläche unter System → Software auf.': "The permissions are already there (via SSH or firmware). You don't need the package – it only makes them show up in the web interface under System → Software as well.",
	'· Kabel': "· Cable", 'Rechte-Paket entfernen?': "Remove permissions package?", 'Paket wird geändert …': "Changing package …",
	'Wo die Rechte nicht zusätzlich per SSH oder Firmware da sind, fehlen danach die WLAN-Liste, „Kabelgerät online“ und die Temperatur.': "Where the permissions don't also come from SSH or the firmware, the Wi‑Fi list, “cable device online” and the temperature will be missing afterwards.",
	'Das Paket bleibt auch nach einem Firmware-Update mit „Einstellungen behalten“. Entfernen geht auch in der Weboberfläche unter System → Software.': "The package survives a firmware update with “Keep settings”. You can also remove it in the web interface under System → Software.",
	'Paket von 1 Router entfernt': "Package removed from 1 router", 'Nicht entfernt –': "Not removed –", 'WLAN-Liste': "Wi‑Fi list", 'ARP-Tabelle': "ARP table", 'Router-Pakete': "Router packages", 'ROUTER-RECHTE · ALLE ROUTER': "ROUTER PERMISSIONS · ALL ROUTERS", 'TAGESLIMIT-ZÄHLER · NUR MASTER': "DAILY LIMIT COUNTER · MASTER ONLY",
	'Rechte einrichten': "Set up permissions", 'Paket installieren': "Install package", 'Wird eingerichtet …': "Setting up …", 'Auf allen Routern installiert': "Installed on all routers",
	'Paket wird installiert …': "Installing package …", 'läuft': "running", 'offline': "offline", 'Rechte vollständig': "Permissions complete", '· Paket': "· package", '· per SSH': "· via SSH", '· Firmware': "· firmware",
	'Router ohne volle Rechte': "router(s) without full permissions",
	'Ohne diese Rechte fehlen die WLAN-Liste, „Kabelgerät online“ und die Temperatur. Die App installiert dafür das kleine Paket „phantom-rights“ – ohne SSH.': "Without these permissions the Wi‑Fi list, “cable device online” and the temperature are missing. The app installs the small “phantom-rights” package for this – no SSH needed.",
	'Alle Router haben die Rechte': "All routers have the permissions", 'Das Paket bleibt auch nach einem Firmware-Update mit „Einstellungen behalten“. Entfernen geht in der Weboberfläche unter System → Software.': "The package survives a firmware update with “Keep settings”. You can remove it in the web interface under System → Software.",
	'Ohne Paketverwaltung? SSH-Block': "No package manager? SSH block",
	'Nur nötig, wenn der Router keine Pakete installieren kann (sehr kleine eigene Firmware). Der Block legt die Datei': "Only needed if the router can't install packages (very small custom firmware). The block creates the file",
	'ein, damit sie ein Firmware-Update übersteht.': "so it survives a firmware update.",
	'nicht installiert': "not installed", 'neu:': "new:", 'Update': "Update", 'Aktualisieren': "Update", 'Aktuell': "Up to date",
	'Zählt Nutzungszeit und Daten je Gerät, setzt Tageslimits durch und trennt laufende Verbindungen, sobald ein Gerät pausiert wird.': "Counts usage time and data per device, enforces daily limits and cuts running connections as soon as a device is paused.",
	'Rechte fehlen auf': "Permissions missing on", '· Tageslimit-Zähler': "· daily limit counter", 'Nicht eingerichtet –': "Not set up –",
	'Rechte auf 1 Router eingerichtet': "Permissions set up on 1 router"
};

/* Kurze Wörter, die nur als ganzer Text übersetzt werden (sonst würde z. B. aus „20:30 Uhr“ „20:30 Watch“) */
const EN_EXACT = new Set([ 'ROUTER', 'von', 'aktiv', 'Uhr', 'Art', 'Band', 'Stand', 'Hell', 'Dunkel', 'Licht', 'Rollo', 'Kabel', 'Telefon', 'Schule', 'Mittel', 'Signal', 'Name', 'Seit', 'Profil', 'Gerät', 'Block' ]);

/* Texte mit Zahlen: [Muster, Ersatz] – greifen vor den Textstücken */
const EN_RX = [
	[ /^Paket entfernen \((\d+) Router\)$/, (m, n) => 'Remove package (' + n + (n === '1' ? ' router)' : ' routers)') ],
	[ /^Paket von (\d+) Routern entfernt$/, 'Package removed from $1 routers' ],
	[ /^„phantom-rights“ wird von (\d+) (Router|Routern) entfernt\.$/, (m, n) => '“phantom-rights” will be removed from ' + n + (n === '1' ? ' router.' : ' routers.') ],
	[ /^(Alle )?(\d+) Router funken auf Kanal (\d+)$/, (m, all, n, c) => (all ? 'All ' + n + ' routers' : n + (n === '1' ? ' router' : ' routers')) + ' on channel ' + c ],
	[ /^(\d+) Router ohne volle Rechte$/, (m, n) => n + (n === '1' ? ' router' : ' routers') + ' without full permissions' ],
	[ /^(Rechte einrichten|Paket installieren) \((\d+) Router\)$/, (m, a, n) => (a === 'Paket installieren' ? 'Install package' : 'Set up permissions') + ' (' + n + (n === '1' ? ' router)' : ' routers)') ],
	[ /^Rechte auf (\d+) Routern eingerichtet$/, 'Permissions set up on $1 routers' ],
	[ /^Rechte fehlen auf (\d+) Router$/, (m, n) => 'Permissions missing on ' + n + (n === '1' ? ' router' : ' routers') ],
	[ /^Seit (.+)$/, 'Since $1' ],
	[ /^„(.+)“ ausschalten\?$/, 'Turn off “$1”?' ],
	[ /^(.+) neu starten\?$/, 'Restart $1?' ],
	[ /^(.+) löschen\?$/, 'Delete $1?' ],
	[ /^(\d+) von (\d+) Geräten online$/, '$1 of $2 devices online' ],
	[ /^von (.+)$/, 'of $1' ],
	[ /Tageslimit für (.+) erreicht \((\d+) Min\.\)/, 'Daily limit reached for $1 ($2 min)' ],
	[ /Tageslimit für (.+) aufgehoben/, 'Daily limit lifted for $1' ],
	[ /^Zeitplan „(.+)“ gestartet$/, 'Schedule “$1” started' ],
	[ /(\d+) von (\d+) Router\b/, '$1 of $2 routers' ],
	[ /^alle (\d+) Router$/, 'all $1 routers' ],
	[ /^Aus von (\S+) bis (\S+)$/, 'Off from $1 to $2' ],
	[ /^(\d+) Router noch ohne HTTPS$/, (m, n) => n + (n === '1' ? ' router' : ' routers') + ' still without HTTPS' ],
	[ /^(\d+) Router noch ohne Verschlüsselung$/, (m, n) => n + (n === '1' ? ' router' : ' routers') + ' still unencrypted' ],
	[ /(\d+) T (\d+) Std/g, '$1 d $2 h' ],
	[ /(\d+) Std (\d+) Min/g, '$1 h $2 min' ],
	[ /(\d+) Freigaben? ins Internet aktiv/g, (m, n) => n + (n === '1' ? ' port forward' : ' port forwards') + ' open to the internet' ],
	[ /(\d+) Geräte\b/g, (m, n) => n + (n === '1' ? ' device' : ' devices') ],
	[ /(\d+) Gerät\b/g, '$1 device' ],
	[ /(\d+) Router\b/g, (m, n) => n + (n === '1' ? ' router' : ' routers') ],
	[ /^(.+) mit (.+?)( \([^)]*\))? verbunden$/, '$1 connected to $2$3' ],
	[ /^(.+) von (.+) getrennt$/, '$1 disconnected from $2' ],
	[ /^(.+) hat (\S+) bekommen$/, '$1 got $2' ],
	[ /^(.+) wechselt von (.+) zu (.+)$/, '$1 moves from $2 to $3' ],
	[ /^noch (.+?) · Limit (.+)$/, '$1 left · limit $2' ],
	[ /^(.+) aktiv$/, '$1 active' ],
	[ /(\d),(\d)/g, '$1.$2' ]
];

const I18N = {
	lang: 'de',
	/* 'auto' = Sprache des Handys: Deutsch, sonst Englisch */
	set(pref) {
		const sys = (navigator.language || 'de').toLowerCase();
		this.lang = pref === 'en' || (pref !== 'de' && !sys.startsWith('de')) ? 'en' : 'de';
		document.documentElement.lang = this.lang;
		return this.lang;
	},
	_re: null,
	re() {
		if (this._re) return this._re;
		// Textstücke ab 3 Zeichen, längste zuerst, nur als ganze Wörter
		// Wortgrenze nur dort prüfen, wo das Stück mit einem Buchstaben anfängt bzw. endet (z. B. „GERÄTE (“ + Zahl)
		const w = /[\p{L}\d]/u;
		const keys = Object.keys(EN).filter((k) => k.length >= 3 && !EN_EXACT.has(k)).sort((a, b) => b.length - a.length)
			.map((k) => (w.test(k[0]) ? '(?<![\\p{L}\\d_-])' : '') + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (w.test(k[k.length - 1]) ? '(?![\\p{L}\\d_-])' : ''));
		this._re = new RegExp(keys.join('|'), 'gu');
		return this._re;
	},
	t(s) {
		if (this.lang !== 'en' || s == null) return s;
		const str = String(s), lead = str.match(/^\s*/)[0], trail = str.match(/\s*$/)[0], core = str.trim();
		if (!core) return str;
		if (Object.prototype.hasOwnProperty.call(EN, core)) return lead + EN[core] + trail;
		let out = core;
		for (const [ rx, rep ] of EN_RX) out = out.replace(rx, rep);
		out = out.replace(this.re(), (m) => EN[m]);
		return lead + out + trail;
	},
	/* Fertig gezeichnete Seite übersetzen (Code, Eingaben und Router-Ausgaben bleiben wie sie sind) */
	dom(root) {
		if (this.lang !== 'en' || !root) return;
		const skip = (el) => el && el.closest && el.closest('pre, code, textarea, .mono, .ph-console, [data-notr]');
		const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		const nodes = [];
		while (w.nextNode()) nodes.push(w.currentNode);
		for (const n of nodes) {
			if (!/[A-Za-zÄÖÜäöüß]/.test(n.nodeValue)) continue;
			// Zahlen mit Einheit in .mono (z. B. „1 Std 15 Min“, „4,8 GB“) – nur die Einheiten, keine Adressen oder Code
			if (n.parentElement && n.parentElement.closest('.mono') && !n.parentElement.closest('pre, code, textarea, .ph-console')) {
				const v = n.nodeValue.replace(/(\d+) Std\b/g, '$1 h').replace(/(\d+) Min\b/g, '$1 min').replace(/(\d),(\d)/g, '$1.$2');
				if (v !== n.nodeValue) n.nodeValue = v;
				continue;
			}
			if (skip(n.parentElement)) continue;
			const v = this.t(n.nodeValue);
			if (v !== n.nodeValue) n.nodeValue = v;
		}
		root.querySelectorAll && root.querySelectorAll('[placeholder], [aria-label], [title]').forEach((el) => {
			for (const a of [ 'placeholder', 'aria-label', 'title' ]) if (el.hasAttribute(a)) el.setAttribute(a, this.t(el.getAttribute(a)));
		});
	}
};
window.I18N = I18N;
