<template>
    <div class="add-recipe-wrapper">
        <div class="add-recipe-card">
            <h2>Dodajte svoj recept</h2>
            <p>Podijelite svoju kulinarsku ideju s drugima!</p>

            <form @submit.prevent="handleSubmit">
                <input v-model="recipe.name" type="text" placeholder="Naziv recepta" required />

                <textarea v-model="recipe.description" placeholder="Priprema" required></textarea>

                <input v-model.number="recipe.prep_time" type="number" placeholder="Vrijeme pripreme (min)" min="1" required />

                <input v-model.number="recipe.number_of_servings" type="number" placeholder="Broj porcija" min="1" required />

                <button type="submit">Spremi recept</button>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

type NewRecipeOptions = {
    name: string;
    description: string;
    prep_time: number | null;
    number_of_servings: number | null;
};

const router = useRouter();

const recipe = ref<NewRecipeOptions>({
    name: "",
    description: "",
    prep_time: null,
    number_of_servings: null
});

async function handleSubmit() {
    try {
        await fetch("/api/v1/recipe/create", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipe.value)
        });
    } catch(err) {
        console.error("Error sending POST:", err);
    }
    router.push("/");
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
