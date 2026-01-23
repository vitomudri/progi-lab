<template>
  <section class="modules">
    <h2 class="section-title">Moduli</h2>

    <div v-if="modules.length === 0" class="hint">Nema modula još.</div>

    <div v-for="m in modules" :key="m.module_id" class="module-card">
      <div class="module-top">
        <div>
          <h3 class="module-title">{{ m.order_index }}. {{ m.title }}</h3>
          <p class="mini">Module ID: {{ m.module_id }}</p>
        </div>

        <div v-if="canManage" class="module-edit">
          <input class="inline-input" v-model="m._editTitle" />
          <button class="btn small" @click="saveModule(m)">Spremi</button>
        </div>
      </div>

      <div class="lessons">
        <h4 style="margin: 0 0 10px;">Lekcije</h4>

        <div v-if="m.lessons.length === 0" class="mini">Nema lekcija.</div>

        <div v-for="l in m.lessons" :key="l.lesson_id" class="lesson-row">
          <div class="lesson-left">
            <div class="lesson-index">{{ l.order_index }}.</div>
            <div>
              <div class="lesson-title">{{ l.title }}</div>
              <div class="lesson-meta">Tip: {{ l.type }}</div>
            </div>
          </div>

          <div class="lesson-actions">
            <button class="btn small" @click="$emit('openLesson', l.lesson_id)">Otvori</button>

            <button
              v-if="canManage"
              class="btn small ghost"
              @click="toggleEdit(l)"
              :disabled="l._loadingEdit"
            >
              {{ l._editing ? "Zatvori" : l._loadingEdit ? "Učitavam..." : "Uredi" }}
            </button>
          </div>

          <!-- EDIT -->
          <div v-if="canManage && l._editing" class="lesson-edit">
            <div class="row2">
              <input v-model="l._editTitle" class="inline-input" placeholder="Naziv" />

              <select v-model="l._editType" class="inline-input select">
                <option value="video">video</option>
                <option value="text">text</option>
                <option value="recipe">recipe</option>
              </select>
            </div>

            <input
              v-if="l._editType === 'video'"
              v-model="l._editVideoUrl"
              class="inline-input"
              placeholder="Video URL"
            />

            <textarea
              v-if="l._editType === 'text'"
              v-model="l._editContent"
              class="textarea"
              placeholder="Tekst lekcije"
            />

            <div v-if="l._editType === 'video' || l._editType === 'recipe'" class="recipe-edit">
              <textarea v-model="l._editIngredientsText" class="textarea" placeholder="Sastojci (ingredients_text)" />
              <textarea v-model="l._editStepsText" class="textarea" placeholder="Koraci (steps_text)" />

              <div class="row2">
                <input
                  v-model.number="l._editPrepTimeMin"
                  class="inline-input"
                  type="number"
                  min="0"
                  placeholder="Prep time (min)"
                />
                <input
                  v-model.number="l._editCookTimeMin"
                  class="inline-input"
                  type="number"
                  min="0"
                  placeholder="Cook time (min)"
                />
              </div>

              <select v-model="l._editDifficulty" class="inline-input select">
                <option :value="null">— težina —</option>
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>

              <textarea v-model="l._editShoppingList" class="textarea" placeholder="Shopping list" />
              <textarea v-model="l._editAllergens" class="textarea" placeholder="Alergeni" />

              <textarea v-model="l._editNutritionJson" class="textarea" placeholder="Nutrition (JSON)" />
              <div class="mini">* Nutrition mora biti validan JSON (npr. { "kcal": 420, "protein_g": 30 })</div>
            </div>

            <div class="actions-row">
              <button class="btn small" @click="saveLesson(l)">Spremi</button>
            </div>
          </div>
        </div>

        <!-- ADD LESSON -->
        <div v-if="canManage" class="add-lesson">
          <h4 style="margin: 16px 0 10px;">Dodaj lekciju</h4>

          <form class="lesson-edit" @submit.prevent="addLesson(m)">
            <div class="row2">
              <input v-model="m._newLesson.title" class="inline-input" placeholder="Naziv lekcije" required />

              <select v-model="m._newLesson.type" class="inline-input select">
                <option value="video">video</option>
                <option value="text">text</option>
                <option value="recipe">recipe</option>
              </select>
            </div>

            <input
              v-if="m._newLesson.type === 'video'"
              v-model="m._newLesson.video_url"
              class="inline-input"
              placeholder="Video URL"
              required
            />

            <textarea
              v-if="m._newLesson.type === 'text'"
              v-model="m._newLesson.content"
              class="textarea"
              placeholder="Tekst lekcije"
              required
            />

            <div v-if="m._newLesson.type === 'video' || m._newLesson.type === 'recipe'" class="recipe-edit">
              <textarea v-model="m._newLesson.ingredients_text" class="textarea" placeholder="Sastojci (ingredients_text)" />
              <textarea v-model="m._newLesson.steps_text" class="textarea" placeholder="Koraci (steps_text)" />

              <div class="row2">
                <input
                  v-model.number="m._newLesson.prep_time_min"
                  class="inline-input"
                  type="number"
                  min="0"
                  placeholder="Prep time (min)"
                />
                <input
                  v-model.number="m._newLesson.cook_time_min"
                  class="inline-input"
                  type="number"
                  min="0"
                  placeholder="Cook time (min)"
                />
              </div>

              <select v-model="m._newLesson.difficulty" class="inline-input select">
                <option :value="null">— težina —</option>
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>

              <textarea v-model="m._newLesson.shopping_list" class="textarea" placeholder="Shopping list" />
              <textarea v-model="m._newLesson.allergens" class="textarea" placeholder="Alergeni" />

              <textarea v-model="m._newLesson.nutrition_json" class="textarea" placeholder="Nutrition (JSON)" />
              <div class="mini">* Nutrition mora biti validan JSON (npr. { "kcal": 420, "protein_g": 30 })</div>
            </div>

            <div class="actions-row">
              <button class="btn" type="submit">Dodaj</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { api, type ModuleSummary, type LessonSummary, type LessonType } from "@/services/courseApi";

const props = defineProps<{
  modules: ModuleSummary[];
  canManage: boolean;
}>();

const emit = defineEmits<{
  (e: "openLesson", lessonId: number): void;
  (e: "refresh"): void;
}>();

function parseNutritionJson(raw: string | undefined) {
  const txt = (raw ?? "").trim();
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return "__INVALID__";
  }
}

async function saveModule(m: ModuleSummary) {
  const title = (m._editTitle ?? "").trim();
  if (!title) return alert("Naziv ne smije biti prazan.");
  await api.saveModuleTitle(m.module_id, title);
  m.title = title;
}

async function toggleEdit(l: LessonSummary) {
  if (l._editing) {
    l._editing = false;
    return;
  }

  l._loadingEdit = true;
  try {
    const detail = await api.getLessonDetail(l.lesson_id);

    l._editing = true;
    l._editTitle = detail.title;
    l._editType = detail.type;
    l._editContent = detail.content ?? "";
    l._editVideoUrl = detail.video_url ?? "";

    l._editStepsText = detail.steps_text ?? "";
    l._editIngredientsText = detail.ingredients_text ?? "";
    l._editPrepTimeMin = detail.prep_time_min ?? null;
    l._editCookTimeMin = detail.cook_time_min ?? null;
    l._editDifficulty = detail.difficulty ?? null;
    l._editShoppingList = detail.shopping_list ?? "";
    l._editAllergens = detail.allergens ?? "";
    l._editNutritionJson = detail.nutrition ? JSON.stringify(detail.nutrition, null, 2) : "";
  } catch (e: any) {
    alert(e?.message ?? "Greška.");
  } finally {
    l._loadingEdit = false;
  }
}

async function saveLesson(l: LessonSummary) {
  const title = (l._editTitle ?? "").trim();
  if (!title) return alert("Naziv ne smije biti prazan.");

  const type = (l._editType ?? l.type) as LessonType;
  const payload: any = { title, type };

  if (type === "video") {
    payload.video_url = (l._editVideoUrl ?? "").trim() || null;
    payload.content = null;
  } else if (type === "text") {
    payload.content = (l._editContent ?? "").trim() || null;
    payload.video_url = null;
  } else {
    payload.content = null;
    payload.video_url = null;
  }

  if (type === "video" || type === "recipe") {
    payload.ingredients_text = (l._editIngredientsText ?? "").trim() || null;
    payload.steps_text = (l._editStepsText ?? "").trim() || null;
    payload.prep_time_min = l._editPrepTimeMin ?? null;
    payload.cook_time_min = l._editCookTimeMin ?? null;
    payload.difficulty = l._editDifficulty ?? null;
    payload.shopping_list = (l._editShoppingList ?? "").trim() || null;
    payload.allergens = (l._editAllergens ?? "").trim() || null;

    const n = parseNutritionJson(l._editNutritionJson);
    if (n === "__INVALID__") return alert("Nutrition mora biti validan JSON.");
    payload.nutrition = n;
  }

  await api.saveLesson(l.lesson_id, payload);

  l.title = title;
  l.type = type;
  l._editing = false;

  emit("refresh");
}

async function addLesson(m: ModuleSummary) {
  const payload: any = {
    title: (m._newLesson.title ?? "").trim(),
    type: m._newLesson.type,
  };
  if (!payload.title) return alert("Naziv lekcije je obavezan.");

  if (payload.type === "video") {
    payload.video_url = (m._newLesson.video_url ?? "").trim();
    if (!payload.video_url) return alert("Video URL je obavezan.");
  }

  if (payload.type === "text") {
    payload.content = (m._newLesson.content ?? "").trim();
    if (!payload.content) return alert("Tekst lekcije je obavezan.");
  }

  if (payload.type === "video" || payload.type === "recipe") {
    payload.ingredients_text = (m._newLesson.ingredients_text ?? "").trim() || null;
    payload.steps_text = (m._newLesson.steps_text ?? "").trim() || null;
    payload.prep_time_min = m._newLesson.prep_time_min ?? null;
    payload.cook_time_min = m._newLesson.cook_time_min ?? null;
    payload.difficulty = m._newLesson.difficulty ?? null;
    payload.shopping_list = (m._newLesson.shopping_list ?? "").trim() || null;
    payload.allergens = (m._newLesson.allergens ?? "").trim() || null;

    const n = parseNutritionJson(m._newLesson.nutrition_json);
    if (n === "__INVALID__") return alert("Nutrition mora biti validan JSON.");
    payload.nutrition = n;
  }

  await api.addLesson(m.module_id, payload);

  // reset form
  m._newLesson = {
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
  };

  emit("refresh");
}
</script>

<style scoped>
.modules { margin-top: 26px; }
.section-title { font-size: 22px; margin: 0 0 12px; color: #302c27; }
.module-card { background-color: #e6dfc9; border-radius: 15px; padding: 15px; margin-bottom: 14px; }
.module-top { display: flex; gap: 12px; justify-content: space-between; align-items: flex-start; }
.module-title { margin: 0; color: #302c27; }
.mini { margin: 6px 0 0; font-size: 12px; opacity: 0.75; color: #302c27; }
.hint { margin: 10px 0 18px; color: #302c27; }

.module-edit { display: flex; gap: 10px; align-items: center; }

.lessons { margin-top: 12px; background-color: rgba(255, 255, 255, 0.45); padding: 12px; border-radius: 12px; }

.lesson-row { background: #fff; border-radius: 10px; padding: 10px; margin-top: 10px; border: 1px solid #e6dfc9; }
.lesson-left { display: flex; gap: 10px; align-items: flex-start; }
.lesson-index { width: 24px; font-weight: 700; color: #302c27; }
.lesson-title { font-weight: 600; color: #302c27; }
.lesson-meta { font-size: 12px; opacity: 0.75; color: #302c27; }

.lesson-actions { margin-top: 10px; display: flex; justify-content: flex-end; gap: 10px; }

.lesson-edit { margin-top: 10px; display: grid; gap: 12px; }
.recipe-edit { display: grid; gap: 10px; }

.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.actions-row { display: flex; justify-content: flex-end; gap: 10px; }

.inline-input {
  border: 1px solid #ccc;
  border-radius: 7px;
  padding: 0.7rem 0.9rem;
  width: 100%;
  background-color: #fffffd;
  font-family: inherit;
}
.select { cursor: pointer; }
.textarea {
  border: 1px solid #ccc;
  border-radius: 7px;
  padding: 0.9rem;
  width: 100%;
  background-color: #fffffd;
  font-family: inherit;
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
.btn:hover { background-color: #d7ceb8; }
.small { padding: 0.55rem 0.75rem; font-size: 0.9rem; }
.ghost { background-color: #fff; border: 1px solid #d9cfb4; }

@media (max-width: 720px) {
  .row2 { grid-template-columns: 1fr; }
}
</style>
