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

    <!-- OTVORENA LEKCIJA -->
    <section v-if="openedLesson" class="card">
      <div class="lesson-view-head">
        <h2 class="lesson-view-title">{{ openedLesson.title }}</h2>
        <button class="btn small ghost" @click="openedLesson = null">Zatvori</button>
      </div>

      <!-- VIDEO -->
      <div v-if="openedLesson.type === 'video'">
        <iframe
          v-if="embedUrl(openedLesson.video_url)"
          class="player"
          :src="embedUrl(openedLesson.video_url)!"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>

        <p v-else class="hint">
          Video link:
          <a :href="openedLesson.video_url ?? '#'" target="_blank" rel="noopener">Otvori u novom tabu</a>
        </p>

        <div class="meta-box">
          <div class="mini">
            Prep: <b>{{ openedLesson.prep_time_min ?? "—" }}</b> min ·
            Cook: <b>{{ openedLesson.cook_time_min ?? "—" }}</b> min ·
            Težina: <b>{{ openedLesson.difficulty ?? "—" }}</b>
          </div>

          <h3 class="subhead">Sastojci</h3>
          <p class="text-content">{{ openedLesson.ingredients_text || "—" }}</p>

          <h3 class="subhead">Koraci</h3>
          <p class="text-content">{{ openedLesson.steps_text || "—" }}</p>

          <h3 class="subhead">Shopping list</h3>
          <p class="text-content">{{ openedLesson.shopping_list || "—" }}</p>

          <h3 class="subhead">Alergeni</h3>
          <p class="text-content">{{ openedLesson.allergens || "—" }}</p>

          <h3 class="subhead">Nutrition</h3>

          <div v-if="nutritionRows(openedLesson.nutrition).length" class="nutri-card">
            <div class="nutri-grid">
              <div v-for="row in nutritionRows(openedLesson.nutrition)" :key="row.key" class="nutri-item">
                <div class="nutri-label">{{ row.label }}</div>
                <div class="nutri-value">{{ row.value }}</div>
              </div>
            </div>
          </div>
          <div v-else class="mini">—</div>
        </div>
      </div>

      <!-- TEXT -->
      <div v-else-if="openedLesson.type === 'text'">
        <p class="text-content">{{ openedLesson.content || "—" }}</p>
      </div>

      <!-- RECIPE -->
      <div v-else class="recipe-view">
        <div class="mini">
          Prep: <b>{{ openedLesson.prep_time_min ?? "—" }}</b> min ·
          Cook: <b>{{ openedLesson.cook_time_min ?? "—" }}</b> min ·
          Težina: <b>{{ openedLesson.difficulty ?? "—" }}</b>
        </div>

        <h3 class="subhead">Sastojci</h3>
        <p class="text-content">{{ openedLesson.ingredients_text || "—" }}</p>

        <h3 class="subhead">Koraci</h3>
        <p class="text-content">{{ openedLesson.steps_text || "—" }}</p>

        <h3 class="subhead">Shopping list</h3>
        <p class="text-content">{{ openedLesson.shopping_list || "—" }}</p>

        <h3 class="subhead">Alergeni</h3>
        <p class="text-content">{{ openedLesson.allergens || "—" }}</p>

        <h3 class="subhead">Nutrition</h3>
        <pre class="json">{{ openedLesson.nutrition ? JSON.stringify(openedLesson.nutrition, null, 2) : "—" }}</pre>
      </div>

      <!-- ========================= -->
      <!-- AKTIVNOSTI (QUIZ / UPLOAD) -->
      <!-- ========================= -->
      <div class="activities" v-if="openedLesson">
        <div class="activities-head">
          <h3 class="subhead" style="margin-top: 22px;">Aktivnosti</h3>
          <button class="btn small ghost" @click="reloadActivities" :disabled="activitiesLoading">
            {{ activitiesLoading ? "Učitavanje..." : "Osvježi" }}
          </button>
        </div>

        <div v-if="activitiesError" class="hint error">{{ activitiesError }}</div>

        <div v-if="!activitiesLoading && lessonActivities.length === 0" class="mini">
          Nema aktivnosti za ovu lekciju.
        </div>

        <!-- INSTRUKTOR/ADMIN: DODAJ AKTIVNOST -->
        <div v-if="canManage" class="card inner-card">
          <h4 style="margin: 0 0 10px;">Dodaj aktivnost</h4>

          <form class="activity-form" @submit.prevent="createActivity">
            <div class="row2">
              <select v-model="newActivity.type" class="inline-input select">
                <option value="quiz">quiz</option>
                <option value="photo_upload">photo_upload</option>
              </select>

              <input v-model="newActivity.title" class="inline-input" placeholder="Naslov aktivnosti" required />
            </div>

            <label class="mini checkline">
              <input type="checkbox" v-model="newActivity.is_required" />
              Obavezno
            </label>

            <textarea
              v-model="newActivity.payload_json"
              class="textarea"
              placeholder='Payload (JSON). Za quiz: { "questions": [ ... ] }'
            ></textarea>

            <div class="actions-row">
              <button class="btn" type="submit" :disabled="newActivityLoading">
                {{ newActivityLoading ? "Spremam..." : "Dodaj" }}
              </button>
            </div>
          </form>
        </div>

        <!-- LISTA AKTIVNOSTI -->
        <div v-for="a in lessonActivities" :key="a.activity_id" class="activity-card">
          <div class="activity-top">
            <div>
              <div class="lesson-title">{{ a.title }}</div>
              <div class="lesson-meta">
                Tip: <b>{{ a.type }}</b>
                <span v-if="a.is_required" class="req-pill">REQUIRED</span>
                <span v-if="a._submitted" class="done-pill">SUBMITTED</span>
              </div>
            </div>

            <!-- INSTRUKTOR/ADMIN: edit + submissions -->
            <div v-if="canManage" class="activity-actions">
              <button class="btn small ghost" @click="toggleActivityEdit(a)">
                {{ a._editing ? "Zatvori" : "Uredi" }}
              </button>
              <button class="btn small ghost" @click="loadSubmissions(a)" :disabled="a._subsLoading">
                {{ a._subsLoading ? "Učitavam..." : "Submissions" }}
              </button>
            </div>
          </div>

          <!-- STUDENT: RJEŠAVANJE -->
          <div v-if="!canManage" class="activity-student">
            <!-- QUIZ -->
            <div v-if="a.type === 'quiz'" class="quiz-wrap">
              <div v-if="(a.payload?.questions?.length ?? 0) === 0" class="mini">Nema pitanja.</div>

              <div v-for="q in (a.payload?.questions ?? [])" :key="q.id" class="quiz-q">
                <div class="quiz-q-text">{{ q.text }}</div>

                <div class="quiz-options">
                  <label v-for="(opt, idx) in (q.options ?? [])" :key="idx" class="quiz-opt">
                    <input
                      type="radio"
                      :name="`q_${a.activity_id}_${q.id}`"
                      :value="idx"
                      v-model.number="quizAnswers[a.activity_id][q.id]"
                      :disabled="a._submitted"
                    />
                    <span>{{ opt }}</span>
                  </label>
                </div>
              </div>

              <button class="btn small" @click="submitQuiz(a)" :disabled="a._submitting || a._submitted">
                {{ a._submitted ? "Već poslano ✅" : a._submitting ? "Šaljem..." : "Pošalji kviz" }}
              </button>

              <div v-if="a._submitMsg" class="mini">{{ a._submitMsg }}</div>
            </div>

            <!-- PHOTO UPLOAD -->
            <div v-else class="upload-wrap">
              <div class="mini">Odaberi sliku i pošalji.</div>

              <input
                class="inline-input"
                type="file"
                accept="image/*"
                @change="onPickUploadFile($event, a)"
                :disabled="a._submitted"
              />

              <div v-if="uploadState[a.activity_id]?.filename" class="mini">
                Odabrano: <b>{{ uploadState[a.activity_id].filename }}</b>
                <span v-if="uploadState[a.activity_id].file_id" style="opacity: .8;">
                  · file_id spremljen ✅
                </span>
              </div>

              <button
                class="btn small"
                @click="submitUploadAuto(a)"
                :disabled="a._submitting || uploadState[a.activity_id]?.uploading || a._submitted"
              >
                {{
                  a._submitted
                    ? "Već poslano ✅"
                    : uploadState[a.activity_id]?.uploading
                      ? "Uploadam..."
                      : a._submitting
                        ? "Šaljem..."
                        : "Pošalji upload"
                }}
              </button>

              <div v-if="a._submitMsg" class="mini">{{ a._submitMsg }}</div>
            </div>
          </div>

          <!-- INSTRUKTOR/ADMIN: UREĐIVANJE -->
          <div v-if="canManage && a._editing" class="lesson-edit">
            <div class="row2">
              <input v-model="a._editTitle" class="inline-input" placeholder="Naslov" />

              <select v-model="a._editType" class="inline-input select">
                <option value="quiz">quiz</option>
                <option value="photo_upload">photo_upload</option>
              </select>
            </div>

            <label class="mini checkline">
              <input type="checkbox" v-model="a._editRequired" />
              Obavezno
            </label>

            <textarea v-model="a._editPayloadJson" class="textarea" placeholder="Payload JSON"></textarea>

            <div class="actions-row">
              <button class="btn small" @click="saveActivity(a)" :disabled="a._saving">
                {{ a._saving ? "Spremam..." : "Spremi aktivnost" }}
              </button>
            </div>

            <div v-if="a._saveMsg" class="mini">{{ a._saveMsg }}</div>
          </div>

          <!-- INSTRUKTOR/ADMIN: SUBMISSIONS -->
          <div v-if="canManage && a._subsOpen" class="submissions">
            <h4 style="margin: 10px 0 6px;">Submissions</h4>

            <div v-if="(a._subs?.length ?? 0) === 0" class="mini">Nema submissiona.</div>

            <div v-for="s in (a._subs ?? [])" :key="s.submission_id" class="submission-row">
              <div>
                <div class="mini"><b>{{ s.student_id }}</b></div>
                <div class="mini">Status: <b>{{ s.status }}</b></div>
                <div v-if="s.file_id" class="mini">
  <div v-if="s._fileUrl" class="file-preview">
    <a :href="s._fileUrl" target="_blank" rel="noopener">
      <img :src="s._fileUrl" alt="Upload" class="thumb" />
    </a>
    <div class="mini" style="margin-top: 6px; opacity:.8;">Klikni za otvoriti u novom tabu</div>
  </div>

  <div v-else>
    File: <code>{{ s.file_id }}</code> (URL nije dostupan)
  </div>
</div>

                <div v-if="s.answer" class="mini">
                  answer:
                  <pre class="code-mini">{{ JSON.stringify(s.answer, null, 2) }}</pre>
                </div>
              </div>

              <div class="submission-actions">
                <button class="btn small" @click="reviewSubmission(s.submission_id, 'approved', a)">Approve</button>
                <button class="btn small ghost" @click="reviewSubmission(s.submission_id, 'rejected', a)">Reject</button>
              </div>
            </div>

            <div v-if="a._subsMsg" class="mini">{{ a._subsMsg }}</div>
          </div>
        </div>
      </div>
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

    <!-- MODULES -->
    <section class="modules">
      <h2 class="section-title">Moduli</h2>

      <div v-if="modules.length === 0 && !loading" class="hint">Nema modula još.</div>

      <div v-for="m in modules" :key="m.module_id" class="module-card">
        <div class="module-top">
          <div>
            <h3 class="module-title">{{ m.order_index }}. {{ m.title }}</h3>
            <p class="mini">Module ID: {{ m.module_id }}</p>
          </div>

          <div v-if="canManage" class="module-edit">
            <input class="inline-input" v-model="m._editTitle" />
            <button class="btn small" @click="saveModuleTitle(m)">Spremi</button>
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
              <button class="btn small" @click="openLesson(l.lesson_id)">Otvori</button>

              <button
                v-if="canManage"
                class="btn small ghost"
                @click="toggleLessonEdit(l)"
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

              <!-- METADATA (ZA VIDEO + RECIPE) -->
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
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, reactive } from "vue";
import { useRoute } from "vue-router";

type Role = "student" | "instructor" | "admin" | null;

type Course = {
  course_id: number;
  title: string;
  description: string | null;
  instructor_id: string | null;
  is_published: boolean;
};

type LessonType = "video" | "text" | "recipe";
type LessonDifficulty = "easy" | "medium" | "hard";
type Nutrition = Record<string, any>;

type LessonSummary = {
  lesson_id: number;
  module_id: number;
  title: string;
  order_index: number;
  type: LessonType;

  _editing?: boolean;
  _loadingEdit?: boolean;

  _editTitle?: string;
  _editType?: LessonType;
  _editContent?: string;
  _editVideoUrl?: string;

  _editStepsText?: string;
  _editIngredientsText?: string;
  _editPrepTimeMin?: number | null;
  _editCookTimeMin?: number | null;
  _editDifficulty?: LessonDifficulty | null;
  _editShoppingList?: string;
  _editAllergens?: string;
  _editNutritionJson?: string;
};

type ModuleSummary = {
  module_id: number;
  course_id: number;
  title: string;
  order_index: number;
  lessons: LessonSummary[];
  _editTitle?: string;
  _newLesson: {
    title: string;
    type: LessonType;

    content?: string;
    video_url?: string;

    steps_text?: string;
    ingredients_text?: string;
    prep_time_min?: number | null;
    cook_time_min?: number | null;
    difficulty?: LessonDifficulty | null;
    shopping_list?: string;
    allergens?: string;
    nutrition_json?: string;
  };
};

type LessonDetail = {
  lesson_id: number;
  module_id: number;
  title: string;
  order_index: number;
  type: LessonType;

  content: string | null;
  video_url: string | null;

  steps_text: string | null;
  ingredients_text: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  difficulty: LessonDifficulty | null;
  shopping_list: string | null;
  allergens: string | null;
  nutrition: Nutrition | null;
};

type ActivityType = "quiz" | "photo_upload";

type ActivitySubmissionStatus = "submitted" | "approved" | "rejected";
type ActivitySubmission = {
  submission_id: number;
  activity_id: number;
  student_id: string;
  answer: any;
  file_id: string | null;
  status: ActivitySubmissionStatus;
  created_at: string;
  _fileUrl?: string | null;
};

type LessonActivity = {
  activity_id: number;
  lesson_id: number;
  type: ActivityType;
  title: string;
  payload: any;
  is_required: boolean;

  _editing?: boolean;
  _saving?: boolean;
  _saveMsg?: string;

  _editTitle?: string;
  _editType?: ActivityType;
  _editRequired?: boolean;
  _editPayloadJson?: string;

  _submitting?: boolean;
  _submitMsg?: string;

  _submitted?: boolean; // ✅ nakon slanja zaključaj

  _subsOpen?: boolean;
  _subsLoading?: boolean;
  _subsMsg?: string;
  _subs?: ActivitySubmission[];
};

type UploadState = {
  file?: File;
  filename?: string;
  uploading?: boolean;
  file_id?: string;
};

const openedLesson = ref<LessonDetail | null>(null);

const route = useRoute();
const courseId = computed(() => Number(route.params.id));

const role = ref<Role>(null);
const canManage = computed(() => role.value === "instructor" || role.value === "admin");

const loading = ref(false);
const error = ref<string | null>(null);

const course = ref<Course | null>(null);
const modules = ref<ModuleSummary[]>([]);
const newModuleTitle = ref("");

const lessonActivities = ref<LessonActivity[]>([]);
const activitiesLoading = ref(false);
const activitiesError = ref<string | null>(null);

const newActivity = reactive({
  type: "quiz" as ActivityType,
  title: "",
  is_required: false,
  payload_json: `{
  "questions": [
    { "id": "q1", "text": "Pitanje?", "type": "single", "options": ["A", "B", "C"] }
  ]
}`,
});
const newActivityLoading = ref(false);

// student inputs
const quizAnswers = reactive<Record<number, Record<string, number>>>({});
const uploadState = reactive<Record<number, UploadState>>({});

// --------------------
// helpers (submission lock)
// --------------------
const submittedKey = (activity_id: number) => `cc_submitted_${activity_id}`;

function isMarkedSubmitted(activity_id: number) {
  return localStorage.getItem(submittedKey(activity_id)) === "1";
}
function markSubmitted(activity_id: number) {
  localStorage.setItem(submittedKey(activity_id), "1");
}

// --------------------
// video embed
// --------------------
function embedUrl(url: string | null): string | null {
  if (!url) return null;

  const yt =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/) ??
    url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/);
  if (yt?.[1]) return `https://www.youtube.com/embed/${yt[1]}`;

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo?.[1]) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return null;
}

// nutrition pretty
type NutritionRow = { key: string; label: string; value: string };
function prettyKey(k: string) {
  return k.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function nutritionRows(n: any): NutritionRow[] {
  if (!n || typeof n !== "object") return [];
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (n[k] !== undefined && n[k] !== null && n[k] !== "") return n[k];
    }
    return undefined;
  };

  const serving = get("serving_size", "serving-size", "portion", "serving");
  const kcal = get("kcal", "calories");
  const protein = get("protein_g", "protein-g", "protein");
  const carbs = get("carbs_g", "carbs-g", "carbs", "carbohydrates_g");
  const fat = get("fat_g", "fat-g", "fat");
  const fiber = get("fiber_g", "fiber-g", "fiber");
  const sugar = get("sugar_g", "sugar-g", "sugar");
  const salt = get("salt_g", "salt-g", "salt", "sodium_g");

  const rows: NutritionRow[] = [];
  const add = (key: string, label: string, v: any, unit?: string) => {
    if (v === undefined || v === null || v === "") return;
    rows.push({ key, label, value: `${v}${unit ? " " + unit : ""}` });
  };

  add("serving", "Porcija", serving);
  add("kcal", "Kalorije", kcal, "kcal");
  add("protein", "Protein", protein, "g");
  add("carbs", "Ugljikohidrati", carbs, "g");
  add("fat", "Masti", fat, "g");
  add("fiber", "Vlakna", fiber, "g");
  add("sugar", "Šećer", sugar, "g");
  add("salt", "Sol", salt, "g");

  const known = new Set([
    "serving_size","serving-size","portion","serving",
    "kcal","calories",
    "protein_g","protein-g","protein",
    "carbs_g","carbs-g","carbs","carbohydrates_g",
    "fat_g","fat-g","fat",
    "fiber_g","fiber-g","fiber",
    "sugar_g","sugar-g","sugar",
    "salt_g","salt-g","salt","sodium_g",
  ]);

  for (const [k, v] of Object.entries(n)) {
    if (known.has(k)) continue;
    if (v === undefined || v === null || v === "") continue;
    add(`extra_${k}`, prettyKey(k), v);
  }

  return rows;
}

// --------------------
// API helpers
// --------------------
async function fetchLessonDetail(lessonId: number): Promise<LessonDetail> {
  const res = await fetch(`/api/v1/lessons/${lessonId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Ne mogu dohvatiti lekciju.");
  const data = await res.json();
  return data.lesson as LessonDetail;
}

async function openLesson(lessonId: number) {
  try {
    openedLesson.value = await fetchLessonDetail(lessonId);
    await loadLessonActivities(lessonId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e: any) {
    alert(e?.message ?? "Greška.");
  }
}

async function loadRole() {
  try {
    const res = await fetch("/api/v1/profile/me", { credentials: "include" });
    if (!res.ok) {
      role.value = null;
      return;
    }
    const data = await res.json();
    role.value =
      data?.content?.role ??
      data?.content?.user?.role ??
      data?.role ??
      data?.user?.role ??
      null;
  } catch {
    role.value = null;
  }
}

async function loadAll() {
  loading.value = true;
  error.value = null;

  try {
    const cRes = await fetch(`/api/v1/courses/${courseId.value}`, { credentials: "include" });
    if (!cRes.ok) throw new Error("Ne mogu dohvatiti tečaj (možda nije objavljen ili nemaš prava).");
    const cData = await cRes.json();
    course.value = cData.course;

    const mRes = await fetch(`/api/v1/courses/${courseId.value}/modules`, { credentials: "include" });
    if (!mRes.ok) throw new Error("Ne mogu dohvatiti module.");
    const mData = await mRes.json();

    const baseModules: Omit<ModuleSummary, "lessons" | "_newLesson">[] = (mData.modules ?? []).map((m: any) => ({
      module_id: m.module_id,
      course_id: m.course_id,
      title: m.title,
      order_index: m.order_index,
      _editTitle: m.title,
    }));

    const withLessons: ModuleSummary[] = await Promise.all(
      baseModules.map(async (m) => {
        const lRes = await fetch(`/api/v1/modules/${m.module_id}/lessons`, { credentials: "include" });
        const lData = lRes.ok ? await lRes.json() : { lessons: [] };

        const lessons: LessonSummary[] = (lData.lessons ?? []).map((l: any) => ({
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

async function publishCourse() {
  if (!course.value) return;
  const res = await fetch(`/api/v1/courses/${course.value.course_id}/publish`, {
    method: "POST",
    credentials: "include",
  });
  if (res.ok) course.value.is_published = true;
  else alert("Neuspješno publishanje.");
}

async function unpublishCourse() {
  if (!course.value) return;
  const res = await fetch(`/api/v1/courses/${course.value.course_id}/unpublish`, {
    method: "POST",
    credentials: "include",
  });
  if (res.ok) course.value.is_published = false;
  else alert("Neuspješno unpublishanje.");
}

async function addModule() {
  if (!newModuleTitle.value.trim()) return;

  const res = await fetch(`/api/v1/courses/${courseId.value}/modules`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: newModuleTitle.value.trim() }),
  });

  if (!res.ok) {
    alert("Neuspješno dodavanje modula.");
    return;
  }

  newModuleTitle.value = "";
  await loadAll();
}

async function saveModuleTitle(m: ModuleSummary) {
  const title = (m._editTitle ?? "").trim();
  if (!title) return alert("Naziv ne smije biti prazan.");

  const res = await fetch(`/api/v1/modules/${m.module_id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) return alert("Neuspješno spremanje modula.");
  m.title = title;
}

function parseNutritionJson(raw: string | undefined) {
  const txt = (raw ?? "").trim();
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return "__INVALID__";
  }
}

async function addLesson(m: ModuleSummary) {
  const payload: any = { title: m._newLesson.title.trim(), type: m._newLesson.type };
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

  const res = await fetch(`/api/v1/modules/${m.module_id}/lessons`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return alert("Neuspješno dodavanje lekcije.");

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

  await loadAll();
}

async function toggleLessonEdit(l: LessonSummary) {
  if (l._editing) {
    l._editing = false;
    return;
  }

  l._loadingEdit = true;
  try {
    const detail = await fetchLessonDetail(l.lesson_id);

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

  const res = await fetch(`/api/v1/lessons/${l.lesson_id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return alert("Neuspješno spremanje lekcije.");

  l.title = title;
  l.type = type;
  l._editing = false;

  if (openedLesson.value?.lesson_id === l.lesson_id) {
    try {
      openedLesson.value = await fetchLessonDetail(l.lesson_id);
    } catch {}
  }

  await loadAll();
}

function safeParseJson(raw: string): any | "__INVALID__" {
  const t = (raw ?? "").trim();
  if (!t) return {};
  try {
    return JSON.parse(t);
  } catch {
    return "__INVALID__";
  }
}

// --------------------
// activities
// --------------------
async function loadLessonActivities(lessonId: number) {
  activitiesLoading.value = true;
  activitiesError.value = null;

  try {
    const res = await fetch(`/api/v1/lessons/activities/${lessonId}`, { credentials: "include" });
    if (!res.ok) throw new Error("Ne mogu dohvatiti aktivnosti.");
    const data = await res.json();

    lessonActivities.value = (data.activities ?? []).map((a: any) => {
      const submitted = isMarkedSubmitted(a.activity_id);

      return {
        activity_id: a.activity_id,
        lesson_id: a.lesson_id,
        type: a.type,
        title: a.title,
        payload: a.payload ?? {},
        is_required: !!a.is_required,

        _editing: false,
        _saving: false,
        _saveMsg: "",

        _editTitle: a.title,
        _editType: a.type,
        _editRequired: !!a.is_required,
        _editPayloadJson: JSON.stringify(a.payload ?? {}, null, 2),

        _submitting: false,
        _submitMsg: "",

        _submitted: submitted,

        _subsOpen: false,
        _subsLoading: false,
        _subsMsg: "",
        _subs: [],
      } as LessonActivity;
    });

    for (const a of lessonActivities.value) {
      if (!quizAnswers[a.activity_id]) quizAnswers[a.activity_id] = {};
      if (!uploadState[a.activity_id]) uploadState[a.activity_id] = {};
    }
  } catch (e: any) {
    activitiesError.value = e?.message ?? "Greška.";
  } finally {
    activitiesLoading.value = false;
  }
}

async function reloadActivities() {
  if (!openedLesson.value) return;
  await loadLessonActivities(openedLesson.value.lesson_id);
}

async function createActivity() {
  if (!openedLesson.value) return;

  newActivityLoading.value = true;
  try {
    const payload = safeParseJson(newActivity.payload_json);
    if (payload === "__INVALID__") return alert("Payload mora biti validan JSON.");

    const res = await fetch(`/api/v1/lessons/activities/${openedLesson.value.lesson_id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: newActivity.type,
        title: newActivity.title.trim(),
        payload,
        is_required: !!newActivity.is_required,
      }),
    });

    if (!res.ok) {
      let msg = "Neuspješno dodavanje aktivnosti.";
      try {
        const err = await res.json();
        msg = err?.error ?? msg;
      } catch {}
      throw new Error(msg);
    }

    newActivity.title = "";
    newActivity.is_required = false;
    await loadLessonActivities(openedLesson.value.lesson_id);
  } catch (e: any) {
    alert(e?.message ?? "Greška.");
  } finally {
    newActivityLoading.value = false;
  }
}

function toggleActivityEdit(a: LessonActivity) {
  a._editing = !a._editing;
  a._saveMsg = "";
  if (a._editing) {
    a._editTitle = a.title;
    a._editType = a.type;
    a._editRequired = a.is_required;
    a._editPayloadJson = JSON.stringify(a.payload ?? {}, null, 2);
  }
}

async function saveActivity(a: LessonActivity) {
  a._saving = true;
  a._saveMsg = "";
  try {
    const payload = safeParseJson(a._editPayloadJson ?? "");
    if (payload === "__INVALID__") return alert("Payload mora biti validan JSON.");

    const res = await fetch(`/api/v1/lessons/activities/${a.activity_id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: a._editType,
        title: (a._editTitle ?? "").trim(),
        is_required: !!a._editRequired,
        payload,
      }),
    });

    if (!res.ok) throw new Error("Neuspješno spremanje aktivnosti.");

    const data = await res.json();
    const upd = data.activity;

    a.title = upd.title;
    a.type = upd.type;
    a.is_required = !!upd.is_required;
    a.payload = upd.payload ?? {};
    a._editing = false;
    a._saveMsg = "Spremljeno ✅";
  } catch (e: any) {
    a._saveMsg = e?.message ?? "Greška.";
  } finally {
    a._saving = false;
  }
}

async function submitQuiz(a: LessonActivity) {
  if (a._submitted) return;

  a._submitting = true;
  a._submitMsg = "";
  try {
    const answer = quizAnswers[a.activity_id] ?? {};
    const res = await fetch(`/api/v1/lessons/activities/${a.activity_id}/submit`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });

    if (!res.ok) throw new Error("Neuspješno slanje kviza.");

    a._submitted = true;
    markSubmitted(a.activity_id);
    a._submitMsg = "Poslano ✅";
  } catch (e: any) {
    a._submitMsg = e?.message ?? "Greška.";
  } finally {
    a._submitting = false;
  }
}

function onPickUploadFile(ev: Event, a: LessonActivity) {
  if (a._submitted) return;

  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  uploadState[a.activity_id] = {
    file,
    filename: file.name,
    uploading: false,
    file_id: undefined,
  };
}

async function submitUploadAuto(a: LessonActivity) {
  if (a._submitted) return;

  a._submitting = true;
  a._submitMsg = "";

  try {
    const st = uploadState[a.activity_id];
    if (!st?.file) return alert("Prvo odaberi sliku.");

    st.uploading = true;

    const fd = new FormData();
    fd.append("file", st.file);

    const upRes = await fetch("/api/v1/files", {
      method: "POST",
      credentials: "include",
      body: fd,
    });

    if (!upRes.ok) throw new Error("Upload nije uspio.");
    const upData = await upRes.json();

    const file_id = upData.file_id as string;
    if (!file_id) throw new Error("Upload nije vratio file_id.");

    st.file_id = file_id;
    st.uploading = false;

    const subRes = await fetch(`/api/v1/lessons/activities/${a.activity_id}/submit`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id }),
    });

    if (!subRes.ok) throw new Error("Neuspješno slanje uploada.");

    a._submitted = true;
    markSubmitted(a.activity_id);
    a._submitMsg = "Poslano ✅";
  } catch (e: any) {
    const st = uploadState[a.activity_id];
    if (st) st.uploading = false;
    a._submitMsg = e?.message ?? "Greška.";
  } finally {
    a._submitting = false;
  }
}

// --------------------
// instructor submissions
// --------------------
async function loadSubmissions(a: LessonActivity) {
  a._subsLoading = true;
  a._subsMsg = "";
  try {
    const res = await fetch(`/api/v1/lessons/activities/${a.activity_id}/submissions`, { credentials: "include" });
    if (!res.ok) throw new Error("Ne mogu dohvatiti submissions.");
    const data = await res.json();
const subs = (data.submissions ?? []) as ActivitySubmission[];

// za svaki file_id dohvatimo signed URL
await Promise.all(
  subs.map(async (s) => {
    if (!s.file_id) {
      s._fileUrl = null;
      return;
    }
    try {
      const uRes = await fetch(`/api/v1/files/${s.file_id}/url`, { credentials: "include" });
      if (!uRes.ok) {
        s._fileUrl = null;
        return;
      }
      const uData = await uRes.json();
      s._fileUrl = uData?.url ?? null;
    } catch {
      s._fileUrl = null;
    }
  })
);

a._subs = subs;
a._subsOpen = true;

  } catch (e: any) {
    a._subsMsg = e?.message ?? "Greška.";
  } finally {
    a._subsLoading = false;
  }
}

async function reviewSubmission(submission_id: number, status: "approved" | "rejected", a: LessonActivity) {
  a._subsMsg = "";
  try {
    const res = await fetch(`/api/v1/lessons/submissions/${submission_id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Neuspješno ažuriranje statusa.");
    await loadSubmissions(a);
    a._subsMsg = status === "approved" ? "Odobreno ✅" : "Odbijeno ✅";
  } catch (e: any) {
    a._subsMsg = e?.message ?? "Greška.";
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

.modules {
  margin-top: 26px;
}

.section-title {
  font-size: 22px;
  margin: 0 0 12px;
  color: #302c27;
}

.module-card {
  background-color: #e6dfc9;
  border-radius: 15px;
  padding: 15px;
  margin-bottom: 14px;
}

.module-top {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: flex-start;
}

.module-title {
  margin: 0;
  color: #302c27;
}

.mini {
  margin: 6px 0 0;
  font-size: 12px;
  opacity: 0.75;
  color: #302c27;
}

.module-edit {
  display: flex;
  gap: 10px;
  align-items: center;
}

.lessons {
  margin-top: 12px;
  background-color: rgba(255, 255, 255, 0.45);
  padding: 12px;
  border-radius: 12px;
}

.lesson-row {
  background: #fff;
  border-radius: 10px;
  padding: 10px;
  margin-top: 10px;
  border: 1px solid #e6dfc9;
}

.lesson-left {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.lesson-index {
  width: 24px;
  font-weight: 700;
  color: #302c27;
}

.lesson-title {
  font-weight: 600;
  color: #302c27;
}

.lesson-meta {
  font-size: 12px;
  opacity: 0.75;
  color: #302c27;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.lesson-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.lesson-edit {
  margin-top: 10px;
  display: grid;
  gap: 12px;
}

.add-lesson {
  margin-top: 16px;
}

.inline-input {
  border: 1px solid #ccc;
  border-radius: 7px;
  padding: 0.7rem 0.9rem;
  width: 100%;
  background-color: #fffffd;
  font-family: inherit;
}

.select {
  cursor: pointer;
}

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

.hint {
  margin: 10px 0 18px;
  color: #302c27;
}

.error {
  color: #9b2c2c;
}

/* header */
.lesson-view-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.lesson-view-title {
  margin: 0;
  color: #302c27;
}

/* player */
.player {
  width: 100%;
  height: 360px;
  border-radius: 12px;
  border: 1px solid #e6dfc9;
  margin-top: 10px;
}

.text-content {
  white-space: pre-wrap;
  color: #302c27;
  margin: 10px 0 0;
}

.subhead {
  margin: 16px 0 6px;
  color: #302c27;
}

.json {
  margin: 10px 0 0;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #e6dfc9;
  background: #fffffd;
  white-space: pre-wrap;
  overflow: auto;
  color: #302c27;
}

.meta-box {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e6dfc9;
}

.nutri-card {
  margin-top: 10px;
  border: 1px solid #e6dfc9;
  background: #fffffd;
  border-radius: 12px;
  padding: 12px;
}

.nutri-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.nutri-item {
  border: 1px solid #e6dfc9;
  background: #fff;
  border-radius: 10px;
  padding: 10px;
}

.nutri-label {
  font-size: 12px;
  opacity: 0.75;
  color: #302c27;
}

.nutri-value {
  margin-top: 4px;
  font-weight: 700;
  color: #302c27;
}

/* Activities */
.activities {
  margin-top: 18px;
  border-top: 1px solid #e6dfc9;
  padding-top: 14px;
}

.activities-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.inner-card {
  margin-top: 14px;
  background: rgba(255, 255, 255, 0.65);
}

.activity-card {
  margin-top: 12px;
  border: 1px solid #e6dfc9;
  background: rgba(255, 255, 255, 0.65);
  border-radius: 12px;
  padding: 12px;
}

.activity-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.activity-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.req-pill {
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #fff6df;
  border: 1px solid #d9cfb4;
}

.done-pill {
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #e7ffe8;
  border: 1px solid #bde2bf;
}

.activity-form {
  display: grid;
  gap: 12px;
}

.checkline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-student {
  margin-top: 12px;
  display: grid;
  gap: 12px;
}

.quiz-wrap,
.upload-wrap {
  display: grid;
  gap: 10px;
}

.quiz-q {
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #e6dfc9;
  background: #fff;
}

.quiz-q-text {
  font-weight: 600;
  color: #302c27;
}

.quiz-options {
  margin-top: 8px;
  display: grid;
  gap: 6px;
}

.quiz-opt {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  color: #302c27;
}

/* rows */
.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}

/* instructor submissions */
.submissions {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #e6dfc9;
}

.submission-row {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  background: #fff;
  border: 1px solid #e6dfc9;
  border-radius: 10px;
  padding: 10px;
}

.submission-actions {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.code-mini {
  margin: 6px 0 0;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #e6dfc9;
  background: #fffffd;
  white-space: pre-wrap;
  overflow: auto;
  color: #302c27;
}

/* mobile */
@media (max-width: 720px) {
  .row2 {
    grid-template-columns: 1fr;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
}
.file-preview {
  margin-top: 6px;
  display: grid;
  gap: 6px;
}

.thumb {
  width: 160px;
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  border: 1px solid #e6dfc9;
  background: #fff;
}

</style>
