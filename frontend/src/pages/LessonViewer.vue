<template>
  <section v-if="lesson" class="card">
    <div class="lesson-view-head">
      <h2 class="lesson-view-title">{{ lesson.title }}</h2>
      <button class="btn small ghost" @click="$emit('close')">Zatvori</button>
    </div>

    <!-- VIDEO -->
    <div v-if="lesson.type === 'video'">
      <iframe
        v-if="embedUrl(lesson.video_url)"
        class="player"
        :src="embedUrl(lesson.video_url)!"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>

      <p v-else class="hint">
        Video link:
        <a :href="lesson.video_url ?? '#'" target="_blank" rel="noopener">Otvori u novom tabu</a>
      </p>

      <div class="meta-box">
        <div class="mini">
          Prep: <b>{{ lesson.prep_time_min ?? "—" }}</b> min ·
          Cook: <b>{{ lesson.cook_time_min ?? "—" }}</b> min ·
          Težina: <b>{{ lesson.difficulty ?? "—" }}</b>
        </div>

        <h3 class="subhead">Sastojci</h3>
        <p class="text-content">{{ lesson.ingredients_text || "—" }}</p>

        <h3 class="subhead">Koraci</h3>
        <p class="text-content">{{ lesson.steps_text || "—" }}</p>

        <h3 class="subhead">Shopping list</h3>
        <p class="text-content">{{ lesson.shopping_list || "—" }}</p>

        <h3 class="subhead">Alergeni</h3>
        <p class="text-content">{{ lesson.allergens || "—" }}</p>

        <h3 class="subhead">Nutrition</h3>
        <div v-if="nutritionRows(lesson.nutrition).length" class="nutri-card">
          <div class="nutri-grid">
            <div v-for="row in nutritionRows(lesson.nutrition)" :key="row.key" class="nutri-item">
              <div class="nutri-label">{{ row.label }}</div>
              <div class="nutri-value">{{ row.value }}</div>
            </div>
          </div>
        </div>
        <div v-else class="mini">—</div>
      </div>
    </div>

    <!-- TEXT -->
    <div v-else-if="lesson.type === 'text'">
      <p class="text-content">{{ lesson.content || "—" }}</p>
    </div>

    <!-- RECIPE -->
    <div v-else class="recipe-view">
      <div class="mini">
        Prep: <b>{{ lesson.prep_time_min ?? "—" }}</b> min ·
        Cook: <b>{{ lesson.cook_time_min ?? "—" }}</b> min ·
        Težina: <b>{{ lesson.difficulty ?? "—" }}</b>
      </div>

      <h3 class="subhead">Sastojci</h3>
      <p class="text-content">{{ lesson.ingredients_text || "—" }}</p>

      <h3 class="subhead">Koraci</h3>
      <p class="text-content">{{ lesson.steps_text || "—" }}</p>

      <h3 class="subhead">Shopping list</h3>
      <p class="text-content">{{ lesson.shopping_list || "—" }}</p>

      <h3 class="subhead">Alergeni</h3>
      <p class="text-content">{{ lesson.allergens || "—" }}</p>

      <h3 class="subhead">Nutrition</h3>
      <pre class="json">{{ lesson.nutrition ? JSON.stringify(lesson.nutrition, null, 2) : "—" }}</pre>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { LessonDetail } from "@/services/courseApi";

defineProps<{ lesson: LessonDetail | null }>();
defineEmits<{ (e: "close"): void }>();

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
</script>

<style scoped>
.card {
  background-color: #fff;
  border: 1px solid #e6dfc9;
  border-radius: 15px;
  padding: 18px;
  margin-bottom: 20px;
}
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
.mini {
  margin: 6px 0 0;
  font-size: 12px;
  opacity: 0.75;
  color: #302c27;
}
.hint {
  margin: 10px 0 18px;
  color: #302c27;
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
.btn {
  border: none;
  border-radius: 7px;
  background-color: #e2d9c2;
  padding: 0.9rem 1rem;
  cursor: pointer;
  color: #302c27;
}
.small { padding: 0.55rem 0.75rem; font-size: 0.9rem; }
.ghost { background-color: #fff; border: 1px solid #d9cfb4; }
</style>
