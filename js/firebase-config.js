// Firebase Configuration and Initialization (CDN Version)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  enableIndexedDbPersistence
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC9310tMvMYp7EpO_2oJun64Ck46-Ld6Kw",
  authDomain: "inf654-project-171ea.firebaseapp.com",
  projectId: "inf654-project-171ea",
  storageBucket: "inf654-project-171ea.firebasestorage.app",
  messagingSenderId: "449665189195",
  appId: "1:449665189195:web:2f886a9a3d164cd96894ce"
};

// Initialize Firebase
console.log('[Firebase] 🚀 Initializing Firebase...');
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Enable offline persistence (works with CDN version)
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('[Firebase] ✅ Firestore initialized with offline persistence');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firebase] ⚠️ Multiple tabs open, persistence only enabled in one tab');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firebase] ⚠️ Browser does not support offline persistence');
    } else {
      console.error('[Firebase] ❌ Error enabling persistence:', err);
    }
  });

// Generate a unique device ID for anonymous user identification
function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', deviceId);
    console.log('[Firebase] 📱 New Device ID created:', deviceId);
  } else {
    console.log('[Firebase] 📱 Existing Device ID found:', deviceId);
  }
  return deviceId;
}

const DEVICE_ID = getDeviceId();

// Firebase CRUD Operations
const FirebaseDB = {
  // Create or Update a reminder in Firebase
  async setReminder(reminderId, reminderData) {
    try {
      const reminderRef = doc(db, 'reminders', `${DEVICE_ID}_${reminderId}`);
      const dataToSave = {
        ...reminderData,
        deviceId: DEVICE_ID,
        id: reminderId,
        updatedAt: new Date().toISOString(),
        synced: true
      };
      
      await setDoc(reminderRef, dataToSave);
      console.log(`[Firebase] ✅ Reminder saved: ${reminderId}`);
      return dataToSave;
    } catch (error) {
      console.error('[Firebase] ❌ Error saving reminder:', error);
      throw error;
    }
  },

  // Read a specific reminder from Firebase
  async getReminder(reminderId) {
    try {
      const reminderRef = doc(db, 'reminders', `${DEVICE_ID}_${reminderId}`);
      const reminderSnap = await getDoc(reminderRef);
      
      if (reminderSnap.exists()) {
        const data = reminderSnap.data();
        console.log(`[Firebase] ✅ Reminder retrieved: ${reminderId}`);
        return data;
      } else {
        console.log(`[Firebase] ℹ️ No reminder found: ${reminderId}`);
        return null;
      }
    } catch (error) {
      console.error('[Firebase] ❌ Error getting reminder:', error);
      throw error;
    }
  },

  // Read all reminders for this device from Firebase
  async getAllReminders() {
    try {
      const remindersRef = collection(db, 'reminders');
      const querySnapshot = await getDocs(remindersRef);
      
      const reminders = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Only return reminders for this device
        if (data.deviceId === DEVICE_ID) {
          reminders.push(data);
        }
      });
      
      console.log(`[Firebase] ✅ Retrieved ${reminders.length} reminders for this device`);
      return reminders;
    } catch (error) {
      console.error('[Firebase] ❌ Error getting all reminders:', error);
      throw error;
    }
  },

  // Delete a reminder from Firebase
  async deleteReminder(reminderId) {
    try {
      const reminderRef = doc(db, 'reminders', `${DEVICE_ID}_${reminderId}`);
      await deleteDoc(reminderRef);
      console.log(`[Firebase] ✅ Reminder deleted: ${reminderId}`);
      return true;
    } catch (error) {
      console.error('[Firebase] ❌ Error deleting reminder:', error);
      throw error;
    }
  },

  // Get the device ID
  getDeviceId() {
    return DEVICE_ID;
  },

  // Test connection to Firebase
  async testConnection() {
    try {
      console.log('[Firebase] 🧪 Testing connection...');
      const testRef = doc(db, 'reminders', `${DEVICE_ID}_test`);
      await setDoc(testRef, {
        test: true,
        timestamp: new Date().toISOString()
      });
      await deleteDoc(testRef);
      console.log('[Firebase] ✅ Connection test successful!');
      return true;
    } catch (error) {
      console.error('[Firebase] ❌ Connection test failed:', error);
      return false;
    }
  }
};

// Log successful initialization
console.log('[Firebase] ✅ Firebase configuration loaded');
console.log('[Firebase] 📱 Device ID:', DEVICE_ID);

export { FirebaseDB, db, DEVICE_ID };