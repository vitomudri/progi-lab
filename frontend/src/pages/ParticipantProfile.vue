<template>
  <div class="profile-page-wrapper">
    <UserCard
        :ime="profileData.ime"
        :prezime="profileData.prezime"
        :email="profileData.email"
      />
      <section class="profile-details">
        <template v-if="!error">
          <p><strong>Razine vještine:</strong> {{ profileData.skillLevel }}</p>
          <p><strong>Alergeni:</strong> {{ profileData.allergens.join(', ') }}</p>
          <p><strong>Omiljene kuhinje:</strong> {{ profileData.favoriteCuisines.join(', ') }}</p>
          <p><strong>Povijest tečajeva:</strong> {{ profileData.courseHistory.join(', ') }}</p>
          <p><strong>Bilješke:</strong> {{ profileData.notes }}</p>
          <div class="profile-actions">
            <button @click="handleLogout">Odjava</button>
          </div>
        </template>
        <template v-else>
          <p><strong>Niste prijavljeni.</strong></p>
        </template>
      </section>
  </div>
</template>

<script setup lang="ts">
import UserCard from "../components/UserCard.vue";
import { ref, onMounted } from "vue";
import { useRouter } from 'vue-router';

const profileData = ref({
  ime: "",
  prezime: "",
  email: "",
  skillLevel: "",
  allergens: [] as string[],
  favoriteCuisines: [] as string[],
  courseHistory: [] as string[],
  notes: ""
});

const loading = ref(true);
const error = ref<string | null>(null);
const router = useRouter();

async function handleLogout() {
  try {
    const res = await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    if (!res.ok) throw new Error('Logout failed');
    router.push('/login');
  } catch (err) {
    console.error('Logout error', err);
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    const res = await fetch('/api/v1/profile/me', { credentials: 'include' });
    if (!res.ok) {
      throw new Error((await res.json()).error || res.statusText);
    }
    const data = await res.json();
    profileData.value = {
      ime: data.ime || "",
      prezime: data.prezime || "",
      email: data.email || "",
      skillLevel: data.skillLevel || "",
      allergens: data.allergens || [],
      favoriteCuisines: data.favoriteCuisines || [],
      courseHistory: data.courseHistory || [],
      notes: data.notes || ""
    };
  } catch (err: any) {
    console.error('Failed to load profile', err);
    error.value = err.message || 'Greška pri učitavanju profila.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.profile-page-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 1rem;
  background-color: #F5F1E5;
  font-family: 'Rajdhani', sans-serif;
  color: #000;
}

.profile-details {
  flex: 1;
  margin-top: 1rem;
  background-color: #FFF;
  padding: 1.5rem;
  overflow-y: auto;
}
.profile-details p {
  margin: 0.5rem 0;
  line-height: 1.5;
}
</style>
