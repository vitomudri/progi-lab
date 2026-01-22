<template>
  <div class="admin-page-wrapper">
    <h1>Admin dashboard</h1>

    <!-- KORISNICI -->
    <section class="admin-card">
      <h2>Korisnici</h2>

      <h3>Instruktori</h3>
      <ul class="vertical-list">
        <li v-for="user in instructors" :key="user.id">{{ user.email }}</li>
      </ul>

      <h3>Polaznici</h3>
      <ul class="vertical-list">
        <li v-for="user in participants" :key="user.id">{{ user.email }}</li>
      </ul>

      <h3>Admini</h3>
      <ul class="vertical-list">
        <li v-for="user in admins" :key="user.id">{{ user.email }}</li>
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

    <!-- AUDIT LOG -->
    <section class="admin-card">
      <h2>Audit log</h2>

      <!-- FILTERI -->
      <div class="audit-controls">
        <input
          v-model="userIdFilter"
          placeholder="Filter po user_id"
        />
<label class="audit-label">Zapisa po stranici:</label>
        <select v-model.number="itemsPerPage">
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>

        <button @click="applyFilters">Primijeni</button>
      </div>

      <p v-if="loading">Učitavanje audit loga...</p>
      <p v-if="error" class="error">{{ error }}</p>

      <ul v-if="!loading && !error" class="vertical-list">
        <li v-for="log in auditLogs" :key="log.log_id">
          {{ log.date_time }} – {{ log.first_name }} {{ log.last_name }} – {{ log.action }}
        </li>
      </ul>

      <!-- PAGINATION -->
      <div v-if="!loading && !error" class="pagination">
        <button :disabled="currentPage === 1" @click="prevPage">
          ← Prethodna
        </button>

        <span>
          Stranica {{ currentPage }} / {{ pagesCount }}
        </span>

        <button
          :disabled="currentPage === pagesCount"
          @click="nextPage"
        >
          Sljedeća →
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";

/* MOCK PODACI */
const instructors = ref([
  { id: 1, email: "instructor1@example.com" },
  { id: 2, email: "instructor2@example.com" }
]);

const participants = ref([
  { id: 3, email: "participant1@example.com" },
  { id: 4, email: "participant2@example.com" }
]);

const admins = ref([{ id: 5, email: "admin@example.com" }]);

const courses = ref([
  { id: 1, title: "Osnove kuhanja", instructor: "Instruktor A" },
  { id: 2, title: "Napredni sushi", instructor: "Instruktor B" }
]);

/* AUDIT */
const auditLogs = ref<any[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const currentPage = ref(1);
const itemsPerPage = ref(20);
const pagesCount = ref(1);
const userIdFilter = ref("");

async function fetchAuditLogs() {
  loading.value = true;
  error.value = null;

  try {
    const params = new URLSearchParams();
    params.append("current_page", currentPage.value.toString());
    params.append("items_per_page", itemsPerPage.value.toString());

    if (userIdFilter.value.trim()) {
      userIdFilter.value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .forEach((id) => params.append("user_id", id));
    }

    const res = await fetch(
      `/api/v1/admin/audit_log?${params.toString()}`,
      { credentials: "include" }
    );

    if (!res.ok) throw new Error("Greška pri dohvaćanju audit loga");

    const data = await res.json();
    auditLogs.value = data.result;
    pagesCount.value = data.pages_count;
  } catch (err: any) {
    error.value = err.message || "Greška pri dohvaćanju audit loga";
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  currentPage.value = 1;
  fetchAuditLogs();
}

function nextPage() {
  if (currentPage.value < pagesCount.value) {
    currentPage.value++;
    fetchAuditLogs();
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchAuditLogs();
  }
}

onMounted(fetchAuditLogs);
</script>

<style scoped>
.admin-page-wrapper {
  min-height: 100vh;
  padding: 2rem 2rem 5rem;
  background-color: #F5F1E5;
  font-family: 'Rajdhani', sans-serif;
}

.admin-card {
  background-color: #FFFCF4;
  border-radius: 1.5rem;
  padding: 2rem;
  margin-bottom: 2rem;
}

.admin-card h2 {
  margin-bottom: 1.2rem;
}

.admin-card h3 {
  margin-top: 1.4rem;
  margin-bottom: 0.6rem;
}

h1 {
  text-align: center;
  margin-bottom: 3rem;
  font-weight: 500;
}


.vertical-list {
  display: block;
  list-style-type: disc;
  padding-left: 1.4rem;
  margin: 0.8rem 0 1.4rem;
}

.vertical-list li {
  display: block;
  margin: 0.4rem 0;
  line-height: 1.6;
  padding: 0.35rem 0;
}

.audit-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.4rem;
  flex-wrap: wrap;
  align-items: center;
}

.audit-controls input {
  padding: 0.6rem 0.8rem;
  border-radius: 13px;
  border: 1px solid #ccc;
  min-width: 260px;
  font-size: 0.9rem;
}
.audit-controls input:focus {
  outline: none;
  border-color: #c8bea6;
}

.audit-controls select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;

  background-color: #DED6C3;
  color: #000;
  border: none;
  border-radius: 12px;
  padding: 0.55rem 0.8rem;
  font-size: 0.95rem;
  cursor: pointer;
  min-width: 70px;
  text-align: center;
  transition: background-color 0.2s ease;
}

.audit-controls select:hover {
  background-color: #D2C8B0;
}

.audit-controls select:focus {
  outline: none;
}


.audit-controls button {
  background-color: #DED6C3;
  color: #000;
  border: none;
  border-radius: 12px;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.audit-controls button:hover {
  background-color: #D2C8B0;
}


.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
}
.audit-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.error {
  color: #b00020;
}
</style>
