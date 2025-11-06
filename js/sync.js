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
  retryCount: 0,
  maxRetries: 3,
  initialized: false,

  // Initialize sync listeners and start periodic sync
  init() {
    if (this.initialized) {
      console.log('[Sync] ⚠️ Already initialized, skipping...');
      return;
    }

    console.log('[Sync] 🔄 Initializing Sync Manager with auto-sync...');
    this.initialized = true;

    // Listen for online event - sync immediately when connection restored
    window.addEventListener('online', () => {
      console.log('[Sync] 🌐 Connection restored - starting immediate sync');
      this.updateOnlineStatus(true);
      this.showSyncNotification('✅ Back online! Syncing your data...');
      
      // Clear any existing interval and start fresh
      this.stopPeriodicSync();
      
      // Immediate sync with slight delay to ensure connection is stable
      setTimeout(() => {
        this.syncAll();
        this.startPeriodicSync();
      }, 500);
    });

    // Listen for offline event
    window.addEventListener('offline', () => {
      console.log('[Sync] 📴 Connection lost - switching to offline mode');
      this.updateOnlineStatus(false);
      this.showSyncNotification('📴 You are offline. Changes will sync when reconnected.');
      this.stopPeriodicSync();
    });

    // Listen for visibility change (user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && isOnline() && !this.syncInProgress) {
        console.log('[Sync] 👁️ Tab visible and online - checking for sync');
        // Small delay to avoid multiple rapid syncs
        setTimeout(() => {
          if (!this.syncInProgress) {
            this.syncAll();
          }
        }, 1000);
      }
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
      
      // Initial sync after a longer delay to ensure everything is loaded
      setTimeout(() => {
        console.log('[Sync] 🚀 Running initial sync check...');
        this.syncAll();
      }, 3000);
      
      // Start periodic sync
      this.startPeriodicSync();
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
      this.syncInterval = null;
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
      } else if (!isOnline()) {
        console.log('[Sync] 📴 Skipping periodic sync - offline');
        this.stopPeriodicSync();
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

    // Also update any other status indicators
    const syncButton = document.getElementById('sync-button');
    if (syncButton) {
      syncButton.disabled = !online;
      syncButton.title = online ? 'Sync now' : 'Cannot sync while offline';
    }
  },

  // Sync all unsynced data from IndexedDB to Firebase (AUTOMATIC)
  async syncAll() {
    if (this.syncInProgress) {
      console.log('[Sync] ⏳ Sync already in progress, skipping...');
      return { success: false, reason: 'already_syncing' };
    }

    if (!isOnline()) {
      console.log('[Sync] 📴 Offline - cannot sync');
      return { success: false, reason: 'offline' };
    }

    this.syncInProgress = true;
    console.log('[Sync] 🔄 Starting automatic sync...');

    try {
      // Get all unsynced reminders from IndexedDB
      const unsyncedReminders = await IndexedDB.getUnsyncedReminders();
      
      if (unsyncedReminders.length === 0) {
        console.log('[Sync] ✅ No unsynced data found - all up to date!');
        this.syncInProgress = false;
        this.retryCount = 0; // Reset retry counter on success
        return { success: true, synced: 0, reason: 'no_changes' };
      }

      console.log(`[Sync] 📤 Found ${unsyncedReminders.length} unsynced reminders - syncing to Firebase...`);

      // Sync each reminder to Firebase
      let successCount = 0;
      let failCount = 0;
      const failedIds = [];

      for (const reminder of unsyncedReminders) {
        try {
          // Verify we're still online before each operation
          if (!isOnline()) {
            console.log('[Sync] 📴 Lost connection during sync');
            throw new Error('Connection lost during sync');
          }

          // Add timeout to prevent hanging
          const syncPromise = FirebaseDB.setReminder(reminder.id, reminder);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sync timeout')), 10000)
          );

          await Promise.race([syncPromise, timeoutPromise]);
          await IndexedDB.markAsSynced(reminder.id);
          successCount++;
          console.log(`[Sync] ✅ Synced: ${reminder.name || reminder.id}`);
        } catch (error) {
          console.error(`[Sync] ❌ Failed to sync reminder ${reminder.id}:`, error);
          failCount++;
          failedIds.push(reminder.id);
        }
      }

      console.log(`[Sync] ✅ Sync complete: ${successCount} succeeded, ${failCount} failed`);
      
      if (successCount > 0) {
        this.showSyncNotification(`✅ Auto-synced ${successCount} reminder(s) to cloud!`);
        this.retryCount = 0; // Reset retry counter on success
      }
      
      if (failCount > 0 && this.retryCount < this.maxRetries) {
        this.retryCount++;
        this.showSyncNotification(`⚠️ ${failCount} reminder(s) failed to sync. Retrying... (${this.retryCount}/${this.maxRetries})`);
        
        // Retry after delay
        setTimeout(() => {
          if (isOnline() && this.retryCount <= this.maxRetries) {
            console.log(`[Sync] 🔄 Retry attempt ${this.retryCount}/${this.maxRetries}`);
            this.syncAll();
          }
        }, 5000 * this.retryCount); // Exponential backoff
      } else if (failCount > 0) {
        this.showSyncNotification('❌ Sync failed after retries. Will try again later.');
        this.retryCount = 0;
      }

      return {
        success: successCount > 0,
        synced: successCount,
        failed: failCount,
        failedIds
      };

    } catch (error) {
      console.error('[Sync] ❌ Sync error:', error);
      this.showSyncNotification('❌ Sync failed. Will retry automatically.');
      
      // Retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => {
          if (isOnline()) {
            this.syncAll();
          }
        }, 5000 * this.retryCount);
      }
      
      return { success: false, error: error.message };
    } finally {
      this.syncInProgress = false;
    }
  },

  // Force sync now (manual trigger)
  async syncNow() {
    console.log('[Sync] 🔄 Manual sync triggered by user');
    this.retryCount = 0; // Reset retry count for manual sync
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
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll('.sync-notification');
    existingNotifications.forEach(notif => {
      if (notif.parentNode) {
        notif.parentNode.removeChild(notif);
      }
    });

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
      max-width: 350px;
      word-wrap: break-word;
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
      periodicSyncActive: this.syncInterval !== null,
      retryCount: this.retryCount,
      initialized: this.initialized
    };
  },

  // Check for unsynced data count (useful for UI indicators)
  async getUnsyncedCount() {
    try {
      const unsynced = await IndexedDB.getUnsyncedReminders();
      return unsynced.length;
    } catch (error) {
      console.error('[Sync] ❌ Error getting unsynced count:', error);
      return 0;
    }
  }
};

// Storage Manager - decides whether to use Firebase or IndexedDB
const StorageManager = {
  // Save a reminder (automatically chooses Firebase or IndexedDB)
  async saveReminder(reminderId, reminderData) {
    try {
      // Ensure the data has proper structure
      const dataToSave = {
        ...reminderData,
        id: reminderId,
        lastModified: Date.now(),
        synced: false // Initially mark as unsynced
      };

      // Always save to IndexedDB first (for offline support)
      await IndexedDB.setReminder(reminderId, dataToSave);
      console.log(`[Storage] ✅ Saved to IndexedDB: ${reminderId}`);

      // If online, also save to Firebase immediately
      if (isOnline()) {
        try {
          await FirebaseDB.setReminder(reminderId, dataToSave);
          await IndexedDB.markAsSynced(reminderId);
          console.log(`[Storage] ✅ Saved to Firebase: ${reminderId}`);
          SyncManager.showSyncNotification('✅ Changes saved and synced!');
        } catch (error) {
          console.error('[Storage] ⚠️ Firebase save failed, will sync later:', error);
          SyncManager.showSyncNotification('💾 Saved locally. Will sync when online.');
          // Trigger an immediate sync attempt after a short delay
          setTimeout(() => {
            if (isOnline()) {
              SyncManager.syncAll();
            }
          }, 2000);
        }
      } else {
        console.log('[Storage] 📴 Offline - marked for auto-sync when online');
        SyncManager.showSyncNotification('💾 Saved offline. Will sync when online.');
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