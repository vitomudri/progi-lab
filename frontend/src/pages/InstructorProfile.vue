<template>
  <div class="profile-page-wrapper">
    <div v-if="loading">Učitavanje profila...</div>
    <div v-else-if="error" style="color:red">{{ error }}</div>

    <div v-else-if="profileData" class="profile-card">
      <div class="avatar-wrapper">
        <div class="avatar">
          <div class="head"></div>
          <div class="body"></div>
        </div>

        <h2 class="name">{{ profileData.ime }} {{ profileData.prezime }}</h2>
        <span class="badge">Instruktor</span>
        <p class="email">{{ profileData.email }}</p>
      </div>

      <div class="details">
        <p><span class="label">Biografija:</span> {{ profileData.bio }}</p>
        <p><span class="label">Specijalizacije:</span> {{ profileData.specializations.join(', ') }}</p>
        <p><span class="label">Prosječna ocjena:</span> {{ profileData.averageRating }}</p>
        <p><span class="label">Recepti:</span> {{ profileData.recipes.join(', ') }}</p>
        <p><span class="label">Lekcije:</span> {{ profileData.lessons.join(', ') }}</p>
        <p><span class="label">Radionice:</span> {{ profileData.workshopSchedule.join(', ') }}</p>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

type ProfileData = {
  ime: string;
  prezime: string;
  email: string;
  bio: string;
  specializations: string[];
  recipes: string[];
  lessons: string[];
  workshopSchedule: string[];
  averageRating: number | null;
};

const profileData = ref<ProfileData | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadInstructorProfile() {
  loading.value = true;
  error.value = null;

  try {
    const raw =
      (route.params.id ??
        route.params.instructor_id ??
        route.params.instructorId) as any;

    const instructorId = encodeURIComponent(String(raw ?? ""));
    if (!instructorId) throw new Error("Nedostaje instructor id u ruti");

    const res = await fetch(`/api/v1/instructors/${instructorId}`, {
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Greška");

    profileData.value = data.instructor;
  } catch (e: any) {
    error.value = e.message ?? "Greška kod učitavanja profila";
  } finally {
    loading.value = false;
  }
}

onMounted(loadInstructorProfile);

// ako se promijeni instruktor bez reload-a stranice
watch(
  () => route.params.id,
  () => loadInstructorProfile()
);
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
