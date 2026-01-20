<script setup lang="ts">
const isAuthenticated = false; // <- izlogiran korisnik
const has2FAEnabled = false;  
</script>

<template>
  <div style="padding: 24px">
    <h2>2FA postavke</h2>

    <p v-if="!isAuthenticated">
      Niste prijavljeni.
    </p>

    <template v-else>
      <p v-if="has2FAEnabled">
        2FA je aktivan 
      </p>
      <p v-else>
        Nemate aktiviran 2FA.
      </p>
    </template>
  </div>
</template>
