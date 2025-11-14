<template>
  <div class="user-card">
    <h2>{{ ime }} {{ prezime }}</h2>
    <p>{{ email }}</p>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

interface Props {
  ime: string;
  prezime: string;
  email: string;
}

const props = defineProps<Props>();
</script>

<style scoped>

.user-card {
  color: #000000;
  background-color: #F5F1E5;
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  max-width: 300px;
  margin: 1rem auto;
}

.user-card h2 {
  margin-bottom: 0.5rem;
}

</style>