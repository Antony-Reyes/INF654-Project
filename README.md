# INF654-Project - Antony Reyes

#Description-of-PWA Prototype
This application provides reminder notifications for players on any game they’d like. The prototype of this app will be focused on one game for now: Last Day on Earth (LDOE), which is a mobile game. Eventually, the user will be able to add any game they want to this app, or any type of reminder. 

Important: The prototype/demo is only being used on a local server thorugh a browser. It is not a app yet or a fully developed PWA. This is just to desmostrate the layout of what a PWA would need.

Although the PWA is mainly intended for video games—specifically games that take time to play and progress, such as Clash of Clans or Boom Beach (mobile games)—the user will eventually be able to edit everything about the reminders. Therefore, the app can also be used for other purposes, such as workout reminders, sleep, naps, cooking, work, etc.

The user may use the app for any kind of reminder and receive customized notifications tailored to their preferences.

Features Coming Soon to the PWA:
Actual Notifications
Works-Offline capabilities
Capability of Saving Reminder Settings/changes.
Capability Allowing more than one Video Game on the app. (Max 3 games : 2 Sub-Sections per game : 8 Reminders Sections per Sub-Section of a Game)
Adding other Types of reminder Settings to help players or regular users use the PWA to the most of their convenience.


Default click ons:
/Last Day On Earth (LDOE)		Main video game link/folder

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



Files Structure:
/INF654-PROJECT
    /css
        styles.css                # Main stylesheet for layout, colors, fonts, etc.
        reset.css                 # (Optional but recommended) Normalizes browser defaults
    /images
        /icons                    # Required for PWA installation (different sizes: 48x48, 96x96, 192x192, 512x512, etc.)
        logo.png                   # Branding logo, displayed in-app or on splash screen
    /js
        app.js                    # Initializes app, loads data, coordinates between UI & reminders
        service-worker.js         # Manages offline caching, assets storage, notifications
        reminders.js              # Business logic for reminders (CRUD operations: add/edit/delete/get)
        ui.js                     # DOM rendering: dynamically generates game sections & reminders
    /data
        games.json                # Primary data file: defines games, subsections, and reminders
        sample-reminders.json     # Mock/demo data for prototype & testing (safe to drop later)
    index.html                    # Main app shell (single-page PWA structure)
    manifest.json                 # PWA metadata: app name, icons, theme, display mode
    README.md                     # Documentation on setup, features, and usage

I tested the protytpe example UI using a local server trough visual studio code. I used bash within the terminal and used the following codes:

http-server -p 8080         (To activate the server)

http://127.0.0.1:8080           (This is used to see the html website, used within the URL search of google)

