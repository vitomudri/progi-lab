<template>
    <section>
        <div class="hero">
            <h1>"IDEJE, RECEPTI I OKUSI KOJI OSTAJU U SJEĆANJU"</h1>
        </div>
    </section>
    <section class="popular">
  <h2>Najpopularniji recepti</h2>
  <div class="recipe-grid">
    <div class="recipe">Korejska pržena piletina</div>
    <div class="recipe">Juha od brokule</div>
    <div class="recipe">Cimet rolice</div>
    
  </div>
</section>

</template>

<style scoped>
.hero {
  background-image: url('@/assets/images/hero-bg.jpg');
  background-size: cover;
  
  padding: 110px 100px;
  text-align: center;
  color: #2d2d2d;
  font-size: 16px;
  font-weight: 400;
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
  background-color: rgba(255, 255, 255, 0.1); /* 0.4 = 40% bijelo prekrivanje */
  z-index: 0;
}

.hero h1 {
  position: relative;
  z-index: 1;
}


.popular {
  padding: 30px 0;
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
  display: flex;
  justify-content: center;
  gap: 30px;
}

.recipe {
  background-color: #e6dfc9;
  padding: 20px;
  border-radius: 15px;
  width: 180px;
}

</style>
