// Firebase Configuration and Initialization with Authentication (CDN Version)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  query,
  where,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';

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

// Initialize Firebase Authentication
const auth = getAuth(app);
console.log('[Firebase] 🔐 Firebase Authentication initialized');

// Initialize Firestore with modern persistence settings
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  console.log('[Firebase] ✅ Firestore initialized with modern persistent cache');
} catch (error) {
  // Fallback if modern cache initialization fails
  console.warn('[Firebase] ⚠️ Modern cache failed, using default Firestore:', error);
  db = getFirestore(app);
}

// Current user ID (will be set after authentication)
let currentUserId = null;

// Authentication Manager
const AuthManager = {
  // Sign up new user
  async signUp(email, password) {
    try {
      console.log('[Auth] 📝 Creating new user account...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      currentUserId = user.uid;
      console.log('[Auth] ✅ User created successfully:', user.email);
      console.log('[Auth] 👤 User UID:', user.uid);
      return { success: true, user };
    } catch (error) {
      console.error('[Auth] ❌ Sign up failed:', error);
      console.error('[Auth] Error code:', error.code);
      console.error('[Auth] Error message:', error.message);
      return { success: false, error: error.message, code: error.code };
    }
  },

  // Sign in existing user
  async signIn(email, password) {
    try {
      console.log('[Auth] 🔑 Signing in user...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      currentUserId = user.uid;
      console.log('[Auth] ✅ User signed in successfully:', user.email);
      console.log('[Auth] 👤 User UID:', user.uid);
      return { success: true, user };
    } catch (error) {
      console.error('[Auth] ❌ Sign in failed:', error);
      console.error('[Auth] Error code:', error.code);
      console.error('[Auth] Error message:', error.message);
      return { success: false, error: error.message, code: error.code };
    }
  },

  // Sign out current user
  async signOut() {
    try {
      console.log('[Auth] 🚪 Signing out user...');
      await signOut(auth);
      currentUserId = null;
      console.log('[Auth] ✅ User signed out successfully');
      return { success: true };
    } catch (error) {
      console.error('[Auth] ❌ Sign out failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  },

  // Get current user ID
  getCurrentUserId() {
    return currentUserId;
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUserId = user.uid;
        console.log('[Auth] 👤 User authenticated:', user.email);
        console.log('[Auth] 👤 User UID:', user.uid);
      } else {
        currentUserId = null;
        console.log('[Auth] 👤 No user authenticated');
      }
      callback(user);
    });
  }
};

// Firebase CRUD Operations (User-specific)
const FirebaseDB = {
  // Create or Update a reminder in Firebase (user-specific)
  async setReminder(reminderId, reminderData) {
    try {
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      // Use user-specific document ID format: userId_reminderId
      const docId = `${currentUserId}_${reminderId}`;
      const reminderRef = doc(db, 'reminders', docId);
      
      const dataToSave = {
        ...reminderData,
        userId: currentUserId,
        id: reminderId,
        updatedAt: new Date().toISOString(),
        synced: true
      };
      
      await setDoc(reminderRef, dataToSave);
      console.log(`[Firebase] ✅ Reminder saved: ${reminderId} for user ${currentUserId}`);
      return dataToSave;
    } catch (error) {
      console.error('[Firebase] ❌ Error saving reminder:', error);
      throw error;
    }
  },

  // Read a specific reminder from Firebase (user-specific)
  async getReminder(reminderId) {
    try {
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      const docId = `${currentUserId}_${reminderId}`;
      const reminderRef = doc(db, 'reminders', docId);
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

  // Read all reminders for current user from Firebase
  async getAllReminders() {
    try {
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      const remindersRef = collection(db, 'reminders');
      const q = query(remindersRef, where('userId', '==', currentUserId));
      const querySnapshot = await getDocs(q);
      
      const reminders = [];
      querySnapshot.forEach((docSnap) => {
        reminders.push(docSnap.data());
      });
      
      console.log(`[Firebase] ✅ Retrieved ${reminders.length} reminders for user ${currentUserId}`);
      return reminders;
    } catch (error) {
      console.error('[Firebase] ❌ Error getting all reminders:', error);
      throw error;
    }
  },

  // Delete a reminder from Firebase (user-specific)
  async deleteReminder(reminderId) {
    try {
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      const docId = `${currentUserId}_${reminderId}`;
      const reminderRef = doc(db, 'reminders', docId);
      await deleteDoc(reminderRef);
      console.log(`[Firebase] ✅ Reminder deleted: ${reminderId}`);
      return true;
    } catch (error) {
      console.error('[Firebase] ❌ Error deleting reminder:', error);
      throw error;
    }
  },

  // Get the current user ID
  getUserId() {
    return currentUserId;
  },

  // Test connection to Firebase
  async testConnection() {
    try {
      if (!currentUserId) {
        console.log('[Firebase] ⚠️ Cannot test connection - user not authenticated');
        return false;
      }

      console.log('[Firebase] 🧪 Testing connection...');
      const testRef = doc(db, 'reminders', `${currentUserId}_test`);
      await setDoc(testRef, {
        test: true,
        userId: currentUserId,
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
console.log('[Firebase] 🔐 Authentication ready');

export { FirebaseDB, AuthManager, db, auth, currentUserId };