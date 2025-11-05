// Main Application Controller
import { FirebaseDB } from './firebase-config.js';
import IndexedDB from './indexeddb.js';
import { SyncManager, StorageManager, isOnline } from './sync.js';
import { ReminderManager } from './reminders.js';

// Global app state
const App = {
  initialized: false,
  reminders: new Map(),

  // Initialize the application
  async init() {
    console.log('[App] 🚀 Initializing application...');
    
    try {
      // Show loading overlay
      this.showLoading(true);

      // Step 1: Initialize IndexedDB
      console.log('[App] 📦 Initializing IndexedDB...');
      await IndexedDB.init();

      // Step 2: Initialize Sync Manager
      console.log('[App] 🔄 Initializing Sync Manager...');
      SyncManager.init();

      // Step 3: Load all reminders from storage
      console.log('[App] 📥 Loading reminders from storage...');
      await this.loadReminders();

      // Step 4: Initialize UI event listeners
      console.log('[App] 🎨 Setting up UI event listeners...');
      this.initializeEventListeners();

      // Step 5: Start reminder timers for active reminders
      console.log('[App] ⏰ Starting active reminder timers...');
      this.startActiveReminders();

      // Mark as initialized
      this.initialized = true;
      console.log('[App] ✅ Application initialized successfully!');

      // Hide loading overlay
      this.showLoading(false);

      // Show welcome message
      this.showNotification('✅ App ready! Your reminders are loaded.');

    } catch (error) {
      console.error('[App] ❌ Initialization failed:', error);
      this.showLoading(false);
      this.showNotification('❌ Failed to initialize app. Please refresh the page.');
    }
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