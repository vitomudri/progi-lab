<template>
  <main class="recipe-page">
    <div class="image-container">
      <img :src="recipe.image" alt="recipe image" />
    </div>

    <h1 class="recipe-title">{{ recipe.title }}</h1>
    <p class="recipe-author">👩‍🍳 Autor: {{ recipe.author }}</p>

    <section class="ingredients">
      <h2>Sastojci</h2>
      <ul>
        <li v-for="(item, index) in recipe.ingredients" :key="index">{{ item }}</li>
      </ul>
    </section>

    <section class="preparation">
      <h2>Priprema</h2>
      <ol>
        <li v-for="(step, index) in recipe.steps" :key="index">{{ step }}</li>
      </ol>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const recipe = ref({
  title: 'Korejska pržena piletina s rižom',
  image: '/src/assets/images/kfc.jpg',
  author: 'Ana M.',
  ingredients: [
    '500 g pilećih prsa',
    '2 žlice kukuruznog škroba',
    '1 jaje',
    'Sol i papar po želji',
    'Ulje za prženje',
    '2 žlice sojinog umaka',
    '1 žlica meda',
    '1 žličica gochujang paste (ili čili paste)',
    '2 režnja češnjaka (sitno nasjeckana)',
    'Sezamove sjemenke za posip'
  ],
  steps: [
    'Piletinu nareži na male komade i začini solju i paprom.',
    'Uvaljaj u jaje pa u kukuruzni škrob.',
    'Prži u vrućem ulju dok ne postane zlatno i hrskavo.',
    'U tavi pomiješaj soja umak, med, češnjak i gochujang — kratko prokuhaj.',
    'Dodaj prženu piletinu i dobro promiješaj da se obloži umakom.',
    'Pospi sezamom i posluži uz kuhanu rižu.'
  ]
})
</script>

<style scoped>
html, body {
  min-height: 100vh;
}

.recipe-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px 100px; 
}

.image-container img {
  width: 100%;
  height: 400px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 30px;
}

.recipe-title {
  font-size: 32px;
  margin-bottom: 10px;
  color: #302c27;
}

.recipe-author {
  font-size: 18px;
  color: #6a6359;
  margin-bottom: 40px;
}

.ingredients,
.preparation {
  text-align: left;
  margin-bottom: 40px;
}
.ingredients ul {
  list-style-type: disc; /* ➜ male točkice */
      /* ➜ malo pomakne cijelu listu udesno */
}

/* Naslovi */
h2 {
  font-size: 24px;
  margin-bottom: 12px;
  color: #302c27;
}

/* Liste */
ul, ol {
  padding-left: 20px;
  line-height: 1.8;
  color: #302c27;
  list-style-position: outside;
  display: block !important;
  cursor: default !important; /* sprječava pointer između stavki */
}

/* Stavke u listama */
li {
  display: list-item !important;
  margin-bottom: 8px;
  word-wrap: break-word;
  cursor: default !important; /* sprječava pojavu "ruke" */
  transition: none !important;
}

li:hover {
  transform: none !important;
  color: inherit !important;
  cursor: default !important;
}


</style>
