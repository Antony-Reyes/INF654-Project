// Reminder Manager - Handles timer logic and notifications
const ReminderManager = {
  activeTimers: new Map(),
  notificationPermission: 'default',

  // Initialize and request notification permission
  async init() {
    if ('Notification' in window) {
      this.notificationPermission = await Notification.requestPermission();
      console.log(`[ReminderManager] 🔔 Notification permission: ${this.notificationPermission}`);
    } else {
      console.warn('[ReminderManager] ⚠️ Notifications not supported');
    }
  },

  // Start a reminder timer
  startReminder(reminderData) {
    const { id, name, timerHours, timerMinutes, timerSeconds, lastReset } = reminderData;

    // Stop existing timer if running
    this.stopReminder(id);

    // Calculate total time in milliseconds
    const totalMs = (timerHours * 3600 + timerMinutes * 60 + timerSeconds) * 1000;

    if (totalMs <= 0) {
      console.warn(`[ReminderManager] ⚠️ Invalid timer duration for ${name}`);
      return;
    }

    // Calculate when the timer should trigger
    const startTime = lastReset || Date.now();
    const triggerTime = startTime + totalMs;
    const remainingTime = triggerTime - Date.now();

    if (remainingTime <= 0) {
      // Timer already expired, trigger immediately
      console.log(`[ReminderManager] ⏰ Timer ${name} already expired, triggering now`);
      this.triggerNotification(reminderData);
      return;
    }

    // Set the timeout
    const timerId = setTimeout(() => {
      console.log(`[ReminderManager] ⏰ Timer ${name} completed!`);
      this.triggerNotification(reminderData);
      this.activeTimers.delete(id);
    }, remainingTime);

    // Store timer reference
    this.activeTimers.set(id, {
      timerId,
      reminderData,
      startTime,
      triggerTime
    });

    console.log(`[ReminderManager] ✅ Started timer for ${name} (${this.formatTime(remainingTime)})`);
  },

  // Stop a reminder timer
  stopReminder(reminderId) {
    const timer = this.activeTimers.get(reminderId);
    if (timer) {
      clearTimeout(timer.timerId);
      this.activeTimers.delete(reminderId);
      console.log(`[ReminderManager] ⏸️ Stopped timer: ${reminderId}`);
      return true;
    }
    return false;
  },

  // Trigger notification for a reminder
  async triggerNotification(reminderData) {
    const { name } = reminderData;
    const title = '⏰ Game Reminder!';
    const body = `Time's up for: ${name}`;

    // Show browser notification if permitted
    if (this.notificationPermission === 'granted') {
      try {
        const notification = new Notification(title, {
          body: body,
          icon: '/images/icons/icon-192x192.png',
          badge: '/images/icons/icon-96x96.png',
          vibrate: [200, 100, 200],
          tag: reminderData.id,
          requireInteraction: true
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        console.log(`[ReminderManager] 🔔 Browser notification sent: ${name}`);
      } catch (error) {
        console.error('[ReminderManager] ❌ Error showing notification:', error);
      }
    }

    // Always show in-app notification
    this.showInAppNotification(reminderData);

    // Play notification sound
    this.playNotificationSound();
  },

  // Show custom in-app notification
  showInAppNotification(reminderData) {
    const notification = document.createElement('div');
    notification.className = 'reminder-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px 40px;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        z-index: 10001;
        text-align: center;
        min-width: 300px;
        max-width: 90%;
        animation: notificationPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      ">
        <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">Time's Up!</div>
        <div style="font-size: 18px; margin-bottom: 20px;">${reminderData.name}</div>
        <div style="font-size: 14px; opacity: 0.9;">Click anywhere to dismiss</div>
      </div>
    `;

    // Make it dismissible
    notification.addEventListener('click', () => {
      notification.style.animation = 'notificationFade 0.3s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    });

    document.body.appendChild(notification);

    // Auto-dismiss after 30 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'notificationFade 0.3s ease-out';
        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 30000);

    console.log(`[ReminderManager] 📱 In-app notification shown: ${reminderData.name}`);
  },

  // Play notification sound
  playNotificationSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOU6zk9KxlGgY7k9nyyHgrBSl/zPLaizsKGGS65eiYTxATU6rh8bVkHAU7k9j1xnUrBiR1xO7bkkAKFV6z6OylVxQKRp/g8r5tIQUrgc7y2Yk2CBlou+znl04MDlKr4/K1ZBsGOJHX8spyJgYnfcnx3I4+ChVetOjqqVYVCkaf4PO/bSEFK4HO8tmJNggbaLvs55lODA5Sq+PysmQbBjiR1/LJciYGJ33J8dyOPgoVXrPo6qhZFApGn+Dzv24hBSuBzvLZiTYIGWi77OiXTgwOU6vj8rJkGwY4kdfyynImBid9yfLajT4KFV606OqpVhUKRp/g8r9uIQUrgc7y2Yk2CBtou+znmE4MDlOq4/KyZRsFOJHX8slyJgYnfcnx3I4+ChVetOjqqFgUCkaf4PK+biEFK4HO8tmJNggbaLvs55hODA5Tq+Pxs2UaBjiR1/HKciUGJn3K8d2OPQoWXrPo6qlZFApGn+Dyvm4hBSuBzvLZiTYIG2i77OeZTgwOU6vj8bJlGwY4kdfyyHIlBiZ9yvHdjj0KFl606OqpWhUKRp/g8r5uIQUsgc7y2Ik3CBtou+znmU4MDlOr4/KzZRsGN5HX8shyJgYmfcny3I4+ChVetOjqqVgVCkSf4PKwbiIGLIHO8tmJNggbaLvs55lODA5Tq+PysmUbBjiR1/LIciYGJ33J8tyOPgoVXrTo6alYFQpEn+DysG4iBiyBzvLZiTYIG2i67OeZTQwOU6vj8rJlGwY4kdfyyHIlBiZ9yfLcjj0KFl606OmpWhQKRp/g8rBuIgYqgc7y2Yk2CBtou+znmE4MDlOr4/KyZRsGOJHX8shyJQYmfcny3I49ChVetOjpqVoVCkaf4PKwbiIGKoHO8tmJNggbaLvs55hODA5Tq+Pys2UbBjiR1/HIciYGJn3J8tyOPQoVXrTo6alaFQpGn+DysG4iBiqBzvLZiTYIG2i77OeYTgwOU6vj8rNlGwY3kdfxyHImBiZ9yfLcjj4KFV606OmpWhUKRp/g8rBuIgYqgc7y2Ik2CBtou+znmU4MDlOr4/KzZRsGN5HX8chyJgYmfcny3I4+ChVetOjpqVoVCkaf4PKwbiIGKoHO8tmJNggbaLvs55lODA5Tq+PysmQbBjiR1/LIciUGJn3J8tyOPgoVXrTo6alYFApGn+DysG4hBSuBzvLZiTYIG2i77OeZTgwOU6vj8rJlGwY4kdfyyHIlBiZ9yfLcjj4KFV606OmpWhUKRJ/g8rBuIQUrgc7y2Yk2CBtou+znmU4MDlOr4/KzZRsGOJHX8chyJQYmfcnx3I49ChVetOjpqVoUCkSf4PKwbiEFK4HO8tmJNggbaLvs55lODA5Sq+PysmUbBjiR1/LIciYGJn3J8tyOPgoVXrTo6alYFApEn+DysG4hBSuBzvLZiTYIG2i77OeYTQwOUqvj8rJlGwY4kdfyyHImBiZ9yfLcjj4KFV606OmpWhQKRJ/g8rBuIQUrg');
      audio.volume = 0.5;
      audio.play().catch(err => console.log('[ReminderManager] Sound play failed:', err));
    } catch (error) {
      console.log('[ReminderManager] Could not play sound:', error);
    }
  },

  // Get remaining time for a reminder
  getRemainingTime(reminderId) {
    const timer = this.activeTimers.get(reminderId);
    if (!timer) return null;

    const remaining = timer.triggerTime - Date.now();
    return remaining > 0 ? remaining : 0;
  },

  // Format time in ms to readable string
  formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  },

  // Get all active timers
  getActiveTimers() {
    return Array.from(this.activeTimers.entries()).map(([id, timer]) => ({
      id,
      reminderData: timer.reminderData,
      remainingTime: this.getRemainingTime(id)
    }));
  },

  // Stop all timers
  stopAllTimers() {
    this.activeTimers.forEach((timer, id) => {
      clearTimeout(timer.timerId);
    });
    this.activeTimers.clear();
    console.log('[ReminderManager] 🛑 All timers stopped');
  }
};

// Add notification animation styles
if (!document.getElementById('reminder-notification-styles')) {
  const style = document.createElement('style');
  style.id = 'reminder-notification-styles';
  style.textContent = `
    @keyframes notificationPop {
      0% {
        transform: translate(-50%, -50%) scale(0.5);
        opacity: 0;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.1);
      }
      100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
    }

    @keyframes notificationFade {
      from {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      to {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
      }
    }

    .reminder-notification {
      cursor: pointer;
    }

    .reminder-notification:hover {
      transform: translate(-50%, -50%) scale(1.05) !important;
      transition: transform 0.2s ease;
    }
  `;
  document.head.appendChild(style);
}

// Initialize on load
ReminderManager.init();

export { ReminderManager };