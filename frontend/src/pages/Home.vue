<template>
  <section>
    <div class="hero">
      <h1>"IDEJE, RECEPTI I OKUSI KOJI OSTAJU U SJEĆANJU"</h1>
    </div>
  </section>

  <section class="popular">
  <h2>Najpopularniji recepti</h2>

  <div class="recipe-grid">

    <router-link
      v-for="recipe in recipes"
      :key="recipe.id"
      :to="`/recipe/${recipe.id}`"
      class="recipe-card"
    >
      <img :src="recipe.image" alt="" class="thumb" />
      <p>{{ recipe.title }}</p>
    </router-link>

    <div
      v-for="n in (8 - recipes.length)"
      :key="'placeholder-'+n"
      class="recipe-card placeholder"
    >
      <div class="thumb empty"></div>
      <p>Recept...</p>
    </div>

    <router-link
      v-if="isLoggedIn"
      to="/add-recipe"
      class="recipe-card add-card"
    >
      <div class="thumb plus-box">+</div>
      <p>Dodaj recept</p>
    </router-link>

  </div>
</section>

</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"

const recipes = ref([])                
const isLoggedIn = ref(true)           // promijeni kad spojiš login

onMounted(async () => {
  try {
    const res = await fetch("/api/v1/recipes/popular")
    if (!res.ok) throw new Error("Greška u dohvaćanju")

    const data = await res.json()
    recipes.value = data
  } catch (err) {
    console.error("Ne mogu dohvatiti recepte:", err)
  }
})
</script>


<style scoped>

.hero {
  background-image: url('@/assets/images/hero-bg.jpg');
  background-size: cover;
  padding: 110px 100px;
  text-align: center;
  color: #2d2d2d;
  font-size: 16px;
  height: 10vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.1);
  z-index: 0;
}

.hero h1 {
  position: relative;
  z-index: 1;
}

.popular {
  padding: 30px 0 150px;
  background-color: #f5f1e8;
  text-align: center;
}

.popular h2 {
  font-size: 25px;
  color: #2d2d2d;
  margin-bottom: 40px;
  margin-left: 30px;
  text-align: left;
}

.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 30px;
  justify-items: center;
  padding: 0 40px;
}

.recipe-card {
  background-color: #e6dfc9;
  border-radius: 15px;
  width: 220px;
  height: 240px; 
  padding: 15px;
  text-align: center;
  color: #2d2d2d;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.recipe-card:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.thumb {
  width: 100%;
  height: 140px;
  border-radius: 12px;
  object-fit: cover;
  background-color: #f3ede0;
}

.empty {
  background-color: #efe7d9 !important;
}

.add-card:hover {
  transform: scale(1.05);
  box-shadow: none; /* nema potamnjivanja */
}

.plus-box {
  font-size: 48px;
  font-weight: bold;
  color: #302c27;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
}

.recipe-card p {
  margin-top: 10px;
  font-size: 1rem;
  font-weight: 500;
}
</style>

