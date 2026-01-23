<template>
  <main class="page">
    <div class="header">
      <button class="btn ghost" @click="$router.push('/courses')">← Natrag</button>
      <div class="header-text">
        <h1 class="title">Tečaj #{{ courseId }}</h1>
        <p class="sub" v-if="course">
          <b>{{ course.title }}</b>
          <span v-if="canManage" class="pill">{{ course.is_published ? "PUBLISHED" : "DRAFT" }}</span>
        </p>
      </div>
    </div>

    <div v-if="loading" class="hint">Učitavanje...</div>
    <div v-if="error" class="hint error">{{ error }}</div>

    <!-- OPENED LESSON (viewer) -->
    <LessonViewer v-if="openedLesson" :lesson="openedLesson" @close="openedLesson = null" />

    <!-- ACTIVITIES -->
    <section v-if="openedLesson" class="card">
      <LessonActivities :lessonId="openedLesson.lesson_id" :canManage="canManage" />
    </section>

    <!-- COURSE CARD -->
    <section v-if="course" class="card">
      <h2 style="margin: 0 0 10px;">Opis</h2>
      <p class="desc">{{ course.description || "—" }}</p>

      <div v-if="canManage" class="actions">
        <button class="btn small" v-if="!course.is_published" @click="publishCourse">Publish</button>
        <button class="btn small" v-else @click="unpublishCourse">Unpublish</button>
      </div>
    </section>

    <!-- ADD MODULE -->
    <section v-if="canManage" class="card">
      <h2 style="margin: 0 0 10px;">Dodaj modul</h2>
      <form class="form-row" @submit.prevent="addModule">
        <input v-model="newModuleTitle" type="text" class="inline-input" placeholder="Naziv modula" required />
        <button class="btn" type="submit">Dodaj</button>
      </form>
    </section>

    <!-- MODULES / LESSONS -->
    <ModuleList :modules="modules" :canManage="canManage" @openLesson="openLesson" @refresh="loadAll" />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import LessonViewer from "@/pages/LessonViewer.vue";
import LessonActivities from "@/pages/LessonActivities.vue";
import ModuleList from "@/pages/ModuleList.vue";

import { api, type Course, type ModuleSummary, type Role, type LessonDetail, type LessonSummary } from "@/services/courseApi";

const route = useRoute();
const courseId = computed(() => Number(route.params.id));

const role = ref<Role>(null);
const canManage = computed(() => role.value === "instructor" || role.value === "admin");

const loading = ref(false);
const error = ref<string | null>(null);

const course = ref<Course | null>(null);
const modules = ref<ModuleSummary[]>([]);
const newModuleTitle = ref("");

const openedLesson = ref<LessonDetail | null>(null);

async function loadRole() {
  const me = await api.me();
  role.value = me.role;
}

async function loadAll() {
  loading.value = true;
  error.value = null;

  try {
    course.value = await api.getCourse(courseId.value);

    const rawModules = await api.getModules(courseId.value);

    const baseModules = (rawModules ?? []).map((m: any) => ({
      module_id: m.module_id,
      course_id: m.course_id,
      title: m.title,
      order_index: m.order_index,
      _editTitle: m.title,
    }));

    const withLessons: ModuleSummary[] = await Promise.all(
      baseModules.map(async (m: any) => {
        const rawLessons = await api.getLessonsForModule(m.module_id);

        const lessons: LessonSummary[] = (rawLessons ?? []).map((l: any) => ({
          lesson_id: l.lesson_id,
          module_id: l.module_id,
          title: l.title,
          order_index: l.order_index,
          type: l.type,

          _editing: false,
          _loadingEdit: false,

          _editTitle: l.title,
          _editType: l.type,
          _editContent: "",
          _editVideoUrl: "",

          _editStepsText: "",
          _editIngredientsText: "",
          _editPrepTimeMin: null,
          _editCookTimeMin: null,
          _editDifficulty: null,
          _editShoppingList: "",
          _editAllergens: "",
          _editNutritionJson: "",
        }));

        return {
          ...m,
          lessons,
          _newLesson: {
            title: "",
            type: "video",
            video_url: "",
            content: "",
            steps_text: "",
            ingredients_text: "",
            prep_time_min: null,
            cook_time_min: null,
            difficulty: null,
            shopping_list: "",
            allergens: "",
            nutrition_json: "",
          },
        };
      })
    );

    modules.value = withLessons;
  } catch (e: any) {
    error.value = e?.message ?? "Greška.";
  } finally {
    loading.value = false;
  }
}

async function openLesson(lessonId: number) {
  try {
    openedLesson.value = await api.getLessonDetail(lessonId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e: any) {
    alert(e?.message ?? "Greška.");
  }
}

async function publishCourse() {
  if (!course.value) return;
  try {
    await api.publishCourse(course.value.course_id);
    course.value.is_published = true;
  } catch (e: any) {
    alert(e?.message ?? "Neuspješno publishanje.");
  }
}

async function unpublishCourse() {
  if (!course.value) return;
  try {
    await api.unpublishCourse(course.value.course_id);
    course.value.is_published = false;
  } catch (e: any) {
    alert(e?.message ?? "Neuspješno unpublishanje.");
  }
}

async function addModule() {
  const title = newModuleTitle.value.trim();
  if (!title) return;

  try {
    await api.addModule(courseId.value, title);
    newModuleTitle.value = "";
    await loadAll();
  } catch (e: any) {
    alert(e?.message ?? "Neuspješno dodavanje modula.");
  }
}

onMounted(async () => {
  await loadRole();
  await loadAll();
});
</script>

<style scoped>
.page {
  background-color: #f5f1e8;
  padding: 120px 20px 150px;
  max-width: 900px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.header-text .title {
  margin: 0;
  color: #302c27;
}

.sub {
  margin: 6px 0 0;
  color: #302c27;
}

.pill {
  margin-left: 10px;
  font-size: 11px;
  padding: 5px 10px;
  border-radius: 999px;
  background-color: #fff6df;
  border: 1px solid #d9cfb4;
}

.card {
  background-color: #fff;
  border: 1px solid #e6dfc9;
  border-radius: 15px;
  padding: 18px;
  margin-bottom: 20px;
}

.desc {
  color: #302c27;
  margin: 0;
}

.actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

.inline-input {
  border: 1px solid #ccc;
  border-radius: 7px;
  padding: 0.7rem 0.9rem;
  width: 100%;
  background-color: #fffffd;
  font-family: inherit;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
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

.btn:hover { background-color: #d7ceb8; }
.small { padding: 0.55rem 0.75rem; font-size: 0.9rem; }
.ghost { background-color: #fff; border: 1px solid #d9cfb4; }

.hint { margin: 10px 0 18px; color: #302c27; }
.error { color: #9b2c2c; }

@media (max-width: 720px) {
  .form-row { grid-template-columns: 1fr; }
}
</style>
