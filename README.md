# INF654- Final Project - Antony Reyes
# Final Integrations as of 12/4/25


# Project Overview Important:
Description-of-PWA Prototype This application provides reminder notifications for players on any game they’d like. The prototype of this app will be focused on one game for now: Last Day on Earth (LDOE), which is a mobile game. Eventually, the user will be able to add any game they want to this app, or any type of reminder.
The prototype/demo is only being used on a local server thorugh a browser in order to download it. It is not a app yet or a fully developed PWA. This is just to desmostrate the layout of what a PWA would need. The app can be fully accessed and downloaded if the local server is turned on. However, the local server does not have to be tuned on in order to update the online firebase database or to use the app offline once it is already installed. Accounts must be (signed up) with an (online) connection only. Once the account has signed up, it will be able to access the app even without a connection with that pre-made account.

# Description of PWA:
Although the PWA is mainly intended for video games—specifically games that take time to play and progress, such as Clash of Clans or Boom Beach (mobile games)—the user will eventually be able to edit everything about the reminders. Therefore, the app can also be used for other purposes, such as workout reminders, sleep, naps, cooking, work, etc.
The user may use the app for any kind of reminder and receive customized notifications tailored to their preferences.

# Technical Implementation Brief Explanation:
The app is built using a modern web stack that combines Firebase, IndexedDB, a service worker, and a web app manifest to enable secure, reliable functionality. Firebase handles user authentication and real-time cloud data storage, ensuring that user accounts and sensitive information remain protected. IndexedDB provides secure local storage for offline access, allowing the app to function even without an internet connection while keeping data synced when connectivity returns. The service worker manages caching, background tasks, and offline capabilities, enhancing both performance and security. Finally, the manifest.json enables installation as a Progressive Web App (PWA), creating a seamless and consistent user experience across devices.

# Challenges and Solutions:
The most significant technical challenge encountered was implementing offline authentication functionality. Firebase Authentication requires an active internet connection to verify user credentials, which prevented users from accessing the app while offline even if they had previously signed in. To solve this, I developed a custom offline authentication cache system using a separate IndexedDB database (GameRemindersAuthDB) that securely stores hashed user credentials (using SHA-256) after successful online authentication. When users attempt to sign in offline, the app verifies their credentials against the cached data and manually triggers authentication state callbacks to grant access. Another critical challenge was user data isolation on shared devices initially, reminder IDs like "port-laboratory" were the same for all users, causing data overwrites when switching accounts. I resolved this by implementing composite primary keys in the format userId_reminderId, ensuring each user's data remains completely isolated in IndexedDB while still allowing efficient querying through user-specific indexes.

# Lessons learned: 
This project significantly deepened my understanding of offline-first application architecture and the complexities of managing multiple data persistence layers. I learned advanced IndexedDB techniques, including composite key strategies for multi-user data isolation, cursor-based filtering for efficient queries, and proper transaction management to prevent race conditions. Working with Firebase taught me how to implement secure user authentication with credential caching, configure Firestore's persistent local cache for improved offline performance, and structure user-specific data queries using compound document IDs. The most valuable troubleshooting skill I developed was systematic debugging using browser DevTools specifically monitoring Network tab offline mode, inspecting IndexedDB storage contents in the Application tab, and analyzing Service Worker cache behavior. I also learned the importance of manual state management when bridging online and offline authentication flows, as demonstrated by implementing a callback registry system to trigger UI updates when Firebase's native onAuthStateChanged wouldn't fire for offline users.

# Future Expansion:
Features Coming Soon to the PWA: Allowing more than one Video Game on the app. (Max 3 games : 2 Sub-Sections per game : 8 Reminders Sections per Sub-Section of a Game) Adding other Types of reminder Settings to help players or regular users use the PWA to the most of their convenience.


Old documentation and history on the project is in the new directory document added to the project named "docs". It contains a file named "history_documentation.md" which contains all previous updated and documentation on the project. Testing Methods and other information is down below!


* * 
Testing Methods Description:
* * 
I tested the protytpe example UI using a local server trough visual studio code. I used bash within the terminal and used the following command codes:


http-server -p 8080 (To activate the server)

http://127.0.0.1:8080 (This is used to see the html website, used within the URL search of google (Dowload link is here after server is turned on))

Premade testing accounts already on the firebase database are:
Email:user1@test.com
Password:password123
Given userid on firebase:05vsryrHoTSNo01bDKGuUCTM1tH3


Email:user2@test.com
Password:password124
Given userid on firebase:cNadhOhsU8hdDswaA8YLsT8Rcb32


These accounts already have their own unique authenticated data and can be used to test the PWA offline and online. Their data syncs automatically offline and online to their own given userid.



Default click ons: /Last Day On Earth (LDOE) Main video game link/folder
/Settlement Locations Settings 		
Port Laboratory		(Timer for notification alarm(00:00:00))(on-off)(Reset Button)(Save Button)	
Port Sewers
Farm
Motel
Abandoned Factory
Gas Station
Transport Hub
Daily Loot

/Current Progress Settings      
Storehouse      (Timer for notification alarm(00:00:00))(on-off)(Reset Button)(Save Button)	
Woodshop
Foundry
Assembly
Workshop




Files Structure:

/INF654-PROJECT
│
├── /css
│   ├── styles.css                  # Main application styles (dark theme, UI components)
│   └── reset.css                   # CSS reset for consistent cross-browser styling
│
├── /data
│   ├── games.json                  # Game data and reminder configurations
│   └── mock-data.json              # Empty file for future mock data
│
├── /docs
│   ├── history_documentation.md    # Contains all of the old documentation on the project/app.
├── /images
│   ├── /icons
│   │   ├── icon-48x48.png          # PWA icon (48x48)
│   │   ├── icon-72x72.png          # PWA icon (72x72)
│   │   ├── icon-96x96.png          # PWA icon (96x96)
│   │   ├── icon-144x144.png        # PWA icon (144x144)
│   │   ├── icon-192x192.png        # PWA icon (192x192)
│   │   └── icon-512x512.png        # PWA icon (512x512)
│   └── logo.png                    # Application logo
│
├── /js
│   ├── app.js                      # Main application controller (initialization & event handling)
│   ├── firebase-config.js          # Firebase setup and Firestore operations
│   ├── indexeddb.js                # IndexedDB configuration and CRUD operations
│   ├── reminders.js                # Reminder timer logic and notification handling
│   ├── sync.js                     # Synchronization manager (Firebase ↔ IndexedDB)
│   └── ui.js                       # Empty - reserved for future UI utilities
│
├── index.html                      # Main HTML page with reminder UI
├── manifest.json                   # PWA manifest (app metadata, icons, theme)
├── service-worker.js               # Service worker (offline caching, background sync)
└── README.md                       # Project documentation (this file)

Example of how information Appears on Firebase Database.

/cNadhOhsU8hdDswaA8YLsT8Rcb32_port-laboratory
│
├── /compositeId
│   ├── "cNadhOhsU8hdDswaA8YLsT8Rcb32_port-laboratory"  #(string)
├── /enabled
│   ├── false                                           #(boolean)
├── /gameId
│   ├── "ldoe"                                          #(string)
├── /Id
│   ├── "port-laboratory"                               #(string)
├── /lastModified
│   ├── 1764772167842                                   #(number)
├── /lastReset
│   ├── null                                            #(null)
├── /name
│   ├── "Port Laboratory"                               #(string)
├── /reminderId
│   ├── "port-laboratory"                               #(string)
├── /subsectionId
│   ├── "settlement-locations"                          #(string)
├── /synced
│   ├── true                                            #(boolean)
├── /timerHours
│   ├── 10                                              #(number)
├── /timerMinutes
│   ├── 0                                               #(number)
├── /timerSeconds
│   ├── 0                                               #(number)
├── /updatedAt
│   ├── "2025-12-03T14:30:44.200Z"                      #(string)
├── /userId 
│   ├── "cNadhOhsU8hdDswaA8YLsT8Rcb32"                  #(string)
