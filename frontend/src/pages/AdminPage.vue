<template>
  <div class="admin-page-wrapper">
    <h1>Admin dashboard</h1>

    <!-- KORISNICI -->
    <section class="admin-card">
      <h2>Korisnici</h2>

      <h3>Instruktori</h3>
      <ul class="vertical-list">
        <li v-for="user in instructors" :key="user.id">
          {{ user.email }}
        </li>
      </ul>

      <h3>Polaznici</h3>
      <ul class="vertical-list">
        <li v-for="user in participants" :key="user.id">
          {{ user.email }}
        </li>
      </ul>

      <h3>Admini</h3>
      <ul class="vertical-list">
        <li v-for="user in admins" :key="user.id">
          {{ user.email }}
        </li>
      </ul>
    </section>

    <!-- TEČAJEVI -->
    <section class="admin-card">
      <h2>Tečajevi</h2>
      <ul class="vertical-list">
        <li v-for="course in courses" :key="course.id">
          {{ course.title }} – Instruktor: {{ course.instructor }}
        </li>
      </ul>
    </section>

    <!-- AUDIT -->
    <section class="admin-card">
      <h2>Audit log</h2>

      <p v-if="loading">Učitavanje audit loga...</p>
      <p v-if="error" class="error">{{ error }}</p>

      <ul v-if="!loading && !error" class="vertical-list">
        <li v-for="log in auditLogs" :key="log.log_id">
          {{ log.date_time }} – {{ log.action }}
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

/* MOCK PODACI – OSTAJU */
const instructors = ref([
  { id: 1, email: "instructor1@example.com" },
  { id: 2, email: "instructor2@example.com" }
]);

const participants = ref([
  { id: 3, email: "participant1@example.com" },
  { id: 4, email: "participant2@example.com" }
]);

const admins = ref([
  { id: 5, email: "admin@example.com" }
]);

const courses = ref([
  { id: 1, title: "Osnove kuhanja", instructor: "Instruktor A" },
  { id: 2, title: "Napredni sushi", instructor: "Instruktor B" }
]);

/* AUDIT – BACKEND */
const auditLogs = ref<any[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function fetchAuditLogs() {
  loading.value = true;
  error.value = null;

  try {
    const res = await fetch(
      "/api/v1/admin/audit_log?current_page=1&items_per_page=20",
      { credentials: "include" }
    );

    if (!res.ok) {
      throw new Error("Greška pri dohvaćanju audit loga");
    }

    const data = await res.json();
    auditLogs.value = data.result;
  } catch (err: any) {
    error.value = err.message || "Greška pri dohvaćanju audit loga";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchAuditLogs();
});
</script>

<style scoped>
.admin-page-wrapper {
  min-height: 100vh;
  padding: 2rem 2rem 5rem;
  background-color: #F5F1E5;
  font-family: 'Rajdhani', sans-serif;
  color: #000;
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
  font-weight: 500;
}

.admin-card {
  background-color: #FFFCF4;
  border-radius: 1.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.admin-card h2 {
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.admin-card h3 {
  margin-top: 1rem;
  font-size: 1rem;
  font-weight: 600;
}

.vertical-list {
  list-style-type: disc;
  padding-left: 1.2rem;
  margin: 0.3rem 0 1.2rem 0;
  display: block;
}

.vertical-list li {
  display: block;
  margin: 0.2rem 0;
  line-height: 1.4;
  text-align: left;
  padding: 0.25rem 0.4rem;
}

.error {
  color: #b00020;
  margin-bottom: 0.5rem;
}
</style>
