<script lang="ts" setup async>
import { useThreeRenderer } from '@/composables/useThreeRenderer'
import { ref } from 'vue'

const threeContainer = ref<HTMLDivElement | null>(null)

const threeApp = useThreeRenderer({
  camera: {
    position: [
      0,
      0,
      5,
    ],
  },
})

await threeApp.init()
</script>

<template>
  <div class="p-5" ref="threeContainer">Hello</div>
</template>

<style></style>
