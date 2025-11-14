<template>
  <div class="add-recipe-wrapper">
    <div class="add-recipe-card">
      <h2>Dodajte svoj recept</h2>
      <p>Podijelite svoju kulinarsku ideju s drugima!</p>

      <form @submit.prevent="handleSubmit">
        <input
          v-model="recipe.title"
          type="text"
          placeholder="Naziv recepta"
          required
        />

        <textarea
          v-model="recipe.ingredients"
          placeholder="Sastojci (odvojeni zarezima ili novim redom)"
          required
        ></textarea>

        <textarea
          v-model="recipe.steps"
          placeholder="Priprema"
          required
        ></textarea>

        <div class="file-input">
          <label for="image">Dodajte sliku</label>
          <input id="image" type="file" accept="image/*" @change="handleImage" />
        </div>

        <button type="submit">Spremi recept</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const recipe = ref({
  title: "",
  ingredients: "",
  steps: "",
  image: null as File | null
});

function handleImage(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    recipe.value.image = target.files[0];
  }
}

async function handleSubmit() {
  // kasnije ćeš ovdje pozvati API da pošalješ podatke
  console.log("Recept spremljen:", recipe.value);
  alert("Recept uspješno spremljen!");
  router.push("/"); // povratak na početnu
}
</script>

<style scoped>
.add-recipe-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 2rem;
  background-color: #F5F1E5;
  margin-bottom: 150px;
}

.add-recipe-card {
  color: #000;
  width: 100%;
  max-width: 500px;
  padding: 3rem;
  border-radius: 3rem;
  background-color: #FFFCF4;
  text-align: center;
}

.add-recipe-card h2 {
  font-weight: 450;
  font-size: 1.875rem;
  margin-bottom: 0.5rem;
}

.add-recipe-card p {
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.add-recipe-card input,
.add-recipe-card textarea {
  border: 1px solid #ccc;
  border-radius: 7px;
  display: block;
  background-color: #FFFFFD;
  width: 100%;
  margin-bottom: 1rem;
  padding: 1rem;
  font-family: inherit;
  resize: none;
}

textarea {
  min-height: 100px;
  resize: vertical;
}

.file-input {
  text-align: left;
  margin-bottom: 1rem;
}

.file-input label {
  font-size: 0.9rem;
  display: block;
  margin-bottom: 0.3rem;
  color: #444;
}

.add-recipe-card button {
  border: none;
  border-radius: 7px;
  background-color: #E2D9C2;
  padding: 1rem;
  cursor: pointer;
  width: 100%;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  font-size: 1rem;
  transition: background-color 0.2s ease;
}

.add-recipe-card button:hover {
  background-color: #d7ceb8;
}
</style>
