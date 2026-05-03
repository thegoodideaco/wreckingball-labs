import RAPIER from '@dimforge/rapier3d'
import { BufferGeometry, Object3D, Vector3 } from 'three'

export interface CreateBodyOptions {
  isStatic?: boolean
  /**
   * Override the collider shape. Defaults to 'auto':
   *  - 'auto'       – picks cuboid from the object's bounding box
   *  - 'convexHull' – builds a convex-hull collider from vertex positions
   *  - 'trimesh'    – builds an exact trimesh collider (non-dynamic only)
   */
  shape?: 'auto' | 'convexHull' | 'trimesh'
}

export interface PhysicsBody {
  rigidBody: RAPIER.RigidBody
  collider: RAPIER.Collider
}

/**
 * Extract a BufferGeometry from either a bare geometry or the first Mesh
 * found inside an Object3D hierarchy.
 */
function extractGeometry(source: Object3D | BufferGeometry): BufferGeometry | null {
  if (source instanceof BufferGeometry) return source

  let geometry: BufferGeometry | null = null
  source.traverse((child: Object3D) => {
    if (geometry) return
    const mesh = child as any
    if (mesh.isMesh && mesh.geometry instanceof BufferGeometry) {
      geometry = mesh.geometry as BufferGeometry
    }
  })
  return geometry
}

export class PhysicsEngine {
  world: RAPIER.World
  scene: import('three').Scene
  extractGeometry: (source: Object3D | BufferGeometry) => BufferGeometry | null
  constructor(scene: import('three').Scene) {
    // Initialize physics engine here

    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })

    this.scene = scene

    this.world = world

    this.extractGeometry = extractGeometry
  }



  update() {
    // Update physics simulation here
    this.world.step()
  }

  /**
   * Create a RAPIER rigid body + collider from a THREE Object3D or BufferGeometry.
   *
   * @param source   - A THREE.Object3D (e.g. Mesh, Group) or a BufferGeometry.
   * @param options  - { isStatic, shape }
   * @returns        The created PhysicsBody, or null if no geometry could be found.
   */
  createBody(source: Object3D | BufferGeometry, options: CreateBodyOptions = {}): PhysicsBody | null {
    const { isStatic = false, shape = 'auto' } = options

    const geometry = extractGeometry(source)
    if (!geometry) return null

    // World-space position from Object3D, or origin for raw geometry
    const position = source instanceof Object3D
      ? source.getWorldPosition(new Vector3())
      : new Vector3()

    // Build the RigidBodyDesc
    const bodyDesc = isStatic
      ? RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z)
      : RAPIER.RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z)

    const rigidBody = this.world.createRigidBody(bodyDesc)

    // Build the ColliderDesc
    let colliderDesc: RAPIER.ColliderDesc

    if (shape === 'trimesh') {
      // Exact triangle mesh – best for static/kinematic bodies
      geometry.computeBoundingBox()
      const pos = geometry.attributes['position']
      if (!pos) return null
      const vertices = new Float32Array(pos.array)
      const index = geometry.index
      const indices = index
        ? new Uint32Array(index.array)
        : Uint32Array.from({ length: vertices.length / 3 }, (_, i) => i)
      colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)

    } else if (shape === 'convexHull') {
      // Convex hull – works for dynamic bodies
      const pos = geometry.attributes['position']
      if (!pos) return null
      const vertices = new Float32Array(pos.array)
      colliderDesc = RAPIER.ColliderDesc.convexHull(vertices) ?? (() => {
        // Fallback to bounding-box cuboid if convex hull fails
        geometry.computeBoundingBox()
        const size = new Vector3()
        geometry.boundingBox!.getSize(size)
        return RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
      })()

    } else {
      // 'auto' – axis-aligned bounding box cuboid
      geometry.computeBoundingBox()
      const size = new Vector3()
      geometry.boundingBox!.getSize(size)
      colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
    }

    const collider = this.world.createCollider(colliderDesc, rigidBody)

    return { rigidBody, collider }
  }
}
