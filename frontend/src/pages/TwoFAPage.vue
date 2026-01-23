<template>
  <div class="twofa-page-wrapper">
    <div class="twofa-card">
      <h2>Dvofaktorska autentifikacija</h2>
      <p>Unesite kod iz vaše autentifikatorske aplikacije</p>
      <form @submit.prevent="handle2FA">
        <input
          v-model="token"
          type="text"
          placeholder="000000"
          maxlength="6"
          inputmode="numeric"
          :disabled="isLoading"
        />
        <button type="submit" :disabled="isLoading">
          {{ isLoading ? "Provjera..." : "Potvrdi" }}
        </button>
        <p v-if="error" class="error-message">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const token = ref('');
const router = useRouter();
const isLoading = ref(false);
const error = ref('');

async function handle2FA() {
  if (!token.value || token.value.length !== 6) {
    error.value = 'Molimo unesite 6-znamenkasti kod.';
    return;
  }

  isLoading.value = true;
  error.value = '';

  try {
    const res = await fetch('/api/v1/auth/2fa/verify-token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      error.value = data.error || 'Pogrešan kod. Pokušajte ponovno.';
      token.value = '';
      return;
    }

    // Redirect to profile
    router.push('/participant-profile');
  } catch (err) {
    error.value = 'Greška na serveru. Pokušajte ponovno.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.twofa-page-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 2rem;
  background-color: #F5F1E5;
  min-height: calc(100vh - 140px);
}

.twofa-card {
  color: #000000;
  width: 100%;
  max-width: 400px;
  padding: 3rem;
  border-radius: 3rem;
  background-color: #FFFCF4;
  text-align: center;
}

.twofa-card h2 {
  font-weight: 450;
  font-size: 1.875rem;
  margin-bottom: 0.5rem;
}

.twofa-card p {
  font-size: 0.8rem;
  margin-bottom: 1rem;
}

.twofa-card input {
  border: 1px solid #ccc;
  border-radius: 7px;
  display: block;
  background-color: #FFFFFD;
  width: 100%;
  margin-bottom: 1rem;
  padding: 1rem;
  font-size: 1.5rem;
  text-align: center;
  letter-spacing: 0.5rem;
}

.twofa-card input:disabled {
  background-color: #F0F0F0;
  cursor: not-allowed;
}

.twofa-card button {
  border: none;
  border-radius: 7px;
  background-color: #E2D9C2;
  padding: 1rem;
  cursor: pointer;
  width: 100%;
  margin-bottom: 1rem;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.twofa-card button:hover:not(:disabled) {
  background-color: #D4C9B0;
}

.twofa-card button:disabled {
  background-color: #D0D0D0;
  cursor: not-allowed;
  opacity: 0.7;
}

.error-message {
  color: #d32f2f;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}
</style>
