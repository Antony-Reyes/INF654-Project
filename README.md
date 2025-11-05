INF654-Project - Antony Reyes
#Description-of-PWA Prototype This application provides reminder notifications for players on any game they’d like. The prototype of this app will be focused on one game for now: Last Day on Earth (LDOE), which is a mobile game. Eventually, the user will be able to add any game they want to this app, or any type of reminder.

Important: The prototype/demo is only being used on a local server thorugh a browser. It is not a app yet or a fully developed PWA. This is just to desmostrate the layout of what a PWA would need.

Although the PWA is mainly intended for video games—specifically games that take time to play and progress, such as Clash of Clans or Boom Beach (mobile games)—the user will eventually be able to edit everything about the reminders. Therefore, the app can also be used for other purposes, such as workout reminders, sleep, naps, cooking, work, etc.

The user may use the app for any kind of reminder and receive customized notifications tailored to their preferences.

Features Coming Soon to the PWA: Actual Notifications Works-Offline capabilities Capability of Saving Reminder Settings/changes. Capability Allowing more than one Video Game on the app. (Max 3 games : 2 Sub-Sections per game : 8 Reminders Sections per Sub-Section of a Game) Adding other Types of reminder Settings to help players or regular users use the PWA to the most of their convenience.

Default click ons: /Last Day On Earth (LDOE) Main video game link/folder

/Settlement Locations Settings 		(Section of Reminders for Game (link/folder))
Port Laboratory		(Timer for notification alarm(00:00))(on-off)(Reset Button)	
Port Sewers
Farm
Motel
Abandoned Factory
Gas Station
Transport Hub
Daily Loot

/Current Progress Settings      (Section of Reminders for Game (link/folder))
Storehouse      (Timer for notification alarm(00:00))(on-off)(Reset Button)	
Woodshop
Foundry
Assembly
Workshop


/INF654-PROJECT
├── /css
│   ├── styles.css
│   └── reset.css
    /data
│   ├── games.json
│   └── mock-data.json
├── /images
│   ├── /icons
│   │   ├── icon-48x48.png
│   │   ├── icon-72x72.png
│   │   ├── icon-96x96.png
│   │   ├── icon-144x144.png
│   │   ├── icon-192x192.png
│   │   └── icon-512x512.png
│   └── logo.png
├── /js
│   ├── app.js ✅ (NEW)
│   ├── firebase-config.js ✅ (NEW)
│   ├── indexeddb.js ✅ (NEW)
│   ├── reminders.js ✅ (NEW)
│   ├── sync.js ✅ (NEW)
│   └── ui.js (empty - not needed yet)
├── index.html ✅ (UPDATED)
├── manifest.json
├── README.md 
└── service-worker.js ✅ (UPDATED)

I tested the protytpe example UI using a local server trough visual studio code. I used bash within the terminal and used the following codes:

http-server -p 8080 (To activate the server)

http://127.0.0.1:8080 (This is used to see the html website, used within the URL search of google)

New features as of 10/27/2025 The app now Works-Offline and it is downloadable on any device. The download button for the app is within the search URL of the app's website.

Explanation:

Service Worker & Caching Strategy The app uses a Cache-First strategy implemented in service-worker.js to ensure reliable offline functionality. During the install event, the service worker pre-caches essential resources including HTML, CSS, images, icons, and the manifest file into a cache named game-reminders-v2. When the app is accessed, the fetch event handler first checks the cache for requested resources. If found, it serves them immediately from the cache, providing instant load times and offline access. If a resource isn't cached, the service worker fetches it from the network and dynamically adds it to the cache for future use. This approach ensures users can access their game reminders even without an internet connection. The activate event cleans up outdated caches when the service worker updates, maintaining efficient storage management.

Web App Manifest The manifest.json file defines the app's metadata and appearance when installed. It specifies the app name, short name, description, and sets the start URL to /index.html with a computed App ID matching the current identity. The manifest includes icons in multiple sizes (48x48, 72x72, 96x96, 144x144, 192x192, 512x512) with separate maskable icons for adaptive platform support. Display mode is set to standalone to provide a native app experience without browser UI, while portrait-primary orientation optimizes the mobile gaming use case. Theme color (#16213e) and background color (#1a1a2e) create a cohesive dark-themed interface matching the app's design. Screenshots for both mobile (narrow form factor) and desktop (wide form factor) enable the enhanced install UI on supported platforms.

Integration & Testing The service worker is registered in index.html via a load event listener that logs registration success and monitors for updates. The manifest is linked in the HTML head with appropriate meta tags for theme color and Apple touch icons for iOS compatibility. The app successfully installs on desktop with a standalone window, functions completely offline after initial load, and caches all 11 essential resources. Testing confirmed offline functionality through Chrome DevTools' Network tab offline mode, verified cache storage contents in Application tab, and validated the service worker's activated status. The app is installable across devices and maintains full functionality without network connectivity.