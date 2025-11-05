// Data Synchronization between IndexedDB and Firebase
import { FirebaseDB } from './firebase-config.js';
import IndexedDB from './indexeddb.js';

// Check if the app is online
function isOnline() {
  return navigator.onLine;
}

// Sync Manager with Automatic Periodic Sync
const SyncManager = {
  isSyncing: false,
  syncInProgress: false,
  syncInterval: null,
  syncIntervalMs: 15000, // Auto-sync every 15 seconds when online

  // Initialize sync listeners and start periodic sync
  init() {
    console.log('[Sync] 🔄 Initializing Sync Manager with auto-sync...');

    // Listen for online event - sync immediately when connection restored
    window.addEventListener('online', () => {
      console.log('[Sync] 🌐 Connection restored - starting sync');
      this.updateOnlineStatus(true);
      this.showSyncNotification('✅ Back online! Syncing your data...');
      this.syncAll(); // Immediate sync
      this.startPeriodicSync(); // Restart periodic sync
    });

    // Listen for offline event
    window.addEventListener('offline', () => {
      console.log('[Sync] 📴 Connection lost - switching to offline mode');
      this.updateOnlineStatus(false);
      this.showSyncNotification('📴 You are offline. Changes will sync when reconnected.');
      this.stopPeriodicSync(); // Stop periodic sync when offline
    });

    // Listen for service worker sync events
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        return registration.sync.register('sync-reminders');
      }).catch((err) => {
        console.log('[Sync] ⚠️ Background sync registration failed:', err);
      });
    }

    // Listen for messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'PERFORM_SYNC') {
          console.log('[Sync] 📥 Sync request from service worker');
          this.syncAll();
        }
      });
    }

    // Update initial online status
    if (isOnline()) {
      this.updateOnlineStatus(true);
      console.log('[Sync] 🌐 App is ONLINE - starting periodic sync');
      this.startPeriodicSync();
      // Do initial sync after 2 seconds (give time for app to fully load)
      setTimeout(() => this.syncAll(), 2000);
    } else {
      this.updateOnlineStatus(false);
      console.log('[Sync] 📴 App is OFFLINE - periodic sync disabled');
    }

    console.log('[Sync] ✅ Sync manager initialized');
  },

  // Start automatic periodic sync
  startPeriodicSync() {
    // Clear any existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Only start if online
    if (!isOnline()) {
      console.log('[Sync] 📴 Cannot start periodic sync - offline');
      return;
    }

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      if (isOnline() && !this.syncInProgress) {
        console.log('[Sync] ⏰ Periodic sync triggered');
        this.syncAll();
      }
    }, this.syncIntervalMs);

    console.log(`[Sync] ⏰ Periodic sync started (every ${this.syncIntervalMs / 1000}s)`);
  },

  // Stop periodic sync
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[Sync] ⏸️ Periodic sync stopped');
    }
  },

  // Update online/offline indicator in UI
  updateOnlineStatus(online) {
    const statusElement = document.getElementById('online-status');
    if (statusElement) {
      statusElement.textContent = online ? '🌐 Online' : '📴 Offline';
      statusElement.style.color = online ? '#27ae60' : '#e74c3c';
      statusElement.style.fontWeight = 'bold';
    }
  },

  // Sync all unsynced data from IndexedDB to Firebase (AUTOMATIC)
  async syncAll() {
    if (this.syncInProgress) {
      console.log('[Sync] ⏳ Sync already in progress, skipping...');
      return;
    }

    if (!isOnline()) {
      console.log('[Sync] 📴 Offline - cannot sync');
      return;
    }

    this.syncInProgress = true;
    console.log('[Sync] 🔄 Starting automatic sync...');

    try {
      // Get all unsynced reminders from IndexedDB
      const unsyncedReminders = await IndexedDB.getUnsyncedReminders();
      
      if (unsyncedReminders.length === 0) {
        console.log('[Sync] ✅ No unsynced data found');
        this.syncInProgress = false;
        return;
      }

      console.log(`[Sync] 📤 Found ${unsyncedReminders.length} unsynced reminders - syncing to Firebase...`);

      // Sync each reminder to Firebase
      let successCount = 0;
      let failCount = 0;

      for (const reminder of unsyncedReminders) {
        try {
          await FirebaseDB.setReminder(reminder.id, reminder);
          await IndexedDB.markAsSynced(reminder.id);
          successCount++;
          console.log(`[Sync] ✅ Synced: ${reminder.name || reminder.id}`);
        } catch (error) {
          console.error(`[Sync] ❌ Failed to sync reminder ${reminder.id}:`, error);
          failCount++;
        }
      }

      console.log(`[Sync] ✅ Sync complete: ${successCount} succeeded, ${failCount} failed`);
      
      if (successCount > 0) {
        this.showSyncNotification(`✅ Auto-synced ${successCount} reminder(s) to cloud!`);
      }
      
      if (failCount > 0) {
        this.showSyncNotification(`⚠️ ${failCount} reminder(s) failed to sync. Will retry.`);
      }

    } catch (error) {
      console.error('[Sync] ❌ Sync error:', error);
      this.showSyncNotification('❌ Sync failed. Will retry automatically.');
    } finally {
      this.syncInProgress = false;
    }
  },

  // Force sync now (manual trigger)
  async syncNow() {
    console.log('[Sync] 🔄 Manual sync triggered');
    return await this.syncAll();
  },

  // Pull data from Firebase to IndexedDB (useful on first load or data recovery)
  async pullFromFirebase() {
    if (!isOnline()) {
      console.log('[Sync] 📴 Offline - cannot pull from Firebase');
      return [];
    }

    console.log('[Sync] 📥 Pulling data from Firebase...');

    try {
      const firebaseReminders = await FirebaseDB.getAllReminders();
      
      console.log(`[Sync] 📥 Retrieved ${firebaseReminders.length} reminders from Firebase`);

      // Save each reminder to IndexedDB
      for (const reminder of firebaseReminders) {
        await IndexedDB.setReminder(reminder.id, {
          ...reminder,
          synced: true // Mark as synced since it came from Firebase
        });
      }

      console.log('[Sync] ✅ Pull from Firebase complete');
      return firebaseReminders;

    } catch (error) {
      console.error('[Sync] ❌ Error pulling from Firebase:', error);
      throw error;
    }
  },

  // Show sync notification to user
  showSyncNotification(message) {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'sync-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #16213e;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
      border-left: 4px solid #27ae60;
    `;

    document.body.appendChild(notification);

    // Remove after 4 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 4000);
  },

  // Get current sync status
  getStatus() {
    return {
      online: isOnline(),
      syncing: this.syncInProgress,
      periodicSyncActive: this.syncInterval !== null
    };
  }
};

// Storage Manager - decides whether to use Firebase or IndexedDB
const StorageManager = {
  // Save a reminder (automatically chooses Firebase or IndexedDB)
  async saveReminder(reminderId, reminderData) {
    try {
      // Always save to IndexedDB first (for offline support)
      await IndexedDB.setReminder(reminderId, reminderData);
      console.log(`[Storage] ✅ Saved to IndexedDB: ${reminderId}`);

      // If online, also save to Firebase immediately
      if (isOnline()) {
        try {
          await FirebaseDB.setReminder(reminderId, reminderData);
          await IndexedDB.markAsSynced(reminderId);
          console.log(`[Storage] ✅ Saved to Firebase: ${reminderId}`);
        } catch (error) {
          console.error('[Storage] ⚠️ Firebase save failed, will sync later:', error);
          // Don't throw - IndexedDB save succeeded, auto-sync will handle it
        }
      } else {
        console.log('[Storage] 📴 Offline - marked for auto-sync when online');
      }

      return true;
    } catch (error) {
      console.error('[Storage] ❌ Error saving reminder:', error);
      throw error;
    }
  },

  // Get a reminder (tries IndexedDB first, then Firebase)
  async getReminder(reminderId) {
    try {
      // Try IndexedDB first (fastest)
      const localReminder = await IndexedDB.getReminder(reminderId);
      if (localReminder) {
        console.log(`[Storage] ✅ Retrieved from IndexedDB: ${reminderId}`);
        return localReminder;
      }

      // If not found locally and online, try Firebase
      if (isOnline()) {
        console.log(`[Storage] 🌐 Not in IndexedDB, trying Firebase: ${reminderId}`);
        const firebaseReminder = await FirebaseDB.getReminder(reminderId);
        
        if (firebaseReminder) {
          // Save to IndexedDB for offline access
          await IndexedDB.setReminder(reminderId, {
            ...firebaseReminder,
            synced: true
          });
          return firebaseReminder;
        }
      }

      console.log(`[Storage] ℹ️ Reminder not found: ${reminderId}`);
      return null;

    } catch (error) {
      console.error('[Storage] ❌ Error getting reminder:', error);
      throw error;
    }
  },

  // Get all reminders
  async getAllReminders() {
    try {
      // Always try IndexedDB first
      const localReminders = await IndexedDB.getAllReminders();
      console.log(`[Storage] ✅ Retrieved ${localReminders.length} reminders from IndexedDB`);

      // If online and no local data, try pulling from Firebase
      if (isOnline() && localReminders.length === 0) {
        console.log('[Storage] 🌐 No local data, pulling from Firebase...');
        const firebaseReminders = await SyncManager.pullFromFirebase();
        return firebaseReminders || [];
      }

      return localReminders;

    } catch (error) {
      console.error('[Storage] ❌ Error getting all reminders:', error);
      throw error;
    }
  },

  // Delete a reminder
  async deleteReminder(reminderId) {
    try {
      // Delete from IndexedDB
      await IndexedDB.deleteReminder(reminderId);
      console.log(`[Storage] ✅ Deleted from IndexedDB: ${reminderId}`);

      // If online, also delete from Firebase
      if (isOnline()) {
        try {
          await FirebaseDB.deleteReminder(reminderId);
          console.log(`[Storage] ✅ Deleted from Firebase: ${reminderId}`);
        } catch (error) {
          console.error('[Storage] ⚠️ Firebase delete failed:', error);
          // Don't throw - local delete succeeded
        }
      }

      return true;
    } catch (error) {
      console.error('[Storage] ❌ Error deleting reminder:', error);
      throw error;
    }
  }
};

// Add CSS animations for notifications
if (!document.getElementById('sync-notification-styles')) {
  const style = document.createElement('style');
  style.id = 'sync-notification-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    .sync-notification:hover {
      transform: scale(1.02);
      transition: transform 0.2s ease;
    }
  `;
  document.head.appendChild(style);
}

export { SyncManager, StorageManager, isOnline };