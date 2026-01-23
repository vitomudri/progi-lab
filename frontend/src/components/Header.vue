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

      <!-- Logo u sredini -->
      <div class="logo">
        <img src="@/assets/images/logo.png" alt="Kuhari logo" />
      </div>

      <!-- Desna strana -->
      <ul class="nav-right">
        <li><router-link to="/about">O nama</router-link></li>
        <li class="search" @click="toggleSearch">
          <i class="fa-regular fa-magnifying-glass"></i>
        </li>
        <li><router-link to="/login">Prijava</router-link></li>
        <li><router-link to="/participant-profile">Profil</router-link></li>
      </ul>
    </nav>

    <!-- Dodatni red za pretragu -->
   
    <div v-if="showSearch" class="search-bar">
      <div class="search-container">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input
          type="text"
          placeholder="Pretraži recepte, tečajeve..."
          class="search-input"
        />
        <i class="fa-solid fa-xmark close" @click="toggleSearch"></i>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const showSearch = ref(false)
const showDropdown = ref(false)
const dropdownRef = ref(null)

const toggleSearch = () => {
  showSearch.value = !showSearch.value
  showDropdown.value = false
}

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
  showSearch.value = false
}

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    showDropdown.value = false
  }
}


onMounted(() => {
  document.addEventListener('click', handleClickOutside)
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

ul :hover{
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
  cursor: pointer;
}

.dropdown-menu {
  position: absolute;
  top: 150%;
  left: 50%;
  background-color: #e6dfc9;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100px; 
  padding: 10px 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 0;
  transform: translate(-50%, -10px);
  pointer-events: none;
  z-index: 1000;
}
.dropdown-menu.show {
  opacity: 1;
  transform: translate(-50%, 0);
  pointer-events: auto;
}

.dropdown-menu a {
  width: 100%;
  text-align: center;
  text-decoration: none;
  color: #2d2d2d;
  font-size: 16px;
  padding: 5px;
  transition: background-color 0.2s ease;
}

.dropdown-menu a:hover {
  color: #555;
  transform: scale(1.02);
}


.logo {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.logo img {
  height: 70px;
  display: block;
  margin: 0 auto;
}

.search-bar {
  padding: 15px 0;
  border-top: 1px solid #ddd;
  animation: slideDown 0.7s ease forwards;
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

.search-container i {
  font-size: 16px;        
  color: #2d2d2d;        
  opacity: 0.8;           
  transition: opacity 0.2s ease;

}

.search-container i:hover {
  opacity: 1;             
}

.close {
  font-size: 18px;        
  color: #2d2d2d;
  cursor: pointer;
}


@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}


</style>
