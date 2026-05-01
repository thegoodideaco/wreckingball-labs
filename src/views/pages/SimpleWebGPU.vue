<script lang="ts" setup>


import { until, useElementSize, useEventListener } from '@vueuse/core'
import * as THREE from 'three/webgpu'
import { DRACOLoader, GLTFLoader, OrbitControls } from 'three/examples/jsm/Addons.js'
import { computed, ref, watch, watchEffect } from 'vue'


import matcapImage from '@/assets/img/matcap@2x.webp'

import wb_glb from '@/assets/glb/wb.glb?url'


const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGPURenderer()

const containerElement = ref<HTMLDivElement | null>(null)
const containerSize = useElementSize(containerElement)



async function init() {
  await until(containerElement).not.toBeNull()

  await renderer.init()

  // debugger

  containerSize.width.value = containerElement.value!.clientWidth
  containerSize.height.value = containerElement.value!.clientHeight



  watch([
    containerSize.width,
    containerSize.height,
  ], () => {


    renderer.setSize(containerSize.width.value, containerSize.height.value)
    renderer.render(scene, camera)
  }, {
    immediate: true,
  })


  containerElement.value?.appendChild(renderer.domElement)


  const aspect = computed(() => containerSize.width.value / containerSize.height.value)
  watchEffect(() => {
    camera.aspect = aspect.value
    camera.updateProjectionMatrix()
  })


  useEventListener(window, 'resize', () => {

    renderer.render(scene, camera)
  })

  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshMatcapMaterial()
  const cube = new THREE.Mesh(geometry, material)
  scene.add(cube, camera)


  const textureLoader = new THREE.TextureLoader()
  const matcapTexture = await textureLoader.loadAsync(matcapImage)
  material.matcap  = matcapTexture




  const glbLoader = new GLTFLoader()
  glbLoader.dracoLoader = new DRACOLoader()
  glbLoader.dracoLoader.setDecoderPath('/draco/')
  glbLoader.dracoLoader.setDecoderConfig({ type: 'js' })


  const gltf = await glbLoader.loadAsync(wb_glb)
  const duck = gltf.scene.getObjectByProperty('isMesh', true) as THREE.Mesh
  duck.material = material
  // duck.scale.set(0.01, 0.01, 0.01)
  scene.add(duck)

  const controls = new OrbitControls(camera, renderer.domElement)

  controls.enableDamping = true
  // controls.dampingFactor = 0.05


  camera.position.z = 5


  const ticker = new THREE.Timer()
  ticker.connect(document)


  function animate() {
    requestAnimationFrame(animate)

    ticker.update()

    duck.rotation.x += 0.011 * ticker.getDelta() * 60
    duck.rotation.y += 0.021 * ticker.getDelta() * 60
    duck.rotation.z += 0.001 * ticker.getDelta() * 60

    renderer.render(scene, camera)

    controls.update()
  }


  animate()

  Object.assign(window, {
    scene,
    camera,
    renderer,
    duck,
  })






}

init()


</script>

<template>
  <div ref="containerElement">
  </div>
</template>

<style lang="scss" scoped>
::v-deep(canvas) {
  display: block;
  background-color: purple;
  position: absolute;
  width: 100%;
  height: 100%;
}
</style>
