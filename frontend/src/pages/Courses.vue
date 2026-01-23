<template>
  <section class="courses-wrapper">
    <h2 class="page-title">Tečajevi</h2>

    <div class="toolbar">
      <div class="role-pill" v-if="role">
        Uloga: <b>{{ role }}</b>
      </div>

      <button
        v-if="canManage"
        class="btn"
        @click="showCreate = !showCreate"
      >
        {{ showCreate ? "Zatvori" : "Dodaj tečaj" }}
      </button>
    </div>

    <div v-if="canManage && showCreate" class="card form-card">
      <h3>Novi tečaj</h3>
      <form @submit.prevent="createCourse">
        <input v-model="newCourse.title" type="text" placeholder="Naziv tečaja" required />
        <textarea v-model="newCourse.description" placeholder="Opis (opcionalno)"></textarea>
        <button class="btn" type="submit">Spremi</button>
      </form>
    </div>

    <div v-if="loading" class="hint">Učitavanje...</div>
    <div v-if="error" class="hint error">{{ error }}</div>

    <div class="grid">
      <router-link
        v-for="c in courses"
        :key="c.course_id"
        :to="`/courses/${c.course_id}`"
        class="course-card"
      >
        <div class="card-top">
          <p class="title">{{ c.title }}</p>
          <span class="badge" v-if="canManage">
            {{ c.is_published ? "PUBLISHED" : "DRAFT" }}
          </span>
        </div>
      </router-link>
    </div>

    <div v-if="canManage && courses.length" class="manage">
      <h3 class="manage-title">Upravljanje tečajevima</h3>

      <div class="manage-list">
        <div v-for="c in courses" :key="'m-'+c.course_id" class="manage-row">
          <div class="left">
            <div class="id">#{{ c.course_id }}</div>
            <input
              class="inline-input"
              v-model="c._editTitle"
              :placeholder="c.title"
            />
          </div>

          <div class="right">
            <button class="btn small" @click="saveTitle(c)">Spremi naziv</button>

            <button
              class="btn small"
              v-if="!c.is_published"
              @click="publishCourse(c)"
            >
              Publish
            </button>
            <button
              class="btn small"
              v-else
              @click="unpublishCourse(c)"
            >
              Unpublish
            </button>

            <router-link class="btn small ghost" :to="`/courses/${c.course_id}`">
              Otvori
            </router-link>
          </div>
        </div>
      </div>

      <p class="hint">
        * Student/guest će uvijek vidjeti samo objavljene tečajeve.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

type Role = "student" | "instructor" | "admin" | null;

type CourseSummary = {
  course_id: number;
  title: string;
  is_published: boolean;

  // lokalno za UI
  _editTitle?: string;
};

const loading = ref(false);
const error = ref<string | null>(null);

const role = ref<Role>(null);
const canManage = ref(false);

const courses = ref<CourseSummary[]>([]);

const showCreate = ref(false);
const newCourse = ref({ title: "", description: "" });

async function loadRole() {
  try {
    const res = await fetch("/api/v1/profile/me", { credentials: "include" });
    if (!res.ok) {
      role.value = null;
      canManage.value = false;
      return;
    }

    const data = await res.json();

    // ⚠️ Ne znam točan shape tvog /profile/me responsea,
    // pa sam napravila "fallback" strategiju:
    const r =
      data?.content?.role ??
      data?.content?.user?.role ??
      data?.role ??
      data?.user?.role ??
      null;

    role.value = r;
    canManage.value = r === "instructor" || r === "admin";
  } catch {
    role.value = null;
    canManage.value = false;
  }
}

async function loadCourses() {
  loading.value = true;
  error.value = null;

  try {
    const res = await fetch("/api/v1/courses", { credentials: "include" });
    if (!res.ok) throw new Error("Ne mogu dohvatiti tečajeve.");

    const data = await res.json();
    const list: CourseSummary[] = data.courses ?? [];

    // pripremi edit polja
    courses.value = list.map((c) => ({ ...c, _editTitle: c.title }));
  } catch (e: any) {
    error.value = e?.message ?? "Greška kod dohvaćanja.";
  } finally {
    loading.value = false;
  }
}

async function createCourse() {
  try {
    const res = await fetch("/api/v1/courses", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newCourse.value.title,
        description: newCourse.value.description || undefined,
      }),
    });

    if (!res.ok) throw new Error("Neuspješno kreiranje tečaja.");

    newCourse.value = { title: "", description: "" };
    showCreate.value = false;

    await loadCourses();
  } catch (e: any) {
    alert(e?.message ?? "Greška.");
  }
}

async function saveTitle(c: CourseSummary) {
  try {
    const title = (c._editTitle ?? "").trim();
    if (!title) return alert("Naziv ne smije biti prazan.");

    const res = await fetch(`/api/v1/courses/${c.course_id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) throw new Error("Neuspješno spremanje naziva.");
    const data = await res.json();
    const updated = data.course;

    c.title = updated.title;
    c.is_published = !!updated.is_published;
    c._editTitle = c.title;
  } catch (e: any) {
    alert(e?.message ?? "Greška.");
  }
}

async function publishCourse(c: CourseSummary) {
  try {
    const res = await fetch(`/api/v1/courses/${c.course_id}/publish`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Neuspješno publishanje.");
    c.is_published = true;
  } catch (e: any) {
    alert(e?.message ?? "Greška.");
  }
}

async function unpublishCourse(c: CourseSummary) {
  try {
    const res = await fetch(`/api/v1/courses/${c.course_id}/unpublish`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Neuspješno unpublishanje.");
    c.is_published = false;
  } catch (e: any) {
    alert(e?.message ?? "Greška.");
  }
}

onMounted(async () => {
  await loadRole();
  await loadCourses();
});
</script>

<style scoped>
.courses-wrapper {
  padding: 30px 0 150px;
  background-color: #f5f1e8;
}

.page-title {
  font-size: 25px;
  color: #2d2d2d;
  margin: 0 0 20px 30px;
  text-align: left;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  margin-bottom: 20px;
}

.role-pill {
  background-color: #fff9ee;
  border: 1px solid #e6dfc9;
  padding: 8px 12px;
  border-radius: 999px;
  color: #302c27;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 30px;
  justify-items: center;
  padding: 0 40px;
}

.course-card {
  background-color: #e6dfc9;
  border-radius: 15px;
  width: 220px;
  height: 140px;
  padding: 15px;
  text-align: left;
  color: #2d2d2d;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.course-card:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
  cursor: pointer;
}

.card-top {
  display: flex;
  gap: 10px;
  justify-content: space-between;
  align-items: flex-start;
}

.title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.badge {
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 999px;
  background-color: #fff6df;
  border: 1px solid #d9cfb4;
  color: #302c27;
  white-space: nowrap;
}

.hint {
  padding: 0 40px;
  margin: 10px 0 20px;
  color: #302c27;
}

.error {
  color: #9b2c2c;
}

.card {
  background-color: #fff;
  border-radius: 15px;
  margin: 0 40px 25px;
  padding: 18px;
  border: 1px solid #e6dfc9;
}

.form-card h3 {
  margin-top: 0;
  color: #302c27;
}

.form-card input,
.form-card textarea {
  border: 1px solid #ccc;
  border-radius: 7px;
  display: block;
  background-color: #fffffd;
  width: 100%;
  margin-bottom: 1rem;
  padding: 1rem;
  font-family: inherit;
  resize: none;
}

.form-card textarea {
  min-height: 90px;
  resize: vertical;
}

.btn {
  border: none;
  border-radius: 7px;
  background-color: #e2d9c2;
  padding: 0.9rem 1rem;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s ease;
  color: #302c27;
}

.btn:hover {
  background-color: #d7ceb8;
}

.small {
  padding: 0.55rem 0.75rem;
  font-size: 0.9rem;
}

.ghost {
  background-color: #fff;
  border: 1px solid #d9cfb4;
}

.manage {
  margin-top: 40px;
  padding: 0 40px;
}

.manage-title {
  margin: 0 0 12px;
  color: #302c27;
}

.manage-list {
  display: grid;
  gap: 10px;
}

.manage-row {
  background-color: #fff;
  border: 1px solid #e6dfc9;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
}

.left {
  display: flex;
  gap: 10px;
  align-items: center;
}

.id {
  font-size: 12px;
  opacity: 0.7;
}

.inline-input {
  border: 1px solid #ccc;
  border-radius: 7px;
  padding: 0.6rem 0.8rem;
  width: 280px;
  background-color: #fffffd;
}
</style>
