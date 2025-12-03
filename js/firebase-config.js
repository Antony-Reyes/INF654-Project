// Firebase Configuration and Initialization with Authentication (CDN Version)
// UPDATED: Now supports offline authentication using IndexedDB cache
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
  console.warn('[Firebase] ⚠️ Modern cache failed, using default Firestore:', error);
  db = getFirestore(app);
}

// Current user ID (will be set after authentication)
let currentUserId = null;

// ============================================================================
// OFFLINE AUTHENTICATION CACHE MANAGER
// ============================================================================
const OfflineAuthCache = {
  DB_NAME: 'GameRemindersAuthDB',
  DB_VERSION: 1,
  STORE_NAME: 'authCache',
  db: null,

  // Initialize the auth cache database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineAuth] ❌ Auth cache database failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineAuth] ✅ Auth cache database initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const objectStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'email' });
          objectStore.createIndex('userId', 'userId', { unique: true });
          console.log('[OfflineAuth] ✅ Auth cache object store created');
        }
      };
    });
  },

  // Hash password (simple but better than plain text)
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Cache user credentials after successful online authentication
  async cacheCredentials(email, password, userId) {
    try {
      if (!this.db) await this.init();

      const hashedPassword = await this.hashPassword(password);
      
      const authData = {
        email: email,
        passwordHash: hashedPassword,
        userId: userId,
        cachedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      await objectStore.put(authData);

      console.log('[OfflineAuth] ✅ Credentials cached for offline use:', email);
      return true;
    } catch (error) {
      console.error('[OfflineAuth] ❌ Error caching credentials:', error);
      return false;
    }
  },

  // Verify credentials against cached data (for offline login)
  async verifyOfflineCredentials(email, password) {
    try {
      if (!this.db) await this.init();

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      
      const request = objectStore.get(email);
      const cachedAuth = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!cachedAuth) {
        console.log('[OfflineAuth] ℹ️ No cached credentials for:', email);
        return null;
      }

      const hashedPassword = await this.hashPassword(password);
      
      if (cachedAuth.passwordHash === hashedPassword) {
        console.log('[OfflineAuth] ✅ Offline credentials verified:', email);
        
        // Update last login time
        cachedAuth.lastLogin = new Date().toISOString();
        const updateTransaction = this.db.transaction([this.STORE_NAME], 'readwrite');
        const updateStore = updateTransaction.objectStore(this.STORE_NAME);
        await updateStore.put(cachedAuth);
        
        return {
          userId: cachedAuth.userId,
          email: cachedAuth.email,
          offlineMode: true
        };
      } else {
        console.log('[OfflineAuth] ❌ Offline password mismatch');
        return null;
      }
    } catch (error) {
      console.error('[OfflineAuth] ❌ Error verifying offline credentials:', error);
      return null;
    }
  },

  // Get cached user by email
  async getCachedUser(email) {
    try {
      if (!this.db) await this.init();

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      
      const request = objectStore.get(email);
      return await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineAuth] ❌ Error getting cached user:', error);
      return null;
    }
  },

  // Clear cached credentials (on logout)
  async clearCache(email) {
    try {
      if (!this.db) await this.init();

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      await objectStore.delete(email);

      console.log('[OfflineAuth] ✅ Cached credentials cleared:', email);
      return true;
    } catch (error) {
      console.error('[OfflineAuth] ❌ Error clearing cache:', error);
      return false;
    }
  },

  // Get all cached users (for debugging)
  async getAllCachedUsers() {
    try {
      if (!this.db) await this.init();

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      
      const request = objectStore.getAll();
      return await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[OfflineAuth] ❌ Error getting all cached users:', error);
      return [];
    }
  }
};

// Initialize offline auth cache
OfflineAuthCache.init().catch(err => {
  console.error('[OfflineAuth] ⚠️ Failed to initialize auth cache:', err);
});

// ============================================================================
// AUTHENTICATION MANAGER (WITH OFFLINE SUPPORT)
// ============================================================================
const AuthManager = {
  offlineUser: null, // Store offline user state
  authStateCallbacks: [], // CRITICAL FIX: Store all auth state callbacks

  // Sign up new user
  async signUp(email, password) {
    try {
      // Check if online
      if (!navigator.onLine) {
        return { 
          success: false, 
          error: 'Cannot create new accounts while offline. Please connect to the internet.',
          code: 'auth/offline-signup-not-allowed'
        };
      }

      console.log('[Auth] 📝 Creating new user account...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      currentUserId = user.uid;
      
      // Cache credentials for offline use
      await OfflineAuthCache.cacheCredentials(email, password, user.uid);
      
      console.log('[Auth] ✅ User created successfully:', user.email);
      console.log('[Auth] 👤 User UID:', user.uid);
      return { success: true, user };
    } catch (error) {
      console.error('[Auth] ❌ Sign up failed:', error);
      return { success: false, error: error.message, code: error.code };
    }
  },

  // Sign in existing user (WITH OFFLINE SUPPORT)
  async signIn(email, password) {
    try {
      console.log('[Auth] 🔑 Signing in user...');
      
      // Check if online - try Firebase Auth first
      if (navigator.onLine) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          currentUserId = user.uid;
          
          // Cache credentials for future offline use
          await OfflineAuthCache.cacheCredentials(email, password, user.uid);
          
          console.log('[Auth] ✅ User signed in successfully (ONLINE):', user.email);
          console.log('[Auth] 👤 User UID:', user.uid);
          return { success: true, user, mode: 'online' };
        } catch (error) {
          // If online auth fails, fall back to offline verification
          console.warn('[Auth] ⚠️ Online auth failed, trying offline mode:', error.message);
          return await this.attemptOfflineSignIn(email, password);
        }
      } else {
        // Offline - use cached credentials
        console.log('[Auth] 📴 OFFLINE MODE - Using cached credentials');
        return await this.attemptOfflineSignIn(email, password);
      }
    } catch (error) {
      console.error('[Auth] ❌ Sign in failed:', error);
      return { success: false, error: error.message, code: error.code };
    }
  },

  // Attempt offline sign in using cached credentials
  async attemptOfflineSignIn(email, password) {
    const offlineAuth = await OfflineAuthCache.verifyOfflineCredentials(email, password);
    
    if (offlineAuth) {
      currentUserId = offlineAuth.userId;
      this.offlineUser = {
        uid: offlineAuth.userId,
        email: offlineAuth.email,
        offlineMode: true
      };
      
      console.log('[Auth] ✅ User signed in successfully (OFFLINE):', offlineAuth.email);
      console.log('[Auth] 👤 User UID:', offlineAuth.userId);
      
      // CRITICAL FIX: Manually trigger all auth state callbacks for offline user
      console.log('[Auth] 🔔 Triggering auth state callbacks for offline user');
      this.authStateCallbacks.forEach(callback => {
        try {
          callback(this.offlineUser);
        } catch (error) {
          console.error('[Auth] ❌ Error in auth state callback:', error);
        }
      });
      
      return { 
        success: true, 
        user: this.offlineUser,
        mode: 'offline',
        message: 'Signed in offline. Data will sync when connection is restored.'
      };
    } else {
      console.error('[Auth] ❌ Offline sign in failed - invalid credentials or no cached data');
      return { 
        success: false, 
        error: 'Invalid credentials or no cached login data. Please connect to the internet to sign in.',
        code: 'auth/offline-credentials-invalid'
      };
    }
  },

  // Sign out current user
  async signOut() {
    try {
      console.log('[Auth] 🚪 Signing out user...');
      
      // If offline mode, clear offline user
      if (this.offlineUser) {
        const email = this.offlineUser.email;
        this.offlineUser = null;
        currentUserId = null;
        console.log('[Auth] ✅ User signed out (OFFLINE MODE)');
        
        // CRITICAL FIX: Trigger callbacks with null to show login screen
        console.log('[Auth] 🔔 Triggering auth state callbacks for sign out');
        this.authStateCallbacks.forEach(callback => {
          try {
            callback(null);
          } catch (error) {
            console.error('[Auth] ❌ Error in auth state callback:', error);
          }
        });
        
        return { success: true };
      }
      
      // Online mode - use Firebase signOut
      await signOut(auth);
      currentUserId = null;
      console.log('[Auth] ✅ User signed out successfully');
      return { success: true };
    } catch (error) {
      console.error('[Auth] ❌ Sign out failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Get current user (online or offline)
  getCurrentUser() {
    if (this.offlineUser) {
      return this.offlineUser;
    }
    return auth.currentUser;
  },

  // Get current user ID
  getCurrentUserId() {
    return currentUserId;
  },

  // Listen to auth state changes (with offline support)
  onAuthStateChange(callback) {
    // CRITICAL FIX: Store the callback so we can trigger it manually for offline users
    this.authStateCallbacks.push(callback);
    console.log('[Auth] 📝 Auth state callback registered. Total callbacks:', this.authStateCallbacks.length);
    
    // Listen to Firebase auth state (for online users)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUserId = user.uid;
        this.offlineUser = null; // Clear offline user when online user is detected
        console.log('[Auth] 👤 User authenticated (ONLINE):', user.email);
        console.log('[Auth] 👤 User UID:', user.uid);
        callback(user);
      } else if (this.offlineUser) {
        // Offline user is active - callback already triggered in attemptOfflineSignIn
        console.log('[Auth] 👤 Offline user already authenticated:', this.offlineUser.email);
      } else {
        currentUserId = null;
        console.log('[Auth] 👤 No user authenticated');
        callback(null);
      }
    });

    // Return unsubscribe function
    return () => {
      // Remove callback from array
      const index = this.authStateCallbacks.indexOf(callback);
      if (index > -1) {
        this.authStateCallbacks.splice(index, 1);
      }
      unsubscribe();
    };
  },

  // Check if user is in offline mode
  isOfflineMode() {
    return this.offlineUser !== null;
  },

  // Get offline auth cache info (for debugging)
  async getOfflineCacheInfo() {
    const cachedUsers = await OfflineAuthCache.getAllCachedUsers();
    return {
      hasCachedUsers: cachedUsers.length > 0,
      cachedCount: cachedUsers.length,
      cachedEmails: cachedUsers.map(u => u.email)
    };
  }
};

// ============================================================================
// FIREBASE CRUD OPERATIONS (User-specific)
// ============================================================================
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
console.log('[Firebase] 🔐 Authentication ready (with offline support)');

export { FirebaseDB, AuthManager, OfflineAuthCache, db, auth, currentUserId };