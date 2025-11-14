<template>
  <div class="profile-page-wrapper">
    <UserCard
      :ime="profileData.ime"
      :prezime="profileData.prezime"
      :email="profileData.email"
    />
    <section class="profile-details">
      <p><strong>Biografija:</strong> {{ profileData.bio }}</p>
      <p><strong>Specijalizacije:</strong> {{ profileData.specializations.join(', ') }}</p>
      <p><strong>Popis recepata:</strong> {{ profileData.recipes.join(', ') }}</p>
      <p><strong>Popis lekcija:</strong> {{ profileData.lessons.join(', ') }}</p>
      <p><strong>Raspored radionica:</strong> {{ profileData.workshopSchedule.join(', ') }}</p>
      <p><strong>Prosječna ocjena:</strong> {{ profileData.averageRating }}</p>
      <p><strong>Recenzije:</strong> {{ profileData.reviews.join('; ') }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import UserCard from "../components/UserCard.vue";
import { ref } from "vue";

const profileData = ref({
  ime: "Ana",
  prezime: "Horvat",
  email: "ana@example.com",
  bio: "Iskusna kuharica sa 15 godina iskustva u talijanskoj i japanskoj kuhinji.",
  specializations: ["Talijanska kuhinja", "Japanska kuhinja", "Veganska jela"],
  recipes: ["Pizza Margherita", "Sushi Roll", "Veganski burger"],
  lessons: ["Osnove talijanske kuhinje", "Napredni sushi tečaj"],
  workshopSchedule: ["Ponedjeljak 18:00-20:00", "Srijeda 17:00-19:00"],
  averageRating: 4.8,
  reviews: ["Odlična instruktorica!", "Naučila sam puno novih trikova.", "Vrlo strpljiva i detaljna."]
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