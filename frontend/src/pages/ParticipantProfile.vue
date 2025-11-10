<template>
  <div class="profile-page-wrapper">
    <UserCard
      :ime="profileData.ime"
      :prezime="profileData.prezime"
      :email="profileData.email"
    />
    <section class="profile-details">
      <p><strong>Razine vještine:</strong> {{ profileData.skillLevel }}</p>
      <p><strong>Alergeni:</strong> {{ profileData.allergens.join(', ') }}</p>
      <p><strong>Omiljene kuhinje:</strong> {{ profileData.favoriteCuisines.join(', ') }}</p>
      <p><strong>Povijest tečajeva:</strong> {{ profileData.courseHistory.join(', ') }}</p>
      <p><strong>Bilješke:</strong> {{ profileData.notes }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import UserCard from "../components/UserCard.vue";
import { ref, onMounted } from "vue";

const profileData = ref({
  ime: "Marko",
  prezime: "Marković",
  email: "marko@example.com",
  skillLevel: "Početnik",
  allergens: ["kikiriki", "mlijeko"],
  favoriteCuisines: ["Talijanska", "Japanska"],
  courseHistory: ["Tečaj tjestenine", "Tečaj sushi"],
  notes: "Preferira večernje sate."
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