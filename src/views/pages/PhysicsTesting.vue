<script lang="ts" setup>


import { until, useElementSize, useEventListener } from '@vueuse/core'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue'

import * as loaders from '@/modules/three-loaders'

import matcapImage from '@/assets/img/matcap@2x.webp'

import wb_glb from '@/assets/glb/wb.glb?url'
import gsap from 'gsap'


const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha:     true,
})



const containerElement = ref<HTMLDivElement | null>(null)
const containerSize = useElementSize(containerElement)



async function init() {
  await until(containerElement).not.toBeNull()

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

  const material = new THREE.MeshMatcapMaterial()
  scene.add(camera)



  const matcapTexture = await loaders.textureLoader.loadAsync(matcapImage)
  matcapTexture.colorSpace = THREE.SRGBColorSpace
  material.matcap  = matcapTexture



  const gltf = await loaders.glbLoader.loadAsync(wb_glb)
  const duck = gltf.scene.getObjectByProperty('isMesh', true) as THREE.Mesh
  duck.material = material
  // duck.scale.set(0.01, 0.01, 0.01)
  scene.add(duck)

  const controls = new OrbitControls(camera, renderer.domElement)

  controls.enableDamping = true
  controls.dampingFactor = 0.1


  camera.position.z = 15


  const ticker = new THREE.Timer()
  ticker.connect(document)


  function animate() {

    ticker.update()

    renderer.render(scene, camera)

    controls.update()
  }

  renderer.setAnimationLoop(animate)




  Object.assign(window, {
    scene,
    camera,
    renderer,
    duck,
  })


  return () => {


    renderer.setAnimationLoop(null)

    renderer.dispose()

    controls.disconnect()
    controls.dispose()

    scene.clear()

    delete (window as any).scene
    delete (window as any).camera
    delete (window as any).renderer
    delete (window as any).duck

  }




}



async function animate() {
  const ball = scene.getObjectByProperty('isMesh', true) as THREE.Mesh


  gsap.fromTo(ball!.position,
    {
    // x:        Math.PI * 2,
    // y:        Math.PI * 2,
      z: camera.position.z,
    },
    {
      z:        0,
      duration: 2,
      ease:     'expo.out',
    },
  )

  gsap.to(ball!.rotation, {
    y:        Math.PI * 2,
    duration: 6,
    ease:     'none',
    repeat:   -1,
  })

}

let _cleanup: (() => void) | null = null

init().then((cleanup) => {
  _cleanup = cleanup
  animate()
})


onBeforeUnmount(() => {
  _cleanup?.()
})


</script>

<template>
  <div>
    <div ref="containerElement" class="w-full h-full absolute">
    </div>


    <div class="overlay">
      <span>wreckingball</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
::v-deep(canvas) {
  display: block;
  background: url('@/assets/img/grid.webp') repeat fixed;
  position: absolute;
  width: 100%;
  height: 100%;
}
</style>
