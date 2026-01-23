<template>
  <div class="profile-page-wrapper">
    <div class="profile-card">
      <div class="avatar-wrapper">
        <div class="avatar">
          <div class="head"></div>
          <div class="body"></div>
        </div>

        <h2 class="name">{{ profileData.first_name }} {{ profileData.last_name }}</h2>
        <span class="badge">Instruktor</span>
        <p class="email">{{ profileData.email }}</p>
      </div>

      <div class="details">
        <p><span class="label">Biografija:</span> {{ profileData.biography }}</p>
        <p><span class="label">Specijalizacije:</span> {{ profileData.specialization }}</p>
        <p><span class="label">Prosječna ocjena:</span> {{ profileData.rating }}</p>
        <!-- <p><span class="label">Recepti:</span> {{ profileData.recipes.join(', ') }}</p>
        <p><span class="label">Lekcije:</span> {{ profileData.lessons.join(', ') }}</p>
        <p><span class="label">Radionice:</span> {{ profileData.workshopSchedule.join(', ') }}</p> -->
      </div>
    </div>
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

/* Avatar */
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

.badge {
  display: inline-block;
  margin: 0.5rem 0;
  padding: 0.25rem 1.2rem;
  background-color: #C8B896;
  border-radius: 999px;
  font-size: 0.75rem;
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
