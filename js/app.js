// Main Application Controller with Authentication (OFFLINE SUPPORT ADDED)
import { FirebaseDB, AuthManager } from './firebase-config.js';
import IndexedDB from './indexeddb.js';
import { SyncManager, StorageManager, isOnline } from './sync.js';
import { ReminderManager } from './reminders.js';

// Global app state
const App = {
  initialized: false,
  reminders: new Map(),
  currentUser: null,
  offlineMode: false,

  // Initialize the application
  async init() {
    console.log('[App] 🚀 Initializing application...');
    
    try {
      // Step 1: Initialize IndexedDB
      console.log('[App] 📦 Initializing IndexedDB...');
      await IndexedDB.init();

      // Step 2: Setup authentication listener
      console.log('[App] 🔐 Setting up authentication...');
      this.setupAuthListener();

      // Step 3: Setup UI event listeners for auth forms
      this.setupAuthFormListeners();

      // Step 4: Setup online/offline event listeners
      this.setupNetworkListeners();

      console.log('[App] ✅ Application initialization started (waiting for auth)');

    } catch (error) {
      console.error('[App] ❌ Initialization failed:', error);
      this.showNotification('❌ Failed to initialize app. Please refresh the page.');
    }
  },

  // Setup network status listeners
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('[App] 🌐 Connection restored');
      this.showNotification('🌐 Back online! Syncing your data...');
      this.updateOfflineIndicator(false);
      
      // If user is in offline mode, try to sync
      if (this.offlineMode && this.initialized) {
        setTimeout(() => {
          SyncManager.syncAll();
        }, 1000);
      }
    });

    window.addEventListener('offline', () => {
      console.log('[App] 📴 Connection lost');
      this.showNotification('📴 You are offline. Changes will be saved locally.');
      this.updateOfflineIndicator(true);
    });

    // Initial status
    this.updateOfflineIndicator(!navigator.onLine);
  },

  // Update offline mode indicator in UI
  updateOfflineIndicator(offline) {
    const userInfo = document.getElementById('user-info');
    const existingBadge = userInfo?.querySelector('.offline-badge');
    
    if (offline && userInfo && !existingBadge) {
      const badge = document.createElement('span');
      badge.className = 'offline-badge';
      badge.textContent = '📴 Offline';
      badge.style.cssText = `
        background: #e74c3c;
        color: white;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
        margin-left: 10px;
      `;
      userInfo.insertBefore(badge, userInfo.firstChild);
    } else if (!offline && existingBadge) {
      existingBadge.remove();
    }
  },

  // Setup authentication state listener
  setupAuthListener() {
    AuthManager.onAuthStateChange(async (user) => {
      if (user) {
        // User is signed in (online or offline)
        this.currentUser = user;
        this.offlineMode = user.offlineMode || false;
        
        const mode = this.offlineMode ? 'OFFLINE' : 'ONLINE';
        console.log(`[App] ✅ User authenticated (${mode}):`, user.email);
        
        // Hide auth overlay, show main app
        this.hideAuthOverlay();
        this.showUserInfo(user);
        
        // Show offline indicator if in offline mode
        if (this.offlineMode) {
          this.updateOfflineIndicator(true);
        }
        
        // Initialize app components
        await this.initializeAppComponents();
        
      } else {
        // User is signed out
        this.currentUser = null;
        this.offlineMode = false;
        console.log('[App] 🚪 User signed out');
        
        // Show auth overlay, hide main app
        this.showAuthOverlay();
        this.hideUserInfo();
        
        // Clear app data
        this.clearAppData();
      }
    });
  },

  // Initialize app components after authentication
  async initializeAppComponents() {
    try {
      this.showLoading(true);

      // Initialize Sync Manager
      console.log('[App] 🔄 Initializing Sync Manager...');
      SyncManager.init();

      // Load all reminders from storage
      console.log('[App] 📥 Loading reminders from storage...');
      await this.loadReminders();

      // Initialize UI event listeners
      console.log('[App] 🎨 Setting up UI event listeners...');
      this.initializeEventListeners();

      // Start reminder timers for active reminders
      console.log('[App] ⏰ Starting active reminder timers...');
      this.startActiveReminders();

      // Mark as initialized
      this.initialized = true;
      console.log('[App] ✅ Application initialized successfully!');

      this.showLoading(false);
      
      // Show appropriate welcome message
      const mode = this.offlineMode ? '(Offline Mode)' : '';
      this.showNotification(`✅ Welcome back, ${this.currentUser.email}! ${mode}`);

    } catch (error) {
      console.error('[App] ❌ Component initialization failed:', error);
      this.showLoading(false);
      this.showNotification('❌ Failed to load your data. Please try again.');
    }
  },

  // Setup authentication form listeners
  setupAuthFormListeners() {
    // Sign In Button
    const signinButton = document.getElementById('signin-button');
    if (signinButton) {
      signinButton.addEventListener('click', () => this.handleSignIn());
    }

    // Sign Up Button
    const signupButton = document.getElementById('signup-button');
    if (signupButton) {
      signupButton.addEventListener('click', () => this.handleSignUp());
    }

    // Logout Button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => this.handleLogout());
    }

    // Form Toggle Links
    const showSignup = document.getElementById('show-signup');
    const showSignin = document.getElementById('show-signin');
    
    if (showSignup) {
      showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleAuthForms('signup');
      });
    }
    
    if (showSignin) {
      showSignin.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleAuthForms('signin');
      });
    }

    // Enter key listeners for forms
    const signinEmail = document.getElementById('signin-email');
    const signinPassword = document.getElementById('signin-password');
    const signupEmail = document.getElementById('signup-email');
    const signupPassword = document.getElementById('signup-password');
    const signupConfirm = document.getElementById('signup-confirm');

    [signinEmail, signinPassword].forEach(input => {
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.handleSignIn();
        });
      }
    });

    [signupEmail, signupPassword, signupConfirm].forEach(input => {
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.handleSignUp();
        });
      }
    });
  },

  // Handle sign in (WITH OFFLINE SUPPORT)
  async handleSignIn() {
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    if (!email || !password) {
      this.showAuthError('Please enter both email and password');
      return;
    }

    this.showAuthLoading(true);
    this.hideAuthError();

    const result = await AuthManager.signIn(email, password);

    if (result.success) {
      console.log(`[App] ✅ Sign in successful (${result.mode || 'online'})`);
      
      // Show mode-specific message
      if (result.mode === 'offline') {
        this.showNotification('📴 Signed in offline. Data will sync when connection is restored.');
      }
      // Auth state listener will handle the rest
    } else {
      this.showAuthLoading(false);
      this.showAuthError(this.getErrorMessage(result.code, result.error));
    }
  },

  // Handle sign up
  async handleSignUp() {
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;

    if (!email || !password || !confirm) {
      this.showAuthError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      this.showAuthError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirm) {
      this.showAuthError('Passwords do not match');
      return;
    }

    this.showAuthLoading(true);
    this.hideAuthError();

    const result = await AuthManager.signUp(email, password);

    if (result.success) {
      console.log('[App] ✅ Sign up successful');
      // Auth state listener will handle the rest
    } else {
      this.showAuthLoading(false);
      this.showAuthError(this.getErrorMessage(result.code, result.error));
    }
  },

  // Handle logout
  async handleLogout() {
    const message = this.offlineMode 
      ? 'Are you sure you want to sign out? (You are in offline mode)'
      : 'Are you sure you want to sign out?';
      
    if (confirm(message)) {
      console.log('[App] 🚪 User requested logout');
      this.showLoading(true);
      
      const result = await AuthManager.signOut();
      
      if (result.success) {
        console.log('[App] ✅ Logout successful');
        // Auth state listener will handle the rest
      } else {
        this.showLoading(false);
        this.showNotification('❌ Failed to sign out. Please try again.');
      }
    }
  },

  // Toggle between sign in and sign up forms
  toggleAuthForms(formType) {
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    
    if (formType === 'signup') {
      signinForm.classList.remove('active');
      signupForm.classList.add('active');
    } else {
      signupForm.classList.remove('active');
      signinForm.classList.add('active');
    }
    
    this.hideAuthError();
  },

  // Show/hide authentication overlay
  showAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  },

  hideAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  },

  // Show/hide user info
  showUserInfo(user) {
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    
    if (userInfo && userEmail) {
      userEmail.textContent = user.email;
      userInfo.style.display = 'flex';
    }
  },

  hideUserInfo() {
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
      userInfo.style.display = 'none';
    }
  },

  // Show/hide auth loading
  showAuthLoading(show) {
    const loading = document.getElementById('auth-loading');
    if (loading) {
      loading.style.display = show ? 'flex' : 'none';
    }
  },

  // Show/hide auth error
  showAuthError(message) {
    const error = document.getElementById('auth-error');
    if (error) {
      error.textContent = message;
      error.style.display = 'block';
    }
  },

  hideAuthError() {
    const error = document.getElementById('auth-error');
    if (error) {
      error.style.display = 'none';
    }
  },

  // Get user-friendly error message (WITH OFFLINE ERROR HANDLING)
  getErrorMessage(code, defaultMessage) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/network-request-failed': 'Network error. Please check your connection',
      'auth/too-many-requests': 'Too many attempts. Please try again later',
      'auth/offline-signup-not-allowed': 'Cannot create new accounts while offline',
      'auth/offline-credentials-invalid': 'Invalid credentials. Please connect to verify your account.'
    };

    return errorMessages[code] || defaultMessage || 'An error occurred. Please try again';
  },

  // Clear app data on logout
  clearAppData() {
    this.reminders.clear();
    ReminderManager.stopAllTimers();
    this.initialized = false;
    console.log('[App] 🧹 App data cleared');
  },

  // Load all reminders from storage
  async loadReminders() {
    try {
      const reminders = await StorageManager.getAllReminders();
      console.log(`[App] 📥 Loaded ${reminders.length} reminders from storage`);

      // Update UI with loaded reminders
      for (const reminder of reminders) {
        this.reminders.set(reminder.id, reminder);
        this.updateReminderUI(reminder);
      }

      return reminders;
    } catch (error) {
      console.error('[App] ❌ Error loading reminders:', error);
      throw error;
    }
  },

  // Initialize all UI event listeners
  initializeEventListeners() {
    // Get all reminder list items
    const reminderItems = document.querySelectorAll('[data-reminder-id]');

    reminderItems.forEach((item) => {
      const reminderId = item.getAttribute('data-reminder-id');
      const parentSubsection = item.closest('[data-subsection-id]');
      const parentGame = item.closest('[data-game-id]');
      
      const subsectionId = parentSubsection?.getAttribute('data-subsection-id');
      const gameId = parentGame?.getAttribute('data-game-id');

      // Get buttons
      const toggleBtn = item.querySelector('.btn-toggle');
      const saveBtn = item.querySelector('.btn-save');
      const resetBtn = item.querySelector('.btn-reset');

      // Toggle button event
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          this.handleToggleReminder(reminderId, gameId, subsectionId, toggleBtn);
        });
      }

      // Save button event
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          this.handleSaveReminder(reminderId, gameId, subsectionId, item);
        });
      }

      // Reset button event
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.handleResetReminder(reminderId, gameId, subsectionId, item);
        });
      }

      // Timer input validation
      const timerInputs = item.querySelectorAll('.timer-input');
      timerInputs.forEach((input) => {
        input.addEventListener('input', (e) => {
          this.validateTimerInput(e.target);
        });

        input.addEventListener('blur', (e) => {
          this.formatTimerInput(e.target);
        });
      });
    });

    console.log('[App] ✅ Event listeners initialized for all reminders');
  },

  // Handle toggle button click
  async handleToggleReminder(reminderId, gameId, subsectionId, button) {
    const currentEnabled = button.getAttribute('data-enabled') === 'true';
    const newEnabled = !currentEnabled;

    console.log(`[App] 🔄 Toggling reminder ${reminderId}: ${currentEnabled} -> ${newEnabled}`);

    // Update button UI immediately
    button.setAttribute('data-enabled', newEnabled);
    button.textContent = newEnabled ? 'On' : 'Off';
    button.classList.toggle('off', !newEnabled);

    if (newEnabled) {
      button.classList.add('pulse');
      setTimeout(() => button.classList.remove('pulse'), 2000);
    }

    try {
      // Get current reminder data
      let reminderData = this.reminders.get(reminderId);

      if (!reminderData) {
        // Create new reminder data from UI
        const item = button.closest('[data-reminder-id]');
        const inputs = item.querySelectorAll('.timer-input');
        
        reminderData = {
          id: reminderId,
          gameId: gameId,
          subsectionId: subsectionId,
          name: item.querySelector('.reminder-name').textContent,
          timerHours: parseInt(inputs[0].value) || 0,
          timerMinutes: parseInt(inputs[1].value) || 0,
          timerSeconds: parseInt(inputs[2].value) || 0,
          enabled: newEnabled,
          lastReset: null
        };
      } else {
        reminderData.enabled = newEnabled;
      }

      // Save to storage
      await StorageManager.saveReminder(reminderId, reminderData);
      this.reminders.set(reminderId, reminderData);

      // Start or stop the reminder timer
      if (newEnabled) {
        ReminderManager.startReminder(reminderData);
        this.showNotification(`✅ ${reminderData.name} reminder enabled`);
      } else {
        ReminderManager.stopReminder(reminderId);
        this.showNotification(`⏸️ ${reminderData.name} reminder disabled`);
      }

      console.log(`[App] ✅ Reminder ${reminderId} toggled successfully`);
    } catch (error) {
      console.error('[App] ❌ Error toggling reminder:', error);
      this.showNotification('❌ Failed to toggle reminder. Please try again.');
      
      // Revert button state on error
      button.setAttribute('data-enabled', currentEnabled);
      button.textContent = currentEnabled ? 'On' : 'Off';
      button.classList.toggle('off', !currentEnabled);
    }
  },

  // Handle save button click
  async handleSaveReminder(reminderId, gameId, subsectionId, item) {
    console.log(`[App] 💾 Saving reminder ${reminderId}...`);

    try {
      // Get values from UI
      const inputs = item.querySelectorAll('.timer-input');
      const toggleBtn = item.querySelector('.btn-toggle');
      const reminderName = item.querySelector('.reminder-name').textContent;

      const timerHours = parseInt(inputs[0].value) || 0;
      const timerMinutes = parseInt(inputs[1].value) || 0;
      const timerSeconds = parseInt(inputs[2].value) || 0;
      const enabled = toggleBtn.getAttribute('data-enabled') === 'true';

      // Validate timer (must have at least some time)
      if (timerHours === 0 && timerMinutes === 0 && timerSeconds === 0) {
        this.showNotification('⚠️ Please set a valid timer duration');
        return;
      }

      // Create/update reminder data
      const reminderData = {
        id: reminderId,
        gameId: gameId,
        subsectionId: subsectionId,
        name: reminderName,
        timerHours: timerHours,
        timerMinutes: timerMinutes,
        timerSeconds: timerSeconds,
        enabled: enabled,
        lastReset: enabled ? Date.now() : null
      };

      // Save to storage
      await StorageManager.saveReminder(reminderId, reminderData);
      this.reminders.set(reminderId, reminderData);

      // If enabled, restart the reminder with new time
      if (enabled) {
        ReminderManager.stopReminder(reminderId);
        ReminderManager.startReminder(reminderData);
      }

      // Visual feedback
      const saveBtn = item.querySelector('.btn-save');
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '✅ Saved!';
      saveBtn.style.background = '#27ae60';
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = '';
      }, 2000);

      this.showNotification(`✅ ${reminderName} saved successfully`);
      console.log(`[App] ✅ Reminder ${reminderId} saved successfully`);

    } catch (error) {
      console.error('[App] ❌ Error saving reminder:', error);
      this.showNotification('❌ Failed to save reminder. Please try again.');
    }
  },

  // Handle reset button click
  async handleResetReminder(reminderId, gameId, subsectionId, item) {
    console.log(`[App] 🔄 Resetting reminder ${reminderId}...`);

    try {
      const reminderData = this.reminders.get(reminderId);

      if (!reminderData) {
        console.warn('[App] ⚠️ No reminder data found for', reminderId);
        return;
      }

      // Update last reset time
      reminderData.lastReset = Date.now();

      // Save to storage
      await StorageManager.saveReminder(reminderId, reminderData);

      // If enabled, restart the reminder
      if (reminderData.enabled) {
        ReminderManager.stopReminder(reminderId);
        ReminderManager.startReminder(reminderData);
      }

      // Visual feedback
      const resetBtn = item.querySelector('.btn-reset');
      resetBtn.classList.add('pulse');
      
      setTimeout(() => {
        resetBtn.classList.remove('pulse');
      }, 1000);

      this.showNotification(`🔄 ${reminderData.name} timer reset`);
      console.log(`[App] ✅ Reminder ${reminderId} reset successfully`);

    } catch (error) {
      console.error('[App] ❌ Error resetting reminder:', error);
      this.showNotification('❌ Failed to reset reminder. Please try again.');
    }
  },

  // Validate timer input (prevent invalid values)
  validateTimerInput(input) {
    let value = parseInt(input.value);
    const max = parseInt(input.max);
    const min = parseInt(input.min);

    if (isNaN(value) || value < min) {
      input.value = '';
    } else if (value > max) {
      input.value = max;
    }
  },

  // Format timer input (add leading zero)
  formatTimerInput(input) {
    if (input.value === '') {
      input.value = '0';
    } else {
      const value = parseInt(input.value);
      if (input.max === '59') {
        input.value = value.toString().padStart(2, '0');
      }
    }
  },

  // Update reminder UI with data
  updateReminderUI(reminderData) {
    const item = document.querySelector(`[data-reminder-id="${reminderData.id}"]`);
    if (!item) return;

    // Update timer inputs
    const inputs = item.querySelectorAll('.timer-input');
    if (inputs.length >= 3) {
      inputs[0].value = reminderData.timerHours || 0;
      inputs[1].value = (reminderData.timerMinutes || 0).toString().padStart(2, '0');
      inputs[2].value = (reminderData.timerSeconds || 0).toString().padStart(2, '0');
    }

    // Update toggle button
    const toggleBtn = item.querySelector('.btn-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('data-enabled', reminderData.enabled);
      toggleBtn.textContent = reminderData.enabled ? 'On' : 'Off';
      toggleBtn.classList.toggle('off', !reminderData.enabled);
    }
  },

  // Start all active reminders
  startActiveReminders() {
    let activeCount = 0;
    this.reminders.forEach((reminder) => {
      if (reminder.enabled) {
        ReminderManager.startReminder(reminder);
        activeCount++;
      }
    });
    console.log(`[App] ⏰ Started ${activeCount} active reminders`);
  },

  // Show/hide loading overlay
  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  },

  // Show notification to user
  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'app-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #2c3e50;
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-size: 14px;
      animation: slideUp 0.3s ease-out;
      max-width: 90%;
      text-align: center;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideDown 0.3s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      transform: translateX(-50%) translateY(100px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }

  @keyframes slideDown {
    from {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    to {
      transform: translateX(-50%) translateY(100px);
      opacity: 0;
    }
  }

  .pulse {
    animation: pulseAnimation 0.5s ease-in-out 2;
  }

  @keyframes pulseAnimation {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .offline-badge {
    display: inline-block;
    animation: blink 2s infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
} else {
  App.init();
}

// Export for potential external use
export default App;