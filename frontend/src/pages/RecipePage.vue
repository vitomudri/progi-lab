<template>
    <main class="recipe-page">
        <!-- <div class="image-container">
      <img :src="recipe.image" alt="recipe image" />
    </div> -->

        <h1 class="recipe-title">{{ recipe.name }}</h1>
        <!-- <p class="recipe-author">👩‍🍳 Autor: {{ recipe.author }}</p> -->

        <div class="meta">
            <span class="badge">⏱ {{ recipe.prep_time }} min</span>
            <span class="badge">🍽 {{ recipe.number_of_servings }}</span>
        </div>

        <!-- <section class="ingredients">
            <h2>Sastojci</h2>
            <ul>
                <li v-for="(item, index) in recipe.ingredients" :key="index">{{ item }}</li>
            </ul>
        </section> -->

        <section class="preparation">
            <!-- <h3>Vrijeme pripreme: {{ recipe.prep_time }}min</h3>
            <h3>Broj jela: {{ recipe.number_of_servings }}</h3> -->
            <h2>Priprema</h2>
            <p>{{ recipe.description }}</p>
        </section>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router';

type ExistingRecipeOptions = {
    recipe_id: string;
}

type Recipe = {
    recipe_id: string;
    name: string;
    description: string;
    prep_time: number;
    number_of_servings: number;
}

const route = useRoute();
const router = useRouter();

const recipe = ref<Recipe>({
    recipe_id: "",
    name: "",
    description: "",
    prep_time: 0,
    number_of_servings: 0
});

onMounted(async () => {
    if (route.params.id && typeof route.params.id === 'string') {
        const options: ExistingRecipeOptions = { recipe_id: route.params.id };
        try {
            const res = await fetch(`/api/v1/recipe/get/${options.recipe_id}`);
            if (!res.ok) throw new Error("Greška u dohvaćanju");

            const data = await res.json();
            recipe.value = data.content;
        } catch (err) {
            console.error("Ne mogu dohvatiti recepte:", err)
        }
    } else {
        router.push("/");
    }
})

</script>

<style scoped>
html,
body {
    min-height: 100vh;
}

.meta {
    display: flex;
    gap: 8px;
    align-items: center;
}

.badge {
    background: linear-gradient(180deg, rgba(244,193,82,0.12), rgba(244,193,82,0.06));
    color: #6b4b1e;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(46,40,32,0.04);
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
    list-style-type: disc;
    /* ➜ male točkice */
    /* ➜ malo pomakne cijelu listu udesno */
}

/* Naslovi */
h2 {
    font-size: 24px;
    margin-bottom: 12px;
    color: #302c27;
}

/* Liste */
ul,
ol {
    padding-left: 20px;
    line-height: 1.8;
    color: #302c27;
    list-style-position: outside;
    display: block !important;
    cursor: default !important;
    /* sprječava pointer između stavki */
}

/* Stavke u listama */
li {
    display: list-item !important;
    margin-bottom: 8px;
    word-wrap: break-word;
    cursor: default !important;
    /* sprječava pojavu "ruke" */
    transition: none !important;
}

li:hover {
    transform: none !important;
    color: inherit !important;
    cursor: default !important;
}
</style>
