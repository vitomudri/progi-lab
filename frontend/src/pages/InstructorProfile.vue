<template>
  <div class="profile-page-wrapper">
    <UserCard
      :ime="profileData.first_name"
      :prezime="profileData.last_name"
      :email="profileData.email"
    />
    <section class="profile-details">
      <p><strong>Biografija:</strong> {{ profileData.biography }}</p>
      <p><strong>Specijalizacija:</strong> {{ profileData.specialization }}</p>
      <p><strong>Prosječna ocjena:</strong> {{ profileData.rating }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import UserCard from "../components/UserCard.vue";
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const profileData = ref({
  first_name: "",
  last_name: "",
  email: "",
  biography: "",
  specialization: "",
  rating: null as number | null,
  verified: false
});

onMounted(async () => {
  const instructorId = route.params.id as string;

  try {
    const res = await fetch(`/api/v1/profile/${instructorId}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load instructor profile");

    const data = await res.json();
    profileData.value = {
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      email: data.email || "",
      biography: data.biography || "",
      specialization: data.specialization || "",
      rating: data.rating || null,
      verified: data.verified || false
    };
  } catch (err) {
    console.error("Error loading instructor profile:", err);
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
