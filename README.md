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
│
├── /css
│   ├── styles.css              # Main application styles (dark theme, UI components)
│   └── reset.css               # CSS reset for consistent cross-browser styling
│
├── /data
│   ├── games.json              # Game data and reminder configurations
│   └── mock-data.json          # Empty file for future mock data
│
├── /images
│   ├── /icons
│   │   ├── icon-48x48.png      # PWA icon (48x48)
│   │   ├── icon-72x72.png      # PWA icon (72x72)
│   │   ├── icon-96x96.png      # PWA icon (96x96)
│   │   ├── icon-144x144.png    # PWA icon (144x144)
│   │   ├── icon-192x192.png    # PWA icon (192x192)
│   │   └── icon-512x512.png    # PWA icon (512x512)
│   └── logo.png                # Application logo
│
├── /js
│   ├── app.js                  # Main application controller (initialization & event handling)
│   ├── firebase-config.js      # Firebase setup and Firestore operations
│   ├── indexeddb.js            # IndexedDB configuration and CRUD operations
│   ├── reminders.js            # Reminder timer logic and notification handling
│   ├── sync.js                 # Synchronization manager (Firebase ↔ IndexedDB)
│   └── ui.js                   # Empty - reserved for future UI utilities
│
├── index.html                  # Main HTML page with reminder UI
├── manifest.json               # PWA manifest (app metadata, icons, theme)
├── service-worker.js           # Service worker (offline caching, background sync)
└── README.md                   # Project documentation (this file)
```

I tested the protytpe example UI using a local server trough visual studio code. I used bash within the terminal and used the following codes:

http-server -p 8080 (To activate the server)

http://127.0.0.1:8080 (This is used to see the html website, used within the URL search of google)

New features as of 10/27/2025 The app now Works-Offline and it is downloadable on any device. The download button for the app is within the search URL of the app's website.

Explanation:

Service Worker & Caching Strategy The app uses a Cache-First strategy implemented in service-worker.js to ensure reliable offline functionality. During the install event, the service worker pre-caches essential resources including HTML, CSS, images, icons, and the manifest file into a cache named game-reminders-v2. When the app is accessed, the fetch event handler first checks the cache for requested resources. If found, it serves them immediately from the cache, providing instant load times and offline access. If a resource isn't cached, the service worker fetches it from the network and dynamically adds it to the cache for future use. This approach ensures users can access their game reminders even without an internet connection. The activate event cleans up outdated caches when the service worker updates, maintaining efficient storage management.

Web App Manifest The manifest.json file defines the app's metadata and appearance when installed. It specifies the app name, short name, description, and sets the start URL to /index.html with a computed App ID matching the current identity. The manifest includes icons in multiple sizes (48x48, 72x72, 96x96, 144x144, 192x192, 512x512) with separate maskable icons for adaptive platform support. Display mode is set to standalone to provide a native app experience without browser UI, while portrait-primary orientation optimizes the mobile gaming use case. Theme color (#16213e) and background color (#1a1a2e) create a cohesive dark-themed interface matching the app's design. Screenshots for both mobile (narrow form factor) and desktop (wide form factor) enable the enhanced install UI on supported platforms.

Integration & Testing The service worker is registered in index.html via a load event listener that logs registration success and monitors for updates. The manifest is linked in the HTML head with appropriate meta tags for theme color and Apple touch icons for iOS compatibility. The app successfully installs on desktop with a standalone window, functions completely offline after initial load, and caches all 11 essential resources. Testing confirmed offline functionality through Chrome DevTools' Network tab offline mode, verified cache storage contents in Application tab, and validated the service worker's activated status. The app is installable across devices and maintains full functionality without network connectivity.







#Implentations as of 11/8/25 
#Firebase and IndexedDB Integration


Overview of Integration
I integrated both Firebase Firestore (cloud database) and IndexedDB (local browser database) into my application to create a robust offline-first architecture. This dual-database approach ensures my app works seamlessly whether users are online or offline, with automatic synchronization between the two storage systems.
Why I Used Both Databases

Firebase Firestore - Provides cloud storage for cross-device data access and persistence
IndexedDB - Enables offline functionality and instant local data access without network latency

Integration Architecture
1. Firebase Setup (js/firebase-config.js)
I chose to use the Firebase CDN instead of npm packages because my project runs on a simple local server without a build process. The CDN approach simplified integration and avoided needing bundlers like Webpack.
javascript// Initialize Firebase with CDN scripts
I configured Firebase with my project credentials and enabled offline persistence, which allows Firebase to cache data locally.
Key Firebase Implementation:


2. IndexedDB Setup (js/indexeddb.js)
I created an IndexedDB database called GameRemindersDB with a single object store called reminders. The object store uses id as the keyPath for unique identification.
javascriptconst DB_NAME = 'GameRemindersDB';
const DB_VERSION = 1;
const STORE_NAME = 'reminders';
I created four indexes for efficient querying:

gameId - To filter reminders by game
subsectionId - To filter by game section
synced - To identify unsynced reminders (critical for synchronization)
enabled - To quickly find active reminders

StorageManager - Provides a unified storage interface:

Automatically chooses between Firebase and IndexedDB based on connection status
Always writes to IndexedDB first (for offline support)
Attempts Firebase write if online
Falls back gracefully if Firebase fails


CRUD Operations - Usage Instructions
Data Structure
Each reminder in my application has this structure within FirebaseDatabase:
{
deviceId: "device_1762372051573_d5u2idxba" 
enabled: false 
gameId:"ldoe" 
id: "motel" 
lastModified: 1762434721345
lastReset: null
name: "Motel"
subsectionId: "settlement-locations"
synced: true
timerHours: 24
timerMinutes: 0
timerSeconds: 1
updatedAt: "2025-11-06T13:12:09.331Z"
}


Open the app
Data loads automatically from IndexedDB (instant)
If online and data missing locally, fetches from Firebase

// This automatically:
// 1. Updates in IndexedDB with synced: false
// 2. Updates in Firebase Firestore
// 3. Marks as synced in IndexedDB
await StorageManager.saveReminder(reminderId, updatedData);
Offline Mode:
javascript// Same code! The difference is:
// 1. Updates in IndexedDB with synced: false
// 2. Firebase update queued for later
// 3. SyncManager syncs automatically when online
await StorageManager.saveReminder(reminderId, updatedData);
User Steps:

Modify timer values or toggle On/Off
Click "Save" button
Changes applied immediately to local storage
If offline, syncs to cloud when connection restored

DELETE Operation
Online Mode:
javascript// When user deletes a reminder (future feature)
// This automatically:
// 1. Deletes from IndexedDB
// 2. Deletes from Firebase Firestore
await StorageManager.deleteReminder(reminderId);
Offline Mode:
javascript// Same code! The difference is:
// 1. Deletes from IndexedDB immediately
// 2. Firebase deletion happens when online
await StorageManager.deleteReminder(reminderId);
User Steps:

Synchronization Process
How Synchronization Works
I implemented a sophisticated automatic synchronization system that maintains data consistency between IndexedDB and Firebase without manual intervention.



//Maintaining Firebase IDs
My ID Strategy:
I use deterministic IDs based on game structure, not Firebase auto-generated IDs. This approach solves several problems:
javascript// ID Format: {gameId}-{subsectionId}-{reminderName}
const reminderId = "ldoe-settlements-port-laboratory";
Why This Works:

Consistency Across Devices: Same reminder has same ID everywhere
Offline Creation: Can create IDs without Firebase connection
No Sync Conflicts: IDs determined by app logic, not database
Easy Updates: Same ID used in IndexedDB and Firebase


This ensures:

IndexedDB record ID matches Firebase document ID
No ID conflicts or duplicates
Easy lookups: getDoc(doc(db, 'reminders', reminderId))
Predictable data structure

Testing the Sync System
Test Scenario 1: Offline Changes

Open app in browser: http://127.0.0.1:8080
Turn off WiFi or enable offline mode in DevTools
Modify a reminder (change timer, toggle on/off)
Click "Save" - see "Saved offline. Will sync when online"
Open DevTools → Application → IndexedDB → GameRemindersDB → reminders
Verify reminder has synced: false
Turn WiFi back on
Within 15 seconds, see sync notification
Check IndexedDB - reminder now has synced: true
Check Firebase Console - data appears in cloud

Test Scenario 2: Multiple Offline Changes

Go offline
Make 3-4 different reminder changes
All save locally with synced: false
Go back online
SyncManager automatically uploads all unsynced changes
All reminders marked as synced: true

Test Scenario 3: Sync Failure Recovery

Make changes online
Simulate network issues (slow 3G in DevTools)
Some syncs may fail
SyncManager retries automatically
Eventually all data syncs successfully


Technical Implementation Summary
Storage Strategy:

IndexedDB is the primary local storage (instant access, offline support)
Firebase is the cloud backup (cross-device sync, data persistence)
StorageManager abstracts complexity (developers use one API)

Sync Strategy:

Automatic synchronization (no manual sync buttons needed)
Optimistic updates (save locally first, sync in background)
Periodic polling (every 15 seconds when online)
Event-driven triggers (online/offline, visibility change)
Retry with backoff (handles transient network failures)

ID Strategy:

Deterministic IDs based on app structure
Same ID in IndexedDB and Firebase
No auto-generated IDs (enables offline creation)
No sync conflicts (predictable ID generation)



Running the Application
bash# Install http-server
npm install -g http-server

I found out that the easiest way to get the new app's version (update) is to re-download the app from the http browser.