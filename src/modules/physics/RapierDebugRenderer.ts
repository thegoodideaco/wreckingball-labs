import type RAPIER from '@dimforge/rapier3d'
import * as THREE from 'three'

export class RapierDebugRenderer {
  mesh: THREE.LineSegments
  world: RAPIER.World
  enabled = true

  constructor(scene: THREE.Scene, world: RAPIER.World) {
    this.world = world
    this.mesh = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 'lime' }),
    )
    this.mesh.frustumCulled = false
    scene.add(this.mesh)
  }

  update() {
    if (this.enabled) {
      const { vertices } = this.world.debugRender()
      this.mesh.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      this.mesh.visible = true
    } else {
      this.mesh.visible = false
    }
  }
}
