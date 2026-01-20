<template>
  <div class="profile-page-wrapper">
    <div class="profile-card">
      <div class="avatar-wrapper">
        <div class="avatar">
          <div class="head"></div>
          <div class="body"></div>
        </div>

        <h2 class="name">{{ profileData.ime }} {{ profileData.prezime }}</h2>
        <p class="email">{{ profileData.email }}</p>
      </div>

      <div class="details">
        <p><span class="label">Razina vještine:</span> {{ profileData.skillLevel }}</p>
        <p><span class="label">Alergeni:</span> {{ profileData.allergens.join(', ') || '—' }}</p>
        <p><span class="label">Omiljene kuhinje:</span> {{ profileData.favoriteCuisines.join(', ') || '—' }}</p>
        <p><span class="label">Povijest tečajeva:</span> {{ profileData.courseHistory.join(', ') || '—' }}</p>
        <p><span class="label">Bilješke:</span> {{ profileData.notes || '—' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const profileData = ref({
  ime: "Marko",
  prezime: "Marić",
  email: "marko@example.com",
  skillLevel: "Početnik",
  allergens: ["Gluten"],
  favoriteCuisines: ["Talijanska", "Mediteranska"],
  courseHistory: ["Osnove kuhanja"],
  notes: "Volim jednostavne recepte."
});
</script>

<style scoped>
.profile-page-wrapper {
  background-color: #F5F1E5;
  padding: 2rem;
  display: flex;
  justify-content: center;
  font-family: 'Rajdhani', sans-serif;
}

.profile-card {
  background-color: #FFFCF4;
  border-radius: 28px;
  padding: 3rem 2rem;
  max-width: 720px;
  width: 100%;
}

/* Avatar – isti kao instruktor */
.avatar-wrapper {
  text-align: center;
  margin-bottom: 2rem;
}

.avatar {
  width: 120px;
  height: 120px;
  background-color: #E3DFD2;
  border-radius: 50%;
  margin: 0 auto 1rem;
  position: relative;
}

.head {
  width: 32px;
  height: 32px;
  border: 3px solid #555;
  border-radius: 50%;
  position: absolute;
  top: 26px;
  left: 50%;
  transform: translateX(-50%);
}

.body {
  width: 60px;
  height: 30px;
  border: 3px solid #555;
  border-top: none;
  border-radius: 0 0 40px 40px;
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
}

/* Text */
.name {
  margin-bottom: 0.25rem;
}

.email {
  font-size: 0.9rem;
  opacity: 0.7;
}

.details {
  text-align: left;
}

.details p {
  margin: 0.75rem 0;
  line-height: 1.6;
}

.label {
  font-weight: 600;
}
</style>
