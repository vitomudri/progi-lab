<template>
  <div id="app">
    <Header />
    <router-view />
    <Footer />
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
</script>

<style>
body {
  margin: 0;
  font-family: 'Poppins', sans-serif;
  background-color: #F5F1E8;
}
</style>
