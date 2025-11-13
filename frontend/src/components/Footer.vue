<template>
  <footer class="footer">
    <div class="footer-links">
      <p>donotreply@kuhari.app</p>
      <p>FAQ</p>
      <div class="social-icons">
  <a href="#" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
  <a href="#" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
  <a href="#" aria-label="YouTube"><i class="fa-brands fa-youtube"></i></a>
</div>
    </div>
    <p class="copyright">© 2025 Kuhari.   Sva prava pridržana.</p>
  </footer>
</template>

<style scoped>
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: #E6DFC9;
  padding: 20px 0;
  text-align: center;
  font-size: 13px;
  color: #3b3b3b;
  box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.footer-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
  margin-bottom: 10px;
}

.footer-links p:hover {
  cursor: pointer;
  transform: all 0.3s ease;
  color: #5a5a5a;
  transform: scale(1.05);
}

.social-icons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30px;
}

.social-icons a {
  color: #3b3b3b;
  font-size: 20px;
  transition: all 0.3s ease;
}

.social-icons a:hover {
  color: #5a5a5a;
  transform: scale(1.1);
}

</style>
