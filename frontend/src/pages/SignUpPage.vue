<template>
  <div class="signup-page-wrapper">
    <div class="signup-card">
      <h2>Dobrodošli!</h2>
      <p>Registrirajte se kako biste započeli kuhanje s nama</p>
      <form @submit.prevent="handleSignup">
        <input v-model="ime" type="text" placeholder="Ime" />
        <input v-model="prezime" type="text" placeholder="Prezime" />
        <input v-model="email" type="email" placeholder="Adresa e-pošte" />
        <input v-model="lozinka" type="password" placeholder="Lozinka" />
        <button type="submit">Registracija</button>
        <router-link to="/login">Već imate račun? Prijavite se ovdje</router-link>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const ime = ref('');
const prezime = ref('');
const email = ref('');
const lozinka = ref('');
const router = useRouter();

async function handleSignup() {
  if (!ime.value || !prezime.value || !email.value || !lozinka.value) {
    alert('Molimo ispunite sva polja.');
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/v1/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ime: ime.value,
        prezime: prezime.value,
        email: email.value,
        lozinka: lozinka.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Greška pri registraciji.");
      return;
    }

    router.push("/login");

  } catch (err) {
    console.error(err);
    alert("Server nije dostupan.");
  }
}

</script>

<style scoped>
.signup-page-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 2rem;
  background-color: #F5F1E5;
  min-height: calc(100vh - 140px);
}

.signup-card {
  color: #000000;
  width: 100%;
  max-width: 400px;
  padding: 3rem;
  border-radius: 3rem;
  background-color: #FFFCF4;
  text-align: center;
}

.signup-card h2 {
  font-weight: 450;
  font-size: 1.875rem;
  margin-bottom: 0.5rem;
}

.signup-card p {
  font-size: 0.8rem;
  margin-bottom: 1rem;
}

.signup-card input {
  border: 1px solid #ccc;
  border-radius: 7px;
  display: block;
  background-color: #FFFFFD;
  width: 100%;
  margin-bottom: 1rem;
  padding: 1rem;
}

.signup-card button {
  border: none;
  border-radius: 7px;
  background-color: #E2D9C2;
  padding: 1rem;
  cursor: pointer;
  width: 100%;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.signup-card a {
  font-size: 0.875rem;
  color: #000000;        
  text-decoration: none;  
  transition: color 0.2s;
}

.signup-card a:hover {
  border-radius: 7px;
  background-color: #F5F1E5;
  color: #555555;        
  text-decoration: underline;
}
</style>
