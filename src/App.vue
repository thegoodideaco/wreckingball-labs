<script setup lang="ts">
import SideMenu from './views/SideMenu.vue'

import { fontsLoaded } from './modules/webfontloader'
import BaseContainer from './components/containers/BaseContainer.vue'
</script>

<template>
  <BaseContainer v-show="fontsLoaded">
    <template #nav>
      <SideMenu   class="bg-gray-800" />
    </template>

    <RouterView v-slot="{ Component }">
      <template v-if="Component">
        <Transition name="fade" mode="out-in">
          <Suspense timeout="0" :suspensible="false">
            <!-- Main route content -->
            <component :is="Component" />
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
  </BaseContainer>
</template>

<style scoped lang="scss" src="@/assets/css/app.scss"></style>

<style lang="scss" scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
