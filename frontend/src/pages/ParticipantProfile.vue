<template>
  <div class="profile-page-wrapper">
    <UserCard :ime="profileData.ime" :prezime="profileData.prezime" :email="profileData.email" />

    <section class="profile-details">
      <template v-if="loading">
        <p>Učitavanje...</p>
      </template>

      <template v-else-if="error">
        <p><strong>Niste prijavljeni.</strong></p>
        <p class="error">{{ error }}</p>
      </template>

      <template v-else>
        <p><strong>Razine vještine:</strong> {{ profileData.skillLevel }}</p>
        <p><strong>Alergeni:</strong> {{ profileData.allergens.join(", ") }}</p>
        <p><strong>Omiljene kuhinje:</strong> {{ profileData.favoriteCuisines.join(", ") }}</p>
        <p><strong>Povijest tečajeva:</strong> {{ profileData.courseHistory.join(", ") }}</p>
        <p><strong>Bilješke:</strong> {{ profileData.notes }}</p>

        <div class="profile-actions">
          <button @click="redirect2FA">2FA Postavke</button>
          <button @click="handleLogout">Odjava</button>
        </div>

        <!-- ===== Student/Instructor: Postani instruktor (admin ne vidi) ===== -->
        <section v-if="instructorStatus.role !== 'admin'" class="instructor-request">
          <h3>Postani instruktor</h3>

          <template v-if="instructorStatus.role === 'instructor'">
            <p class="ok">Vi ste instruktor ✅</p>
          </template>

          <template v-else-if="instructorStatus.has_request && !instructorStatus.verified">
            <p class="pending">Zahtjev je poslan. Čeka odobrenje admina ⏳</p>
            <p class="small">
              Poslani dokumenti: {{ (instructorStatus.verification_file_ids || []).length }}
            </p>
            <button class="secondary" @click="refreshInstructorStatus" :disabled="refreshingStatus">
              {{ refreshingStatus ? "Osvježavam..." : "Osvježi status" }}
            </button>
          </template>

          <template v-else-if="instructorStatus.has_request && instructorStatus.verified">
            <p class="ok">Zahtjev je odobren ✅</p>
            <p class="small">
              Ako vam se uloga još nije promijenila u "instructor", odjavite se i prijavite ponovno.
            </p>
            <button class="secondary" @click="refreshInstructorStatus" :disabled="refreshingStatus">
              {{ refreshingStatus ? "Osvježavam..." : "Osvježi status" }}
            </button>
          </template>

          <template v-else>
            <p>
              Pošaljite dokumente (certifikate) za verifikaciju instruktora. Admin će pregledati i odobriti/odbiti zahtjev.
            </p>

            <input type="file" multiple @change="onSelectInstructorFiles" />

            <ul v-if="selectedFiles.length" class="file-list">
              <li v-for="f in selectedFiles" :key="f.name + f.size">
                {{ f.name }} ({{ Math.round(f.size / 1024) }} KB)
              </li>
            </ul>

            <div class="request-actions">
              <button
                :disabled="sendingRequest || selectedFiles.length === 0"
                @click="submitInstructorRequest"
              >
                {{ sendingRequest ? uploadProgressLabel : "Pošalji zahtjev" }}
              </button>

              <button
                v-if="selectedFiles.length"
                class="secondary"
                :disabled="sendingRequest"
                @click="clearSelectedFiles"
              >
                Makni odabrane fajlove
              </button>
            </div>

            <p v-if="requestError" class="error">{{ requestError }}</p>
            <p v-if="requestOk" class="ok">{{ requestOk }}</p>
          </template>
        </section>

        <!-- ===== Admin panel (admin samo ovo vidi) ===== -->
        <section v-if="instructorStatus.role === 'admin'" class="admin-panel">
          <h3>Admin panel: verifikacije instruktora</h3>

          <div class="admin-actions">
            <button class="secondary" @click="loadPendingRequests" :disabled="adminLoading">
              {{ adminLoading ? "Učitavam..." : "Osvježi listu" }}
            </button>
          </div>

          <p v-if="adminError" class="error">{{ adminError }}</p>

          <template v-if="!adminLoading && pendingRequests.length === 0">
            <p>Nema zahtjeva na čekanju ✅</p>
          </template>

          <div v-for="item in pendingRequests" :key="item.user_id" class="pending-card">
            <div class="pending-header">
              <div>
                <p class="name"><strong>{{ item.first_name }} {{ item.last_name }}</strong></p>
                <p class="email">{{ item.email }}</p>
                <p v-if="item.specialization" class="small"><strong>Specijalizacija:</strong> {{ item.specialization }}</p>
                <p v-if="item.biography" class="small"><strong>Bio:</strong> {{ item.biography }}</p>
              </div>

              <div class="pending-buttons">
                <button @click="approveInstructor(item.user_id)" :disabled="!!item._busy">
                  {{ item._busy === "approve" ? "Odobravam..." : "Odobri" }}
                </button>
                <button class="danger" @click="rejectInstructor(item.user_id)" :disabled="!!item._busy">
                  {{ item._busy === "reject" ? "Odbijam..." : "Odbij" }}
                </button>
              </div>
            </div>

            <div class="docs">
              <p class="small"><strong>Dokumenti:</strong></p>

              <template v-if="(item.verification_file_ids || []).length === 0">
                <p class="small">Nema dokumenata (nešto nije poslano kako treba).</p>
              </template>

              <ul v-else class="doc-list">
                <li v-for="fid in item.verification_file_ids" :key="fid">
                  <button class="linklike" @click="openDocument(fid)" :disabled="openingDocId === fid">
                    {{ openingDocId === fid ? "Otvaram..." : "Otvori dokument" }}
                  </button>
                  <span class="small mono">{{ fid }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import UserCard from "../components/UserCard.vue";
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";

type Role = "student" | "instructor" | "admin";

const profileData = ref({
  ime: "",
  prezime: "",
  email: "",
  skillLevel: "",
  allergens: [] as string[],
  favoriteCuisines: [] as string[],
  courseHistory: [] as string[],
  notes: ""
});

const loading = ref(true);
const error = ref<string | null>(null);
const router = useRouter();

/** ===== Instructor status + request state ===== */
const instructorStatus = ref({
  role: "student" as Role,
  has_request: false,
  verified: false,
  verification_file_ids: [] as string[]
});

const refreshingStatus = ref(false);

const selectedFiles = ref<File[]>([]);
const sendingRequest = ref(false);
const requestError = ref<string | null>(null);
const requestOk = ref<string | null>(null);

const uploadProgress = ref({ done: 0, total: 0 });
const uploadProgressLabel = computed(() => {
  if (!sendingRequest.value) return "Šaljem...";
  const { done, total } = uploadProgress.value;
  if (!total) return "Šaljem...";
  return `Upload ${done}/${total}...`;
});

function clearSelectedFiles() {
  selectedFiles.value = [];
}

function onSelectInstructorFiles(e: Event) {
  requestError.value = null;
  requestOk.value = null;

  const input = e.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  selectedFiles.value = files;
}

async function refreshInstructorStatus() {
  refreshingStatus.value = true;
  try {
    await loadInstructorStatus();
  } finally {
    refreshingStatus.value = false;
  }
}

async function loadInstructorStatus() {
  try {
    const res = await fetch("/api/v1/instructors/me", { credentials: "include" });
    if (!res.ok) return;

    const data = await res.json();
    instructorStatus.value = {
      role: (data.role ?? "student") as Role,
      has_request: !!data.has_request,
      verified: !!data.verified,
      verification_file_ids: (data.verification_file_ids ?? []) as string[]
    };
  } catch {
    // ignore
  }
}

async function uploadOne(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("/api/v1/files", {
    method: "POST",
    body: fd,
    credentials: "include"
  });

  if (!res.ok) {
    const msg = (await res.json().catch(() => null))?.error ?? res.statusText;
    throw new Error(msg);
  }

  const data = await res.json();
  return data.file_id as string;
}

async function submitInstructorRequest() {
  requestError.value = null;
  requestOk.value = null;

  // admin nikad ne šalje zahtjev (front guard)
  if (instructorStatus.value.role === "admin") {
    requestError.value = "Admin ne može slati zahtjev za instruktora.";
    return;
  }

  if (selectedFiles.value.length === 0) {
    requestError.value = "Odaberite barem jedan dokument.";
    return;
  }

  sendingRequest.value = true;
  uploadProgress.value = { done: 0, total: selectedFiles.value.length };

  try {
    const fileIds: string[] = [];
    for (const f of selectedFiles.value) {
      const id = await uploadOne(f);
      fileIds.push(id);
      uploadProgress.value = { done: fileIds.length, total: selectedFiles.value.length };
    }

    const res = await fetch("/api/v1/instructors/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ file_ids: fileIds })
    });

    if (!res.ok) {
      const msg = (await res.json().catch(() => null))?.error ?? res.statusText;
      throw new Error(msg);
    }

    requestOk.value = "Zahtjev je poslan. Čeka odobrenje admina.";
    selectedFiles.value = [];
    await loadInstructorStatus();
  } catch (err: any) {
    requestError.value = err?.message ?? "Greška pri slanju zahtjeva.";
  } finally {
    sendingRequest.value = false;
    uploadProgress.value = { done: 0, total: 0 };
  }
}

/** ===== Admin panel state + functions ===== */
type PendingInstructor = {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  biography: string | null;
  specialization: string | null;
  verification_file_ids: string[];
  _busy?: "approve" | "reject" | null; // frontend-only
};

const pendingRequests = ref<PendingInstructor[]>([]);
const adminLoading = ref(false);
const adminError = ref<string | null>(null);
const openingDocId = ref<string | null>(null);

async function loadPendingRequests() {
  adminError.value = null;
  adminLoading.value = true;

  try {
    const res = await fetch("/api/v1/admin/instructors/pending", {
      credentials: "include"
    });

    if (!res.ok) {
      const msg = (await res.json().catch(() => null))?.error ?? res.statusText;
      throw new Error(msg);
    }

    const data = await res.json();
    const items = (data.items ?? []) as any[];

    pendingRequests.value = items.map((x) => ({
      user_id: x.user_id,
      first_name: x.first_name,
      last_name: x.last_name,
      email: x.email,
      biography: x.biography ?? null,
      specialization: x.specialization ?? null,
      verification_file_ids: x.verification_file_ids ?? [],
      _busy: null
    }));
  } catch (err: any) {
    adminError.value = err?.message ?? "Greška pri učitavanju pending zahtjeva.";
  } finally {
    adminLoading.value = false;
  }
}

async function approveInstructor(userId: string) {
  const item = pendingRequests.value.find((x) => x.user_id === userId);
  if (item) item._busy = "approve";
  adminError.value = null;

  try {
    const res = await fetch(`/api/v1/admin/instructors/${userId}/approve`, {
      method: "POST",
      credentials: "include"
    });

    if (!res.ok) {
      const msg = (await res.json().catch(() => null))?.error ?? res.statusText;
      throw new Error(msg);
    }

    pendingRequests.value = pendingRequests.value.filter((x) => x.user_id !== userId);
  } catch (err: any) {
    adminError.value = err?.message ?? "Greška pri odobravanju.";
  } finally {
    if (item) item._busy = null;
  }
}

async function rejectInstructor(userId: string) {
  const item = pendingRequests.value.find((x) => x.user_id === userId);
  if (item) item._busy = "reject";
  adminError.value = null;

  try {
    const res = await fetch(`/api/v1/admin/instructors/${userId}/reject`, {
      method: "POST",
      credentials: "include"
    });

    if (!res.ok) {
      const msg = (await res.json().catch(() => null))?.error ?? res.statusText;
      throw new Error(msg);
    }

    pendingRequests.value = pendingRequests.value.filter((x) => x.user_id !== userId);
  } catch (err: any) {
    adminError.value = err?.message ?? "Greška pri odbijanju.";
  } finally {
    if (item) item._busy = null;
  }
}

async function openDocument(fileId: string) {
  // otvori tab odmah (dok je još "user gesture")
  const newTab = window.open("", "_blank", "noopener,noreferrer");

  openingDocId.value = fileId;
  adminError.value = null;

  try {
    const res = await fetch(`/api/v1/admin/files/${fileId}/url`, {
      credentials: "include"
    });

    if (!res.ok) {
      const msg = (await res.json().catch(() => null))?.error ?? res.statusText;
      throw new Error(msg);
    }

    const data = await res.json();
    const url = data.url as string;

    if (!url) throw new Error("Backend nije vratio url dokumenta.");

    // ako browser ipak blokira otvaranje, fallback
    if (newTab) {
      newTab.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch (err: any) {
    adminError.value = err?.message ?? "Ne mogu otvoriti dokument.";
    if (newTab) newTab.close();
  } finally {
    openingDocId.value = null;
  }
}


/** ===== Existing actions ===== */
async function handleLogout() {
  try {
    const res = await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    if (!res.ok) throw new Error("Logout failed");
    router.push("/login");
  } catch (err) {
    console.error("Logout error", err);
  }
}

async function redirect2FA() {
  router.push("/2fa-settings");
}

onMounted(async () => {
  loading.value = true;

  try {
    const res = await fetch("/api/v1/profile/me", { credentials: "include" });
    if (!res.ok) {
      const msg = (await res.json().catch(() => null))?.error ?? res.statusText;
      throw new Error(msg);
    }

    const data = await res.json();
    profileData.value = {
      ime: data.ime || "",
      prezime: data.prezime || "",
      email: data.email || "",
      skillLevel: data.skillLevel || "",
      allergens: data.allergens || [],
      favoriteCuisines: data.favoriteCuisines || [],
      courseHistory: data.courseHistory || [],
      notes: data.notes || ""
    };

    await loadInstructorStatus();

    // ako je admin, odmah povuci pending
    if (instructorStatus.value.role === "admin") {
      await loadPendingRequests();
    }
  } catch (err: any) {
    console.error("Failed to load profile", err);
    error.value = err.message || "Greška pri učitavanju profila.";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.profile-page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 1rem;
  background-color: #F5F1E5;
  overflow: hidden;
}

.profile-details {
  flex: 1;
  min-height: 0;
  margin-top: 1rem;
  background-color: #FFF;
  padding: 1.5rem;
  overflow-y: auto;
  padding-bottom: 5rem; /* da zadnji sadržaj ne završi "ispod" footera */
}



.profile-details p {
  margin: 0.5rem 0;
  line-height: 1.5;
}

.profile-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

button {
  padding: 0.5rem 0.9rem;
  border: none;
  cursor: pointer;
  background: #222;
  color: #fff;
  border-radius: 6px;
}

button.secondary {
  background: #666;
}

button.danger {
  background: #b00020;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  margin-top: 0.5rem;
  color: #b00020;
}

.ok {
  margin-top: 0.5rem;
  color: #1b7f2a;
}

.pending {
  margin-top: 0.5rem;
  color: #8a6d00;
}

.small {
  font-size: 0.9rem;
  opacity: 0.85;
}

/* Instructor request */
.instructor-request {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e6e0d3;
}

.file-list {
  margin: 0.75rem 0;
  padding-left: 1.25rem;
}

.request-actions {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Admin panel */
.admin-panel {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e6e0d3;
}

.admin-actions {
  margin: 0.75rem 0;
}

.pending-card {
  border: 1px solid #e6e0d3;
  border-radius: 10px;
  padding: 1rem;
  margin-top: 0.75rem;
  background: #fff;
}

.pending-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.pending-buttons {
  display: flex;
  gap: 0.5rem;
}

.docs {
  margin-top: 0.75rem;
}

.doc-list {
  margin: 0.5rem 0 0 0;
  padding-left: 1.25rem;
}

button.linklike {
  background: transparent;
  color: #222;
  text-decoration: underline;
  padding: 0;
  border-radius: 0;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
</style>
