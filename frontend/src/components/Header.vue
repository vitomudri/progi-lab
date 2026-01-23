<template>
  <header class="header">
    <nav class="nav">

      <!-- Lijeva strana -->
      <ul class="nav-left">
        <li><router-link to="/">Početna</router-link></li>

        <li class="dropdown" ref="dropdownRef">
        <a href="#" @click="toggleDropdown">Usluge</a>
            <div :class="['dropdown-menu', { show: showDropdown }]">
                <router-link to="/courses">Tečajevi</router-link>
                <router-link to="/live">Radionice</router-link>
            </div>
        </li>

        <li><router-link to="/instructors">Instruktori</router-link></li>
      </ul>

      <!-- Logo -->
      <div class="logo">
        <img src="@/assets/images/logo.png" alt="Kuhari logo" />
      </div>

      <!-- Desna strana -->
      <ul class="nav-right">
        <li><router-link to="/about">O nama</router-link></li>

        <!-- SEARCH IKONA -->
        <li class="search" @click="toggleSearch">
          <i class="fa-solid fa-magnifying-glass"></i>
        </li>

        <!-- PRIJAVA / MOJ PROFIL -->
        <li v-if="!isLoggedIn">
          <router-link to="/login">Prijava</router-link>
        </li>
        <li v-else>
          <router-link to="/participant-profile">Moj profil</router-link>
        </li>
      </ul>
    </nav>

    <!-- SEARCH BAR -->
    <div v-if="showSearch" class="search-bar">
      <div class="search-container">
        <i class="fa-solid fa-magnifying-glass"></i>

        <input
          type="text"
          class="search-input"
          placeholder="Pretraži recepte, tečajeve..."
          v-model="query"
          @input="onSearch"
          @keydown.enter.prevent="onEnterSearch"
        />

        <i class="fa-solid fa-xmark close" @click="toggleSearch"></i>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

/* UI state */
const showSearch = ref(false)
const showDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

/* Auth */
const isLoggedIn = ref(false)

/* Search */
const query = ref('')
let searchTimeout: number | undefined

/* ---------------- TOGGLES ---------------- */
const toggleSearch = () => {
  showSearch.value = !showSearch.value
  showDropdown.value = false
  if (!showSearch.value) {
    query.value = ''
  }
}

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
  showSearch.value = false
}

/* ---------------- CLICK OUTSIDE ---------------- */
function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

/* ---------------- SEARCH LOGIC ---------------- */
async function onSearch() {
  clearTimeout(searchTimeout)

  if (!query.value.trim()) return

  searchTimeout = window.setTimeout(async () => {
    try {
      const res = await fetch(
        `/api/v1/search/recipes?q=${encodeURIComponent(query.value)}&autocomplete=true`
      )
      if (!res.ok) return

      const data = await res.json()
      console.log('AUTOCOMPLETE RESULTS:', data.content)
    } catch (err) {
      console.error('Search error:', err)
    }
  }, 300)
}

function onEnterSearch() {
  if (!query.value.trim()) return
  console.log('ENTER SEARCH:', query.value)
  // kasnije: router.push(`/search?q=${query.value}`)
}

/* ---------------- LIFECYCLE ---------------- */
onMounted(async () => {
  document.addEventListener('click', handleClickOutside)

  try {
    const res = await fetch('/api/v1/profile/me', { credentials: 'include' })
    isLoggedIn.value = res.ok
  } catch {
    isLoggedIn.value = false
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>


<style>

.nav a, .nav li, .logo, .header {
  font-family: 'Gruppo', sans-serif !important;
  font-weight: 600 !important;
}


.header {
  background-color: #e6dfc9;
  position: sticky;
  top: 0;
  z-index: 10;
  transition: all 0.3s ease;
  padding: 10px 0;
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 90%;
  margin: 0 auto;
  padding: 20px 0;
}

ul {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 25px;
  padding: 0;
  margin: 0;
  cursor: pointer;
}

ul :hover {
  color: #5a5a5a;
  transform: scale(1.02);
}

a {
  text-decoration: none;
  color: #2d2d2d;
  font-weight: 500;
}

.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 150%;
  left: 50%;
  background-color: #e6dfc9;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100px;
  padding: 10px 0;
  opacity: 0;
  transform: translate(-50%, -10px);
  pointer-events: none;
}

.dropdown-menu.show {
  opacity: 1;
  transform: translate(-50%, 0);
  pointer-events: auto;
}

.logo {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.logo img {
  height: 70px;
}

.search-bar {
  padding: 15px 0;
  border-top: 1px solid #ddd;
  background-color: #e6dfc9;
  position: fixed;
  top: 78px;
  width: 100%;
  z-index: 1000;
}

.search-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 90%;
  margin: 0 auto;
  gap: 15px;
}

.search-input {
  width: 50%;
  padding: 10px 15px;
  border: 1px solid #aaa;
  border-radius: 25px;
  font-size: 15px;
  outline: none;
}

.close {
  cursor: pointer;
}
</style>
