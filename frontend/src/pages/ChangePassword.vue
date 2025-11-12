<template>
  <div class="change-page-wrapper">
    <div class="change-card">
      <h2>Promjena lozinke</h2>
      <p>Molimo postavite novu lozinku kako biste nastavili</p>

      <form @submit.prevent="handleChangePassword">
        <input v-model="email" type="email" placeholder="Email" />
        <input v-model="oldPassword" type="password" placeholder="Stara lozinka" />
        <input v-model="newPassword" type="password" placeholder="Nova lozinka" />
        <input v-model="confirmPassword" type="password" placeholder="Ponovite novu lozinku" />

        <button type="submit">Spremi novu lozinku</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const email = ref("");
const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const router = useRouter();

async function handleChangePassword() {
  if (!email||!oldPassword.value || !newPassword.value || !confirmPassword.value) {
    alert("Molimo ispunite sva polja.");
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    alert("Lozinke se ne podudaraju.");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/v1/auth/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.value,
        staralozinka: oldPassword.value,
        novalozinka: newPassword.value,
        potvrdilozinku: confirmPassword.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Greška pri promjeni lozinke.");
      return;
    }

    alert("Lozinka uspješno promijenjena!");
    router.push("/login");

  } catch (err) {
    console.error(err);
    alert("Server nije dostupan.");
  }
}
</script>

<style scoped>
.change-page-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 2rem;
  background-color: #F5F1E5;
  min-height: calc(100vh - 140px);
}

.change-card {
  color: #000000;
  width: 100%;
  max-width: 400px;
  padding: 3rem;
  border-radius: 3rem;
  background-color: #FFFCF4;
  text-align: center;
}

.change-card h2 {
  font-weight: 450;
  font-size: 1.875rem;
  margin-bottom: 0.5rem;
}

.change-card p {
  font-size: 0.8rem;
  margin-bottom: 1rem;
}

.change-card input {
  border: 1px solid #ccc;
  border-radius: 7px;
  display: block;
  background-color: #FFFFFD;
  width: 100%;
  margin-bottom: 1rem;
  padding: 1rem;
}

.change-card button {
  border: none;
  border-radius: 7px;
  background-color: #E2D9C2;
  padding: 1rem;
  cursor: pointer;
  width: 100%;
  margin-top: 1rem;
  margin-bottom: 1rem;
  font-size: 1rem;
}
</style>
