<script setup lang="ts">
import { h, onBeforeUnmount, onMounted, ref, useSlots } from 'vue'
import * as THREE from 'three'

import { renderThreeScene } from './threeRenderer'

type ThreeCanvasProps = {
  clearColor?: THREE.ColorRepresentation
  cameraPosition?: THREE.Vector3Tuple
  cameraFov?: number
}

const props = withDefaults(defineProps<ThreeCanvasProps>(), {
  clearColor: '#0b1220',
  cameraPosition: () => [0, 0, 5],
  cameraFov: 60,
})

const slots = useSlots()
let rafId = 0
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
const viewportRef = ref<HTMLElement | null>(null)

const animate = () => {
  if (!scene || !camera || !renderer) {
    return
  }

  renderer.render(scene, camera)
  rafId = requestAnimationFrame(animate)
}

const resize = () => {
  if (!viewportRef.value || !camera || !renderer) {
    return
  }

  const width = viewportRef.value.clientWidth || 1
  const height = viewportRef.value.clientHeight || 1

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
}

onMounted(() => {
  if (!viewportRef.value) {
    return
  }

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(props.cameraFov, 1, 0.1, 1000)
  camera.position.set(...props.cameraPosition)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setClearColor(props.clearColor)

  viewportRef.value.appendChild(renderer.domElement)

  const children = slots.default?.() ?? []
  renderThreeScene(h('group', {}, children), scene)

  resize()
  window.addEventListener('resize', resize)
  animate()
})

onBeforeUnmount(() => {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }

  window.removeEventListener('resize', resize)

  if (scene) {
    renderThreeScene(null, scene)
  }

  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  renderer?.dispose()
  renderer = null
  camera = null
  scene = null
})
</script>

<template>
  <div ref="viewportRef" class="three-canvas" data-testid="three-canvas"></div>
</template>

<style scoped>
.three-canvas {
  width: 100%;
  height: 100%;
}
</style>
