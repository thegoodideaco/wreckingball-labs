<script lang="ts" setup>
import { until, useElementSize, useEventListener } from '@vueuse/core'
import { DRACOLoader, GLTFLoader, OrbitControls } from 'three/examples/jsm/Addons.js'
import * as THREE from 'three/webgpu'
import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue'

import matcapImage from '@/assets/img/matcap@2x.webp'

import wb_glb from '@/assets/glb/wb.glb?url'
import wb_glb_points from '@/assets/glb/wb-points.glb?url'
import * as tsl from 'three/tsl'

import { Inspector } from 'three/addons/inspector/Inspector.js'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGPURenderer({
  antialias: true,
})

const containerElement = ref<HTMLDivElement | null>(null)
const containerSize = useElementSize(containerElement)

async function init() {
  await until(containerElement).not.toBeNull()

  await renderer.init()

  // debugger

  containerSize.width.value = containerElement.value!.clientWidth
  containerSize.height.value = containerElement.value!.clientHeight

  watch(
    [
      containerSize.width,
      containerSize.height,
    ],
    () => {
      renderer.setSize(containerSize.width.value, containerSize.height.value)
      renderer.render(scene, camera)
    },
    {
      immediate: true,
    },
  )

  containerElement.value?.appendChild(renderer.domElement)

  const aspect = computed(() => containerSize.width.value / containerSize.height.value)
  watchEffect(() => {
    camera.aspect = aspect.value
    camera.updateProjectionMatrix()
  })

  useEventListener(window, 'resize', () => {
    renderer.render(scene, camera)
  })

  const material = new THREE.MeshMatcapNodeMaterial()

  const textureLoader = new THREE.TextureLoader()
  const matcapTexture = await textureLoader.loadAsync(matcapImage)
  matcapTexture.colorSpace = THREE.SRGBColorSpace
  material.matcap = matcapTexture

  const glbLoader = new GLTFLoader()
  glbLoader.dracoLoader = new DRACOLoader()
  glbLoader.dracoLoader.setDecoderPath('/draco/')
  glbLoader.dracoLoader.setDecoderConfig({ type: 'js' })

  const gltf = await glbLoader.loadAsync(wb_glb)
  const wreckingBall = gltf.scene.getObjectByProperty('isMesh', true) as THREE.Mesh
  wreckingBall.material = material

  const newMat = createMaterial()

  newMat.matcap = matcapTexture

  wreckingBall.material = newMat

  Object.assign(window, {
    THREE,
  })

  const _inspector = new Inspector()
  renderer.inspector = _inspector

  // renderer.inspector.setActiveExtension( 'TSL Graph', true )

  _inspector.onExtension('TSL Graph', (tslGraph) => {
    console.log('TSL Graph Extension Initialized:', tslGraph)
  })

  _inspector.init()

  _inspector.setActiveExtension('TSL Graph', true)

  _inspector.hide()

  // duck.scale.set(0.01, 0.01, 0.01)
  scene.add(wreckingBall)

  const pointsGlb = await glbLoader.loadAsync(wb_glb_points)

  const wbPoints = pointsGlb.scene.getObjectByProperty('isPoints', true) as THREE.Points

  const pointsMaterial = new THREE.PointsNodeMaterial({
    size:            0.05,
    sizeAttenuation: true,
    alphaTest:       0.5,
    colorNode:       tsl.positionGeometry.mul(0.5).add(0.5),
  })
  wbPoints.material = pointsMaterial
  scene.add(wbPoints)

  wbPoints.position.set(0, 0, 0)

  const controls = new OrbitControls(camera, renderer.domElement)

  controls.enableDamping = true
  controls.dampingFactor = 0.2

  camera.position.z = 5

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
    wreckingBall,
  })

  return () => {
    renderer.setAnimationLoop(null)
    controls.disconnect()
    controls.enabled = false
    controls.dispose()

    renderer.dispose()
    scene.clear()
    delete (window as any).scene
    delete (window as any).camera
    delete (window as any).renderer
    delete (window as any).wreckingBall
  }
}

function createMaterial() {
  const material = new THREE.MeshMatcapNodeMaterial()

  const seedAttribute = tsl.attribute<'int'>('seed')
  const displaceNormalAttribute = tsl.attribute<'vec3'>('displaceNormal')

  const localTime = tsl.attribute<'float'>('time').add(tsl.time)

  const effector1 = tsl.uniform(camera.position).toVar()
  const effector2 = tsl.uniform(camera.position.clone()).toVar()

  effector1.toVar('effector1')

  const distance1 = tsl.distance(tsl.positionLocal, tsl.modelWorldMatrixInverse.mul(effector1))
  const distance2 = tsl.distance(tsl.positionLocal, tsl.modelWorldMatrixInverse.mul(effector2))

  const invDistance1 = tsl.max(0.0, tsl.float(20.0).sub(distance1)).div(2.0)
  const invDistance2 = tsl.max(0.0, tsl.float(20.0).sub(distance2)).div(2.0)

  const s = tsl
    .abs(tsl.sin(localTime.mul(2).add(seedAttribute)).mul(0.5))
    .add(invDistance1)
    .add(invDistance2)

  material.positionNode = tsl.positionLocal.add(displaceNormalAttribute.mul(s))

  // material.colorNode = tsl.normalLocal
  // material.fragmentNode = tsl.color(1, 0.5, 0.25)

  return material
}

let _cleanup: (() => void) | null = null

init().then((cleanup) => {
  _cleanup = cleanup
})

onBeforeUnmount(() => {
  _cleanup?.()
})
</script>

<template>
  <div ref="containerElement"></div>
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
