<script setup lang="ts">
import SideMenu from './views/SideMenu.vue'

import { fontsLoaded } from './modules/webfontloader'
</script>

<template>
  <div class="page-wrapper" v-if="fontsLoaded">
    <div class="page-inner">
      <SideMenu />
      <div class="page-content-wrapper">
        <main role="main" class="page-content h-screen">
          <RouterView />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/assets/css/app.scss"></style>
