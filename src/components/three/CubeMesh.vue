<script setup lang="ts">
import * as THREE from 'three'

type BoxGeometryArgs = [
  width?: number,
  height?: number,
  depth?: number,
  widthSegments?: number,
  heightSegments?: number,
  depthSegments?: number,
]

type CubeMeshProps = {
  name?: string
  position?: THREE.Vector3Tuple
  rotation?: THREE.Vector3Tuple
  quaternion?: [x: number, y: number, z: number, w: number]
  scale?: THREE.Vector3Tuple
  visible?: boolean
  castShadow?: boolean
  receiveShadow?: boolean
  renderOrder?: number
  frustumCulled?: boolean
  userData?: Record<string, unknown>
  geometryArgs?: BoxGeometryArgs
  color?: THREE.ColorRepresentation
  wireframe?: boolean
  transparent?: boolean
  opacity?: number
  metalness?: number
  roughness?: number
}

const props = withDefaults(defineProps<CubeMeshProps>(), {
  name: 'cube-mesh',
  position: () => [0, 0, 0],
  rotation: () => [0, 0, 0],
  quaternion: () => [0, 0, 0, 1],
  scale: () => [1, 1, 1],
  visible: true,
  castShadow: false,
  receiveShadow: false,
  renderOrder: 0,
  frustumCulled: true,
  userData: () => ({}),
  geometryArgs: () => [1, 1, 1],
  color: '#4cc9f0',
  wireframe: false,
  transparent: false,
  opacity: 1,
  metalness: 0.2,
  roughness: 0.6,
})
</script>

<template>
  <component
    :is="'mesh'"
    :name="props.name"
    :position="props.position"
    :rotation="props.rotation"
    :quaternion="props.quaternion"
    :scale="props.scale"
    :visible="props.visible"
    :castShadow="props.castShadow"
    :receiveShadow="props.receiveShadow"
    :renderOrder="props.renderOrder"
    :frustumCulled="props.frustumCulled"
    :userData="props.userData"
  >
    <component :is="'boxGeometry'" :args="props.geometryArgs" />
    <component
      :is="'meshStandardMaterial'"
      :color="props.color"
      :wireframe="props.wireframe"
      :transparent="props.transparent"
      :opacity="props.opacity"
      :metalness="props.metalness"
      :roughness="props.roughness"
    />
  </component>
</template>
