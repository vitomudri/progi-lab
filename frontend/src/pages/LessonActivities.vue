<template>
  <div class="activities" v-if="lessonId">
    <div class="activities-head">
      <h3 class="subhead" style="margin-top: 22px;">Aktivnosti</h3>
      <button class="btn small ghost" @click="reload" :disabled="loading">
        {{ loading ? "Učitavanje..." : "Osvježi" }}
      </button>
    </div>

    <div v-if="error" class="hint error">{{ error }}</div>

    <div v-if="!loading && activities.length === 0" class="mini">
      Nema aktivnosti za ovu lekciju.
    </div>

    <!-- INSTRUKTOR/ADMIN: DODAJ AKTIVNOST -->
    <div v-if="canManage" class="card inner-card">
      <h4 style="margin: 0 0 10px;">Dodaj aktivnost</h4>

      <form class="activity-form" @submit.prevent="create">
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
    <div v-for="a in activities" :key="a.activity_id" class="activity-card">
      <div class="activity-top">
        <div>
          <div class="lesson-title">{{ a.title }}</div>
          <div class="lesson-meta">
            Tip: <b>{{ a.type }}</b>
            <span v-if="a.is_required" class="req-pill">REQUIRED</span>
            <span v-if="a._submitted" class="done-pill">SUBMITTED</span>
          </div>
        </div>

        <!-- INSTRUKTOR/ADMIN -->
        <div v-if="canManage" class="activity-actions">
          <button class="btn small ghost" @click="toggleEdit(a)">
            {{ a._editing ? "Zatvori" : "Uredi" }}
          </button>
          <button class="btn small ghost" @click="loadSubs(a)" :disabled="a._subsLoading">
            {{ a._subsLoading ? "Učitavam..." : "Submissions" }}
          </button>
        </div>
      </div>

      <!-- STUDENT -->
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

        <!-- UPLOAD -->
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
            @click="submitUpload(a)"
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

      <!-- ADMIN EDIT -->
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
          <button class="btn small" @click="save(a)" :disabled="a._saving">
            {{ a._saving ? "Spremam..." : "Spremi aktivnost" }}
          </button>
        </div>

        <div v-if="a._saveMsg" class="mini">{{ a._saveMsg }}</div>
      </div>

      <!-- ADMIN SUBMISSIONS -->
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
            <button class="btn small" @click="review(s.submission_id, 'approved', a)">Approve</button>
            <button class="btn small ghost" @click="review(s.submission_id, 'rejected', a)">Reject</button>
          </div>
        </div>

        <div v-if="a._subsMsg" class="mini">{{ a._subsMsg }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { api, type ActivityType, type LessonActivity, type ActivitySubmission } from "@/services/courseApi";

const props = defineProps<{
  lessonId: number | null;
  canManage: boolean;
}>();

const loading = ref(false);
const error = ref<string | null>(null);

const activities = ref<LessonActivity[]>([]);

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

type UploadState = {
  file?: File;
  filename?: string;
  uploading?: boolean;
  file_id?: string;
};

const quizAnswers = reactive<Record<number, Record<string, number>>>({});
const uploadState = reactive<Record<number, UploadState>>({});

function safeParseJson(raw: string): any | "__INVALID__" {
  const t = (raw ?? "").trim();
  if (!t) return {};
  try {
    return JSON.parse(t);
  } catch {
    return "__INVALID__";
  }
}

/**
 * Pokušaj izvući HTTP status iz:
 * - Response objekta (fetch)
 * - errora koji api wrapper baci (npr. e.status ili e.response.status)
 */
function getStatusFromAny(x: any): number | null {
  if (!x) return null;
  if (typeof x.status === "number") return x.status;
  if (typeof x?.response?.status === "number") return x.response.status;
  return null;
}

/**
 * Wrapper za submit koji radi i ako api.submitActivity:
 * - vraća Response (fetch)
 * - vraća JSON
 * - baca error s statusom
 */
async function submitWith409Handling(
  a: LessonActivity,
  payload: { answer?: any; file_id?: string }
) {
  try {
    const res: any = await api.submitActivity(a.activity_id, payload);

    // Ako wrapper vraća Response:
    if (res && typeof res.ok === "boolean" && typeof res.status === "number") {
      if (!res.ok) {
        if (res.status === 409) {
          a._submitted = true;
          a._submitMsg = "Već poslano ✅";
          return { ok: true, already: true };
        }
        throw new Error("Neuspješno slanje.");
      }
      return { ok: true, already: false };
    }

    // Ako wrapper vraća JSON / nešto drugo i nije bacio error -> smatramo uspjeh
    return { ok: true, already: false };
  } catch (e: any) {
    const st = getStatusFromAny(e);
    if (st === 409) {
      a._submitted = true;
      a._submitMsg = "Već poslano ✅";
      return { ok: true, already: true };
    }
    throw e;
  }
}

async function load() {
  if (!props.lessonId) return;

  loading.value = true;
  error.value = null;

  try {
    const list = await api.getLessonActivities(props.lessonId);

    activities.value = list.map((a: any) => {
      const submitted = !!a.has_submitted;

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

    for (const a of activities.value) {
      if (!quizAnswers[a.activity_id]) quizAnswers[a.activity_id] = {};
      if (!uploadState[a.activity_id]) uploadState[a.activity_id] = {};
    }
  } catch (e: any) {
    error.value = e?.message ?? "Greška.";
  } finally {
    loading.value = false;
  }
}

async function reload() {
  await load();
}

async function create() {
  if (!props.lessonId) return;

  newActivityLoading.value = true;
  try {
    const payload = safeParseJson(newActivity.payload_json);
    if (payload === "__INVALID__") return alert("Payload mora biti validan JSON.");

    await api.createActivity(props.lessonId, {
      type: newActivity.type,
      title: newActivity.title.trim(),
      payload,
      is_required: !!newActivity.is_required,
    });

    newActivity.title = "";
    newActivity.is_required = false;
    await load();
  } catch (e: any) {
    alert(e?.message ?? "Greška.");
  } finally {
    newActivityLoading.value = false;
  }
}

function toggleEdit(a: LessonActivity) {
  a._editing = !a._editing;
  a._saveMsg = "";
  if (a._editing) {
    a._editTitle = a.title;
    a._editType = a.type;
    a._editRequired = a.is_required;
    a._editPayloadJson = JSON.stringify(a.payload ?? {}, null, 2);
  }
}

async function save(a: LessonActivity) {
  a._saving = true;
  a._saveMsg = "";
  try {
    const payload = safeParseJson(a._editPayloadJson ?? "");
    if (payload === "__INVALID__") return alert("Payload mora biti validan JSON.");

    const upd = await api.updateActivity(a.activity_id, {
      type: a._editType,
      title: (a._editTitle ?? "").trim(),
      is_required: !!a._editRequired,
      payload,
    });

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
    await submitWith409Handling(a, { answer });

    if (!a._submitted) a._submitted = true;
    if (!a._submitMsg) a._submitMsg = "Poslano ✅";

    // opcionalno: osvježi iz backenda da bude 1:1
    await load();
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

async function submitUpload(a: LessonActivity) {
  if (a._submitted) return;

  a._submitting = true;
  a._submitMsg = "";

  try {
    const st = uploadState[a.activity_id];
    if (!st?.file) return alert("Prvo odaberi sliku.");

    st.uploading = true;
    const file_id = await api.uploadFile(st.file);
    st.file_id = file_id;
    st.uploading = false;

    await submitWith409Handling(a, { file_id });

    if (!a._submitted) a._submitted = true;
    if (!a._submitMsg) a._submitMsg = "Poslano ✅";

    await load();
  } catch (e: any) {
    const st = uploadState[a.activity_id];
    if (st) st.uploading = false;
    a._submitMsg = e?.message ?? "Greška.";
  } finally {
    a._submitting = false;
  }
}

async function loadSubs(a: LessonActivity) {
  a._subsLoading = true;
  a._subsMsg = "";
  try {
    const rows = (await api.getSubmissions(a.activity_id)) as ActivitySubmission[];

    await Promise.all(
      rows.map(async (s) => {
        if (!s.file_id) {
          s._fileUrl = null;
          return;
        }
        try {
          s._fileUrl = await api.getFileUrl(s.file_id);
        } catch {
          s._fileUrl = null;
        }
      })
    );

    a._subs = rows;
    a._subsOpen = true;
  } catch (e: any) {
    a._subsMsg = e?.message ?? "Greška.";
  } finally {
    a._subsLoading = false;
  }
}

async function review(submissionId: number, status: "approved" | "rejected", a: LessonActivity) {
  a._subsMsg = "";
  try {
    await api.reviewSubmission(submissionId, status);
    await loadSubs(a);
    a._subsMsg = status === "approved" ? "Odobreno ✅" : "Odbijeno ✅";
  } catch (e: any) {
    a._subsMsg = e?.message ?? "Greška.";
  }
}

// auto load kad se promijeni lesson
watch(
  () => props.lessonId,
  async () => {
    activities.value = [];
    if (props.lessonId) await load();
  },
  { immediate: true }
);
</script>

<style scoped>
/* reused styles from tvoje stranice (samo aktivnosti dio) */
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
.subhead { margin: 16px 0 6px; color: #302c27; }
.mini { margin: 6px 0 0; font-size: 12px; opacity: 0.75; color: #302c27; }
.hint { margin: 10px 0 18px; color: #302c27; }
.error { color: #9b2c2c; }

.card {
  background-color: #fff;
  border: 1px solid #e6dfc9;
  border-radius: 15px;
  padding: 18px;
  margin-bottom: 20px;
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
.activity-actions { display: flex; gap: 10px; align-items: center; }

.lesson-title { font-weight: 600; color: #302c27; }
.lesson-meta {
  font-size: 12px;
  opacity: 0.75;
  color: #302c27;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
.activity-form { display: grid; gap: 12px; }
.checkline { display: flex; align-items: center; gap: 8px; }
.activity-student { margin-top: 12px; display: grid; gap: 12px; }
.quiz-wrap, .upload-wrap { display: grid; gap: 10px; }

.quiz-q {
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #e6dfc9;
  background: #fff;
}
.quiz-q-text { font-weight: 600; color: #302c27; }
.quiz-options { margin-top: 8px; display: grid; gap: 6px; }
.quiz-opt { display: flex; gap: 8px; align-items: center; font-size: 14px; color: #302c27; }

.lesson-edit { margin-top: 10px; display: grid; gap: 12px; }

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

/* submissions */
.submissions { margin-top: 12px; padding-top: 10px; border-top: 1px solid #e6dfc9; }
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
.submission-actions { display: flex; gap: 10px; align-items: flex-start; }
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
.file-preview { margin-top: 6px; display: grid; gap: 6px; }
.thumb {
  width: 160px;
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  border: 1px solid #e6dfc9;
  background: #fff;
}

@media (max-width: 720px) {
  .row2 { grid-template-columns: 1fr; }
}
</style>
