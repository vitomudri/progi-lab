<template>
  <div class="instructors-page">
    <!-- UVOD -->
    <section class="intro">
      <h1>Naši instruktori</h1>
      <p>
        Upoznajte iskusne kuhare koji vode naše tečajeve i radionice.
        Kliknite na instruktora za više informacija.
      </p>
    </section>

    <!-- GRID INSTRUKTORA -->
    <section class="instructor-grid">
      <div
        v-for="instructor in instructors"
        :key="instructor.id"
        class="instructor-card"
        @click="goToInstructor(instructor.id)"
      >
        <!-- AVATAR (ISTI KAO NA PROFILU) -->
        <div class="avatar">
          <div class="head"></div>
          <div class="body"></div>
        </div>

        <h3 class="name">{{ instructor.name }}</h3>
        <p class="rating" v-if="instructor.ratingCount ?? 0 > 0">
           Prosj. ocjena: {{ (instructor.rating ?? 0).toFixed(1) }} ({{ instructor.ratingCount }})
        </p>
        <p class="rating" v-else>
            Još nema ocjena
        </p>

      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

type Instructor = {
  id: string;        // UUID
  name: string;
  rating: number | null;
  ratingCount: number | null;
  biography?: string | null;
  specialization?: string | null;
};

const instructors = ref<Instructor[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadInstructors() {
  loading.value = true;
  error.value = null;

  try {
    // prilagodi base URL ako ti je drugačiji (npr. /v1 umjesto /api/v1)
    const res = await fetch("/api/v1/instructors", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // ok i ako je public; ako koristiš cookie auth, bitno
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load instructors");

    instructors.value = data.instructors ?? [];
  } catch (e: any) {
    error.value = e?.message ?? "Greška kod učitavanja";
  } finally {
    loading.value = false;
  }
}

function goToInstructor(id: string) {
  router.push(`/instructors/${id}`);
}

onMounted(loadInstructors);
</script>


<style scoped>
/* PAGE */
.instructors-page {
  min-height: calc(100vh - 140px);
  padding: 2rem;
  background-color: #F5F1E5;
  font-family: 'Rajdhani', sans-serif;
}

/* INTRO */
.intro {
  max-width: 700px;
  margin-bottom: 2rem;
}

.intro h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

/* GRID */
.instructor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
}

/* CARD */
.instructor-card {
  background-color: #FFFCF4;
  border-radius: 1.5rem;
  padding: 1.8rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.instructor-card:hover {
  transform: scale(1.03);
  box-shadow: 0 10px 20px rgba(0,0,0,0.08);
}

/* AVATAR – IDENTIČAN PROFILU (samo manji) */
.avatar {
  width: 90px;
  height: 90px;
  background-color: #E3DFD2;
  border-radius: 50%;
  margin: 0 auto 1rem;
  position: relative;
}

.head {
  width: 24px;
  height: 24px;
  border: 3px solid #555;
  border-radius: 50%;
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
}

.body {
  width: 46px;
  height: 24px;
  border: 3px solid #555;
  border-top: none;
  border-radius: 0 0 32px 32px;
  position: absolute;
  top: 42px;
  left: 50%;
  transform: translateX(-50%);
}

/* TEXT */
.name {
  margin-bottom: 0.25rem;
}

.rating {
  font-size: 0.9rem;
  margin-top: 0.2rem;
  opacity: 0.8;
}
</style>
