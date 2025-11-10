<template>
  <div class="twofa-page-wrapper">
    <div class="twofa-card">
      <h2>Potvrdite svoj identitet</h2>
      <p>Unesite kod koji ste primili na svoj e-mail</p>
      <form @submit.prevent="handle2FA">
        <input v-model="code" type="text" placeholder="Unesite kod" />
        <button type="submit">Potvrdi</button>
        <p class="resend" @click="resendCode">Niste primili kod? Pošalji ponovno</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const code = ref('');
const router = useRouter();

function handle2FA() {
  if (!code.value) {
    //alert('Molimo unesite kod.');
    return;
  }
  //console.log('2FA kod:', code.value);
  router.push('/participant-profile');
}

function resendCode() {
  console.log("Ponovno šaljem kod korisniku...");
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
}

.resend {
  cursor: pointer;
  font-size: 0.875rem;
  color: #000;
  text-decoration: underline;
  transition: background-color 0.2s;
}

.resend:hover {
  color: #555;
}
</style>
