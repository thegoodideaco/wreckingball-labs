<script setup lang="ts">
import SideMenu from './views/SideMenu.vue'

import { fontsLoaded } from './modules/webfontloader'
</script>

<template>
  <div class="page-wrapper" v-if="fontsLoaded">
    <div class="page-inner flex items-stretch">
      <SideMenu class="bg-gray-800" />
      <div class="page-content-wrapper flex-1">
        <main role="main" class="page-content min-h-screen relative">
          <RouterView v-slot="{ Component }">
            <template v-if="Component">
              <Transition name="fade" mode="out-in">
                <Suspense timeout="0" :suspensible="false">
                  <!-- Main route content -->
                  <component :is="Component" class="absolute w-full h-full" />
                  <!-- Loading state -->
                  <template #fallback>
                    <div class="w-full h-full">
                      <p>Loading page...</p>
                    </div>
                  </template>
                </Suspense>
              </Transition>
            </template>
          </RouterView>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/assets/css/app.scss"></style>

<style lang="scss" scoped>
  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.3s ease;
  }
  .fade-enter-from, .fade-leave-to {
    opacity: 0;
  }
</style>

