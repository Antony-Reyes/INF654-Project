// IndexedDB Configuration and Operations
const DB_NAME = 'GameRemindersDB';
const DB_VERSION = 1;
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

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          objectStore.createIndex('gameId', 'gameId', { unique: false });
          objectStore.createIndex('subsectionId', 'subsectionId', { unique: false });
          objectStore.createIndex('synced', 'synced', { unique: false });
          objectStore.createIndex('enabled', 'enabled', { unique: false });
          
          console.log('[IndexedDB] ✅ Object store created');
        }
      };
    });
  },

  // Create or Update a reminder in IndexedDB
  async setReminder(reminderId, reminderData) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);

      const data = {
        ...reminderData,
        id: reminderId,
        updatedAt: new Date().toISOString(),
        synced: reminderData.synced !== undefined ? reminderData.synced : false
      };

      const request = objectStore.put(data);

      request.onsuccess = () => {
        console.log(`[IndexedDB] ✅ Reminder saved: ${reminderId}`);
        resolve(data);
      };

      request.onerror = () => {
        console.error('[IndexedDB] ❌ Error saving reminder:', request.error);
        reject(request.error);
      };
    });
  },

  // Read a specific reminder from IndexedDB
  async getReminder(reminderId) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(reminderId);

      request.onsuccess = () => {
        if (request.result) {
          console.log(`[IndexedDB] ✅ Reminder retrieved: ${reminderId}`);
          resolve(request.result);
        } else {
          console.log(`[IndexedDB] ℹ️ No reminder found: ${reminderId}`);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[IndexedDB] ❌ Error getting reminder:', request.error);
        reject(request.error);
      };
    });
  },

  // Read all reminders from IndexedDB
  async getAllReminders() {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        console.log(`[IndexedDB] ✅ Retrieved ${request.result.length} reminders`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[IndexedDB] ❌ Error getting all reminders:', request.error);
        reject(request.error);
      };
    });
  },

  // Get all unsynced reminders using CURSOR method (most reliable)
  async getUnsyncedReminders() {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
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
            // Check if this record is unsynced
            const reminder = cursor.value;
            if (reminder.synced === false || reminder.synced === undefined) {
              unsyncedReminders.push(reminder);
            }
            cursor.continue();
          } else {
            // No more records
            console.log(`[IndexedDB] ✅ Retrieved ${unsyncedReminders.length} unsynced reminders (cursor method)`);
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

  // Mark a reminder as synced
  async markAsSynced(reminderId) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const getRequest = objectStore.get(reminderId);

      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.synced = true;
          data.syncedAt = new Date().toISOString();
          const updateRequest = objectStore.put(data);

          updateRequest.onsuccess = () => {
            console.log(`[IndexedDB] ✅ Reminder marked as synced: ${reminderId}`);
            resolve(true);
          };

          updateRequest.onerror = () => {
            console.error('[IndexedDB] ❌ Error marking as synced:', updateRequest.error);
            reject(updateRequest.error);
          };
        } else {
          console.warn(`[IndexedDB] ⚠️ Reminder not found for marking as synced: ${reminderId}`);
          resolve(false);
        }
      };

      getRequest.onerror = () => {
        console.error('[IndexedDB] ❌ Error getting reminder:', getRequest.error);
        reject(getRequest.error);
      };
    });
  },

  // Delete a reminder from IndexedDB
  async deleteReminder(reminderId) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.delete(reminderId);

      request.onsuccess = () => {
        console.log(`[IndexedDB] ✅ Reminder deleted: ${reminderId}`);
        resolve(true);
      };

      request.onerror = () => {
        console.error('[IndexedDB] ❌ Error deleting reminder:', request.error);
        reject(request.error);
      };
    });
  },

  // Clear all reminders (useful for testing)
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
        console.log('[IndexedDB] ✅ All reminders cleared');
        resolve(true);
      };

      request.onerror = () => {
        console.error('[IndexedDB] ❌ Error clearing reminders:', request.error);
        reject(request.error);
      };
    });
  },

  // Get sync statistics (useful for debugging)
  async getSyncStats() {
    return new Promise(async (resolve, reject) => {
      try {
        const allReminders = await this.getAllReminders();
        const unsyncedReminders = await this.getUnsyncedReminders();
        
        const stats = {
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