<template>
  <div v-if="showPrompt" class="notification-prompt">
    <span class="message">
      Enable browser notifications to get reminders for upcoming workshops
    </span>

    <div class="actions">
      <button @click="enableNotifications" class="btn-enable">
        Enable notifications
      </button>
      <button @click="dismissPrompt" class="btn-dismiss">
        Dismiss
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { notificationService } from '../services/notificationService'

const showPrompt = ref(false)

onMounted(async () => {
  const isLoggedIn = await notificationService.isUserLoggedIn()
  if (!isLoggedIn) return

  if (!notificationService.isSupported()) return

  if (Notification.permission !== 'granted') {
    showPrompt.value = true
  }
})

const enableNotifications = async () => {
  try {
    const permission = await notificationService.requestNotificationPermission()
    if (permission === 'granted') {
      await notificationService.subscribeToPushNotifications()
      showPrompt.value = false
    }
  } catch (error) {
    console.error('Failed to enable notifications:', error)
  }
}

const dismissPrompt = () => {
  showPrompt.value = false
}
</script>

<style scoped>
.notification-prompt {
  width: 90%;
  margin: 12px auto;
  padding: 12px 20px;

  background-color: #f5f1e8;
  border: 1px solid #e2d9c2;
  border-radius: 14px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  font-family: 'Gruppo', sans-serif;
  color: #2d2d2d;
}

.message {
  font-size: 14px;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 10px;
}

.btn-enable {
  background-color: #5f7c4a;
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 13px;
}

.btn-enable:hover {
  background-color: #4f683e;
}

.btn-dismiss {
  background-color: transparent;
  border: 1px solid #aaa;
  border-radius: 20px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 13px;
  color: #555;
}

.btn-dismiss:hover {
  background-color: #e6dfc9;
}
</style>
