<template>
  <section class="reviews card">
    <div class="top">
      <h2 class="h">Recenzije</h2>

      <div class="summary" v-if="summary">
        <span class="avg">⭐ <b>{{ Number(summary.average).toFixed(2) }}</b></span>
        <span class="count">({{ summary.count }} recenzija)</span>
      </div>
    </div>

    <div v-if="loading" class="hint">Učitavanje recenzija...</div>
    <div v-else-if="error" class="hint error">{{ error }}</div>

    <!-- Forma: samo student -->
    <div v-if="canReview" class="form">
      <h3 class="form-title">Dodaj recenziju</h3>

      <div class="stars">
        <button
          v-for="n in 5"
          :key="n"
          type="button"
          class="star"
          :class="{ active: form.rating >= n }"
          @click="form.rating = n"
        >
          ★
        </button>
        <span class="star-text">{{ form.rating }}/5</span>
      </div>

      <textarea
        v-model="form.comment"
        class="textarea"
        placeholder="Komentar (opcionalno)"
        maxlength="5000"
      />

      <div class="row">
        <input type="file" accept="image/*" @change="onPickFile" />
        <button class="btn" type="button" :disabled="submitting" @click="submitReview">
          {{ submitting ? "Slanje..." : "Pošalji" }}
        </button>
      </div>

      <p class="smallhint" v-if="pickedFile">
        Odabrana slika: <b>{{ pickedFile.name }}</b>
      </p>
    </div>

    <!-- Lista -->
    <div v-if="reviews.length" class="list">
      <div v-for="r in reviews" :key="r.review_id" class="review">
        <div class="head">
          <div class="who">
            <b>{{ r.first_name }} {{ r.last_name }}</b>
            <span class="time">• {{ formatDate(r.created_at) }}</span>
          </div>
          <div class="rating">⭐ {{ r.rating }}/5</div>
        </div>

        <p v-if="r.comment" class="comment">{{ r.comment }}</p>

        <div v-if="r.photo_url" class="photo">
          <img :src="r.photo_url" alt="Fotografija uz recenziju" />
        </div>

        <div class="actions">
          <button class="btn small ghost" @click.prevent="toggleHelpful(r)" :disabled="!isLoggedIn">
            👍 Korisno ({{ r.helpful_count }})
          </button>
        </div>
      </div>
    </div>

    <p v-else-if="!loading && !error" class="hint">Još nema recenzija.</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

type Review = {
  review_id: number;
  user_id: string;
  first_name: string;
  last_name: string;
  rating: number;
  comment: string | null;
  photo_file_id: string | null;
  status: "approved" | "removed";
  created_at: string;
  helpful_count: number;
  i_marked_helpful: boolean;
  photo_url?: string | null;
};

type Summary = { count: number; average: string | number };

const props = defineProps<{
  objectType: "lesson" | "course" | "instructor";
  objectId: string;
  role: "student" | "instructor" | "admin" | null;
}>();

const canReview = computed(() => props.role === "student");
const isLoggedIn = computed(() => props.role !== null);

const loading = ref(false);
const error = ref<string | null>(null);

const summary = ref<Summary | null>(null);
const reviews = ref<Review[]>([]);

const submitting = ref(false);
const pickedFile = ref<File | null>(null);

const form = ref({
  rating: 5,
  comment: ""
});

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("hr-HR");
  } catch {
    return "";
  }
}

function onPickFile(e: Event) {
  const input = e.target as HTMLInputElement;
  pickedFile.value = input.files?.[0] ?? null;
}

/**
 * Upload slike preko tvog POST /api/v1/files (ako ga koristiš).
 * Ako ne želiš fotke još, možeš cijelu ovu funkciju ostaviti,
 * samo nećeš birati file.
 */
async function uploadPhotoIfAny(): Promise<string | null> {
  if (!pickedFile.value) return null;

  const fd = new FormData();
  fd.append("file", pickedFile.value);

  const res = await fetch("/api/v1/files", {
    method: "POST",
    credentials: "include",
    body: fd
  });

  if (!res.ok) throw new Error("Neuspješan upload slike.");
  const data = await res.json();

  // pokušaj pogoditi shape odgovora
  const fileId =
    data?.file?.file_id ??
    data?.content?.file?.file_id ??
    data?.file_id ??
    data?.content?.file_id ??
    null;

  if (!fileId) throw new Error("Upload je prošao, ali nisam dobila file_id.");
  return fileId;
}

/**
 * Prikaz slike: očekuje endpoint GET /api/v1/files/:id/url -> { url }
 * Ako ga nemaš još, samo neće prikazivati slike (sve ostalo radi).
 */
async function resolvePhotoUrl(fileId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/v1/files/${fileId}/url`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.url ?? data?.content?.url ?? null;
  } catch {
    return null;
  }
}

async function loadReviews() {
  loading.value = true;
  error.value = null;

  try {
    const url = `/api/v1/reviews?object_type=${encodeURIComponent(props.objectType)}&object_id=${encodeURIComponent(props.objectId)}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Ne mogu dohvatiti recenzije.");

    const data = await res.json();
    summary.value = data.summary ?? null;
    const list: Review[] = data.reviews ?? [];

    const withUrls: Review[] = await Promise.all(
      list.map(async (r) => {
        if (!r.photo_file_id) return { ...r, photo_url: null };
        const photo_url = await resolvePhotoUrl(r.photo_file_id);
        return { ...r, photo_url };
      })
    );

    reviews.value = withUrls;
  } catch (e: any) {
    error.value = e?.message ?? "Greška kod dohvaćanja recenzija.";
  } finally {
    loading.value = false;
  }
}

async function submitReview() {
  if (submitting.value) return;

  submitting.value = true;
  try {
    const photo_file_id = await uploadPhotoIfAny();

    const res = await fetch("/api/v1/reviews", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        object_type: props.objectType,
        object_id: props.objectId,
        rating: form.value.rating,
        comment: form.value.comment?.trim() || null,
        photo_file_id
      })
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "Neuspješno slanje recenzije.");
    }

    // reset
    form.value.comment = "";
    form.value.rating = 5;
    pickedFile.value = null;

    await loadReviews();
  } catch (e: any) {
    alert(e?.message ?? "Greška.");
  } finally {
    submitting.value = false;
  }
}

async function toggleHelpful(r: Review) {
  if (!isLoggedIn.value) return alert("Moraš biti prijavljena za ovu akciju.");

  try {
    const res = await fetch(`/api/v1/reviews/${r.review_id}/helpful`, {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Neuspješno označavanje kao korisno.");

    await loadReviews(); // refresha count + sort
  } catch (e: any) {
    alert(e?.message ?? "Greška.");
  }
}

watch(() => [props.objectType, props.objectId], loadReviews);
onMounted(loadReviews);
</script>

<style scoped>
.card {
  background-color: #fff;
  border: 1px solid #e6dfc9;
  border-radius: 15px;
  padding: 18px;
  margin-bottom: 20px;
}

.top { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
.h { margin: 0; color: #302c27; }
.summary { display: flex; gap: 8px; align-items: baseline; color: #302c27; }
.count { opacity: 0.8; }

.hint { margin: 10px 0 18px; color: #302c27; }
.error { color: #9b2c2c; }

.form { margin-top: 10px; padding-top: 10px; border-top: 1px solid #efe7d3; }
.form-title { margin: 0 0 10px; color: #302c27; }

.stars { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.star { border: none; background: transparent; font-size: 20px; cursor: pointer; opacity: 0.35; }
.star.active { opacity: 1; }
.star-text { margin-left: 8px; opacity: 0.8; }

.textarea {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 7px;
  padding: 10px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  background: #fffffd;
}

.row { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-top: 10px; }
.smallhint { margin: 8px 0 0; opacity: 0.85; }

.list { margin-top: 12px; display: grid; gap: 12px; }
.review { border: 1px solid #efe7d3; border-radius: 12px; padding: 12px; background: #fff; }

.head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
.who { color: #302c27; }
.time { opacity: 0.7; font-size: 0.9rem; margin-left: 6px; }
.rating { color: #302c27; }

.comment { margin: 10px 0 0; color: #302c27; white-space: pre-wrap; }

.photo { margin-top: 10px; }
.photo img { max-width: 100%; border-radius: 10px; border: 1px solid #eee; }

.actions { margin-top: 12px; }

.btn {
  border: none;
  border-radius: 7px;
  background-color: #e2d9c2;
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s ease;
  color: #302c27;
}
.btn:hover { background-color: #d7ceb8; }
.small { padding: 0.55rem 0.75rem; font-size: 0.9rem; }
.ghost { background-color: #fff; border: 1px solid #d9cfb4; }
</style>
