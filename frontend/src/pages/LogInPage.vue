<template>
  <div class="login-page-wrapper">
    <div class="login-card">
      <h2>Dobrodošli natrag!</h2>
      <p>Prijavite se kako biste nastavili kuhati s nama</p>
      
      <form @submit.prevent="handleLogin">
        <input v-model="email" type="email" placeholder="Adresa e-pošte" />
        <input v-model="password" type="password" placeholder="Lozinka" />
        
        <router-link to="/change-password">Promijenite lozinku</router-link>
        
        <button type="submit">Prijava</button>

        <router-link to="/signup">
          Novi ste korisnik? Registrirajte se ovdje
        </router-link>

        <!-- === GOOGLE BUTTON START === -->
        <div ref="googleDiv" style="margin-top: 1rem;"></div>
        <!-- === GOOGLE BUTTON END === -->
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const email = ref("");
const password = ref("");
const router = useRouter();

// === GOOGLE OAUTH FRONTEND START ===
const googleDiv = ref(null);

function handleGoogleCredentialResponse(response: any) {
  fetch("http://localhost:3000/api/v1/auth/google", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: response.credential })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        console.error("Google OAuth error:", data.error);
        alert("Greška pri Google prijavi: " + data.error);
        return;
      }
      console.log("Google OAuth success, redirecting...");
      router.push("/participant-profile");
    })
    .catch(err => {
      console.error("Google OAuth fetch error:", err);
      alert("Greška pri Google prijavi!");
    });
}

onMounted(async () => {

  // Load Google script if not already loaded
  if (!(window as any).google) {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    // Wait for script to load
    await new Promise((resolve) => {
      script.onload = resolve;
    });
  }

  // Initialize Google
  if ((window as any).google) {
    (window as any).google.accounts.id.initialize({
      client_id: "952744768748-654697ktpb615dveup9ncdv0so0eqlt4.apps.googleusercontent.com",
      callback: handleGoogleCredentialResponse,
    });

    (window as any).google.accounts.id.renderButton(googleDiv.value, {
      theme: "outline",
      size: "large",
    });
  } else {
    console.error("Google script failed to load");
  }
});
// === GOOGLE OAUTH FRONTEND END ===

async function handleLogin() {
  const res = await fetch("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.value,
      lozinka: password.value
    })
  });

  const data = await res.json();

  if (data.mustChangePassword) {
    router.push("/change-password");
    return;
  }

  router.push("/participant-profile");
}
</script>

<style scoped>
.login-page-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 2rem;
  background-color: #F5F1E5;
  min-height: calc(100vh - 140px);
}

.login-card {
  color: #000000;
  width: 100%;
  max-width: 400px;
  padding: 3rem;
  border-radius: 3rem;
  background-color: #FFFCF4;
  text-align: center;
}

.login-card h2 {
  font-weight: 450;
  font-size: 1.875rem;
  margin-bottom: 0.5rem;
}

.login-card p {
  font-size: 0.8rem;
  margin-bottom: 1rem;
}

.login-card input {
  border: 1px solid #ccc;
  border-radius: 7px;
  display: block;
  background-color: #FFFFFD;
  width: 100%;
  margin-bottom: 1rem;
  padding: 1rem;
}

.login-card button {
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

.login-card a {
  font-size: 0.875rem;
  color: #000000;
  text-decoration: none;
  transition: color 0.2s;
}

.login-card a:hover {
  border-radius: 7px;
  background-color: #F5F1E5;
  color: #555555;
  text-decoration: underline;
}
</style>
