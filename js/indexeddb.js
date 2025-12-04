// IndexedDB Configuration and Operations with User-Specific Data
// FIXED: Uses composite IDs (userId_reminderId) to prevent data overwrites between users
const DB_NAME = 'GameRemindersDB';
const DB_VERSION = 3; // Incremented for schema update
const STORE_NAME = 'reminders';

let db = null;

// Initialize IndexedDB
const IndexedDB = {
  // Open/Create the database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] ❌ Database failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        console.log('[IndexedDB] ✅ Database opened successfully');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        db = event.target.result;
        console.log('[IndexedDB] 🔄 Database upgrade needed');

        // Delete old object store if it exists (for clean migration)
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
          console.log('[IndexedDB] 🗑️ Old object store deleted for schema update');
        }

        // Create object store with composite key (userId_reminderId)
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'compositeId' });
        
        // Create indexes for efficient querying
        objectStore.createIndex('gameId', 'gameId', { unique: false });
        objectStore.createIndex('subsectionId', 'subsectionId', { unique: false });
        objectStore.createIndex('synced', 'synced', { unique: false });
        objectStore.createIndex('enabled', 'enabled', { unique: false });
        objectStore.createIndex('userId', 'userId', { unique: false });
        objectStore.createIndex('reminderId', 'reminderId', { unique: false }); // Original reminder ID
        
        console.log('[IndexedDB] ✅ Object store created with user-isolated schema');
      };
    });
  },

  // Generate composite ID (userId_reminderId)
  getCompositeId(userId, reminderId) {
    return `${userId}_${reminderId}`;
  },

  // Create or Update a reminder in IndexedDB (with userId)
  async setReminder(reminderId, reminderData, userId) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      if (!userId) {
        reject(new Error('User ID is required'));
        return;
      }

      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);

      // CRITICAL FIX: Use composite ID to prevent overwrites between users
      const compositeId = this.getCompositeId(userId, reminderId);

      const data = {
        ...reminderData,
        compositeId: compositeId,        // PRIMARY KEY: userId_reminderId
        reminderId: reminderId,          // Original reminder ID (for reference)
        userId: userId,                  // User who owns this reminder
        updatedAt: new Date().toISOString(),
        synced: reminderData.synced !== undefined ? reminderData.synced : false
      };

      const request = objectStore.put(data);

      request.onsuccess = () => {
        console.log(`[IndexedDB] ✅ Reminder saved: ${reminderId} for user ${userId} (compositeId: ${compositeId})`);
        resolve(data);
      };

      request.onerror = () => {
        console.error('[IndexedDB] ❌ Error saving reminder:', request.error);
        reject(request.error);
      };
    });
  },

  // Read a specific reminder from IndexedDB (user-specific)
  async getReminder(reminderId, userId) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      if (!userId) {
        reject(new Error('User ID is required'));
        return;
      }

      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      
      // CRITICAL FIX: Use composite ID to get the correct user's reminder
      const compositeId = this.getCompositeId(userId, reminderId);
      const request = objectStore.get(compositeId);

      request.onsuccess = () => {
        const data = request.result;
        
        if (data) {
          console.log(`[IndexedDB] ✅ Reminder retrieved: ${reminderId} for user ${userId}`);
          resolve(data);
        } else {
          console.log(`[IndexedDB] ℹ️ No reminder found: ${reminderId} for user ${userId}`);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[IndexedDB] ❌ Error getting reminder:', request.error);
        reject(request.error);
      };
    });
  },

  // Read all reminders from IndexedDB for specific user
  async getAllReminders(userId) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      if (!userId) {
        reject(new Error('User ID is required'));
        return;
      }

      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const userIndex = objectStore.index('userId');
      const request = userIndex.getAll(userId);

      request.onsuccess = () => {
        const userReminders = request.result;
        console.log(`[IndexedDB] ✅ Retrieved ${userReminders.length} reminders for user ${userId}`);
        resolve(userReminders);
      };

      request.onerror = () => {
        console.error('[IndexedDB] ❌ Error getting all reminders:', request.error);
        reject(request.error);
      };
    });
  },

  // Get all unsynced reminders for specific user
  async getUnsyncedReminders(userId) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      if (!userId) {
        reject(new Error('User ID is required'));
        return;
      }

      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const unsyncedReminders = [];

        // Use cursor to iterate through all records
        const request = objectStore.openCursor();

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          
          if (cursor) {
            const reminder = cursor.value;
            // Check if this record belongs to current user AND is unsynced
            if (reminder.userId === userId && (reminder.synced === false || reminder.synced === undefined)) {
              unsyncedReminders.push(reminder);
            }
            cursor.continue();
          } else {
            // No more records
            console.log(`[IndexedDB] ✅ Retrieved ${unsyncedReminders.length} unsynced reminders for user ${userId}`);
            resolve(unsyncedReminders);
          }
        };

        request.onerror = () => {
          console.error('[IndexedDB] ❌ Error getting unsynced reminders:', request.error);
          reject(request.error);
        };

      } catch (error) {
        console.error('[IndexedDB] ❌ Exception in getUnsyncedReminders:', error);
        reject(error);
      }
    });
  },

  // Mark a reminder as synced (user-specific)
  async markAsSynced(reminderId, userId) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      if (!userId) {
        reject(new Error('User ID is required'));
        return;
      }

      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      
      // CRITICAL FIX: Use composite ID
      const compositeId = this.getCompositeId(userId, reminderId);
      const getRequest = objectStore.get(compositeId);

      getRequest.onsuccess = () => {
        const data = getRequest.result;
        
        if (data) {
          data.synced = true;
          data.syncedAt = new Date().toISOString();
          const updateRequest = objectStore.put(data);

          updateRequest.onsuccess = () => {
            console.log(`[IndexedDB] ✅ Reminder marked as synced: ${reminderId} for user ${userId}`);
            resolve(true);
          };

          updateRequest.onerror = () => {
            console.error('[IndexedDB] ❌ Error marking as synced:', updateRequest.error);
            reject(updateRequest.error);
          };
        } else {
          console.warn(`[IndexedDB] ⚠️ Reminder not found: ${reminderId} for user ${userId}`);
          resolve(false);
        }
      };

      getRequest.onerror = () => {
        console.error('[IndexedDB] ❌ Error getting reminder:', getRequest.error);
        reject(getRequest.error);
      };
    });
  },

  // Delete a reminder from IndexedDB (user-specific)
  async deleteReminder(reminderId, userId) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      if (!userId) {
        reject(new Error('User ID is required'));
        return;
      }

      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      
      // CRITICAL FIX: Use composite ID
      const compositeId = this.getCompositeId(userId, reminderId);
      const deleteRequest = objectStore.delete(compositeId);

      deleteRequest.onsuccess = () => {
        console.log(`[IndexedDB] ✅ Reminder deleted: ${reminderId} for user ${userId}`);
        resolve(true);
      };

      deleteRequest.onerror = () => {
        console.error('[IndexedDB] ❌ Error deleting reminder:', deleteRequest.error);
        reject(deleteRequest.error);
      };
    });
  },

  // Clear all reminders for specific user (useful for testing/logout)
  async clearUserReminders(userId) {
    return new Promise(async (resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      if (!userId) {
        reject(new Error('User ID is required'));
        return;
      }

      try {
        // Get all reminders for this user
        const userReminders = await this.getAllReminders(userId);
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        
        // Delete each user's reminder using composite ID
        let deletedCount = 0;
        for (const reminder of userReminders) {
          await new Promise((res, rej) => {
            const deleteRequest = objectStore.delete(reminder.compositeId);
            deleteRequest.onsuccess = () => {
              deletedCount++;
              res();
            };
            deleteRequest.onerror = () => rej(deleteRequest.error);
          });
        }

        console.log(`[IndexedDB] ✅ Cleared ${deletedCount} reminders for user ${userId}`);
        resolve(deletedCount);
      } catch (error) {
        console.error('[IndexedDB] ❌ Error clearing user reminders:', error);
        reject(error);
      }
    });
  },

  // Clear all reminders (admin/testing only - clears ALL users)
  async clearAll() {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('[IndexedDB] ✅ All reminders cleared (all users)');
        resolve(true);
      };

      request.onerror = () => {
        console.error('[IndexedDB] ❌ Error clearing reminders:', request.error);
        reject(request.error);
      };
    });
  },

  // Get sync statistics for specific user (useful for debugging)
  async getSyncStats(userId) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!userId) {
          reject(new Error('User ID is required'));
          return;
        }

        const allReminders = await this.getAllReminders(userId);
        const unsyncedReminders = await this.getUnsyncedReminders(userId);
        
        const stats = {
          userId: userId,
          total: allReminders.length,
          synced: allReminders.filter(r => r.synced === true).length,
          unsynced: unsyncedReminders.length,
          enabled: allReminders.filter(r => r.enabled === true).length
        };

        console.log('[IndexedDB] 📊 Sync Stats:', stats);
        resolve(stats);
      } catch (error) {
        console.error('[IndexedDB] ❌ Error getting sync stats:', error);
        reject(error);
      }
    });
  }
};

export default IndexedDB;