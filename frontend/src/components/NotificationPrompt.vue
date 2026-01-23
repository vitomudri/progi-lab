<template>
  <div v-if="showPrompt" class="notification-prompt">
    <p>Enable browser notifications to get reminders for upcoming workshops</p>
    <button @click="enableNotifications" class="btn-enable">Enable Notifications</button>
    <button @click="dismissPrompt" class="btn-dismiss">Dismiss</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { notificationService } from '../services/notificationService'

const showPrompt = ref(false)

onMounted(async () => {
  // Check if user is logged in
  const isLoggedIn = await notificationService.isUserLoggedIn()
  
  if (!isLoggedIn) {
    return
  }

  if (!notificationService.isSupported()) {
    return
  }

  // Show prompt if permission is not already granted
  const permission = Notification.permission
  
  if (permission !== 'granted') {
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
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 12px 16px;
  margin: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.notification-prompt p {
  margin: 0;
  flex: 1;
}

.btn-enable,
.btn-dismiss {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.btn-enable {
  background-color: #28a745;
  color: white;
}

.btn-enable:hover {
  background-color: #218838;
}

.btn-dismiss {
  background-color: #6c757d;
  color: white;
}

.btn-dismiss:hover {
  background-color: #5a6268;
}
</style>
