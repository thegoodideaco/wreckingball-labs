<script lang="ts" setup>
import RAPIER from '@dimforge/rapier3d'
import * as THREE from 'three'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { useThreeRenderer } from '@/composables/useThreeRenderer'
import { OrbitControls } from 'three/examples/jsm/Addons.js'

const props = withDefaults(
  defineProps<{
    cubeCount?: number
    cubeSize?: number
    obstacleCubeSize?: number
    ropeCubeSize?: number
    ropeTightness?: number
    wreckingBallMass?: number
  }>(),
  {
    cubeCount: 10,
    obstacleCubeSize: 3.45,
    ropeTightness: 1.1,
    wreckingBallMass: 520,
  },
)

const viewportRef = ref<HTMLElement | null>(null)

/**
 * Represents a single physics-enabled 3D object in the scene.
 * Links a Three.js mesh for rendering with a Rapier rigid body for physics simulation.
 */
type PhysicsObject = {
  dragMode: 'direct' | 'joint'
  initialPosition: THREE.Vector3Tuple
  initialRotation: THREE.QuaternionTuple
  mesh: THREE.Mesh
  body: RAPIER.RigidBody
  ropeAnchorLocal: THREE.Vector3Tuple
}

type PhysicsBoxOptions = {
  angularDamping?: number
  density?: number
  friction?: number
  linearDamping?: number
  randomAngularVelocity?: boolean
  restitution?: number
}

/**
 * Represents a rope connection between two physics objects.
 * Stores references to connected bodies and a line mesh for visual representation.
 */
type RopeSegment = {
  from: PhysicsObject
  to: PhysicsObject
  line: THREE.Line
}

/**
 * Records a single point in time during a drag operation.
 * Used to calculate throw velocity from pointer motion history.
 */
type DragSample = {
  point: THREE.Vector3
  time: number
}

/**
 * Tracks the state of an active grab operation.
 * Maintains the kinematic handle body, constraint joint, and motion history
 * used for smooth dragging and throw velocity calculation.
 */
type DragState = {
  body: RAPIER.RigidBody
  handleBody?: RAPIER.RigidBody
  joint?: RAPIER.ImpulseJoint
  mode: 'direct' | 'joint'
  targetPoint: THREE.Vector3
  targetY: number
  plane: THREE.Plane
  samples: DragSample[]
}

// Renderer configuration and state
const {
  camera,
  scene,
  init,
  mount,
  render,
  renderer: _renderer,
} = useThreeRenderer({
  clearColor: '#020617',
  autoStart: false,
  camera: {
    position: [0, 1.6, 3.2],
    lookAt: [0, 0, 0],
    fov: 90,
  },
})

// Global scene state
let frameId = 0
let controller: OrbitControls | null = null
let world: RAPIER.World | null = null
let dragState: DragState | null = null

// Raycasting for pointer-based object selection
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const dragIntersection = new THREE.Vector3()

// Scene object and constraint management
const physicsObjects: PhysicsObject[] = []
const ropeSegments: RopeSegment[] = []

const getCubeCount = (value: number) => Math.max(1, Math.floor(value))
const getCubeSize = (value: number) => Math.max(0.1, value)
const getMinValue = (value: number, minimum: number) => Math.max(minimum, value)
const defaultCubeSize = 0.45
const sharedCubeSize = getCubeSize(props.cubeSize ?? defaultCubeSize)

// Physics and drag tuning parameters
const maxThrowSpeed = 7
const throwVelocityScale = 0.35
const ropeBoxSize = getCubeSize(props.ropeCubeSize ?? sharedCubeSize)
const _ropeBoxHalfExtent = ropeBoxSize / 2
const obstacleBoxSize = getCubeSize(props.obstacleCubeSize ?? sharedCubeSize)
const obstacleBoxHalfExtent = obstacleBoxSize / 2
const wreckingBallRadius = 1.42
const floorThickness = 0.2
const floorSize = 50
const floorTopY = -0.9
const floorCenterY = floorTopY - floorThickness / 2
const resetThresholdY = floorCenterY - 6000
const ropeLength = ropeBoxSize * getMinValue(props.ropeTightness, 0.1)
const wreckingBallDensity = getMinValue(props.wreckingBallMass, 1)
const obstacleStackCount = 24
const obstacleMinStackHeight = 2
const obstacleMaxStackHeight = 6
const obstacleMinStackSpacing = obstacleBoxSize * 2.3
const obstacleSpawnPadding = 4
const obstacleClearRadius = 7
const ropeAnchorSize = Math.max(ropeBoxSize * 0.4, 0.2)
const defaultCubeColor = '#22d3ee'
const cubeColors = [defaultCubeColor, '#38bdf8', '#67e8f9', '#7dd3fc', '#bae6fd'] as const
const obstacleColors = ['#f59e0b', '#f97316', '#fb7185', '#ef4444', '#fdba74'] as const

const getWreckingBallClearance = () => {
  const averageObstacleStackHeight =
    ((obstacleMinStackHeight + obstacleMaxStackHeight) / 2) * obstacleBoxSize

  return randomBetween(averageObstacleStackHeight * 0.45, averageObstacleStackHeight * 0.55)
}

const getRopeAnchorPosition = (cubeCount: number): THREE.Vector3Tuple => {
  const wreckingBallCenterY = floorTopY + wreckingBallRadius + getWreckingBallClearance()

  return [0, wreckingBallCenterY + ropeLength * (cubeCount + 1) + wreckingBallRadius, 0]
}

const getCubePosition = (
  index: number,

  _cubeCount: number,
  ropeAnchorPosition: THREE.Vector3Tuple,
): THREE.Vector3Tuple => {
  const [anchorX, anchorY, anchorZ] = ropeAnchorPosition
  const xOffset = anchorX
  const yOffset = anchorY - ropeLength * (index + 1)
  const zOffset = anchorZ

  return [xOffset, yOffset, zOffset]
}

const getWreckingBallPosition = (
  cubeCount: number,
  ropeAnchorPosition: THREE.Vector3Tuple,
): THREE.Vector3Tuple => {
  const [lastCubeX, lastCubeY, lastCubeZ] = getCubePosition(
    cubeCount - 1,
    cubeCount,
    ropeAnchorPosition,
  )

  return [lastCubeX, lastCubeY - ropeLength - wreckingBallRadius, lastCubeZ]
}

const getAnchorWorldPosition = ({ mesh, ropeAnchorLocal }: PhysicsObject) =>
  mesh.localToWorld(new THREE.Vector3(...ropeAnchorLocal))

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min

const randomIntBetween = (min: number, max: number) => Math.floor(randomBetween(min, max + 1))

const getRandomStackBases = (count: number): THREE.Vector3Tuple[] => {
  const bases: THREE.Vector3Tuple[] = []
  const min = -floorSize / 2 + obstacleSpawnPadding
  const max = floorSize / 2 - obstacleSpawnPadding

  for (let attempts = 0; attempts < count * 30 && bases.length < count; attempts += 1) {
    const candidateX = randomBetween(min, max)
    const candidateZ = randomBetween(min, max)
    const isNearChain = Math.hypot(candidateX, candidateZ) < obstacleClearRadius
    const overlapsExisting = bases.some(
      ([x, , z]) => Math.hypot(candidateX - x, candidateZ - z) < obstacleMinStackSpacing,
    )

    if (isNearChain || overlapsExisting) {
      continue
    }

    bases.push([candidateX, floorTopY + obstacleBoxHalfExtent, candidateZ])
  }

  return bases
}

/**
 * Converts a pointer event's screen coordinates to normalized device coordinates (-1 to 1).
 * Used by the raycaster to cast rays from the camera through the viewport.
 */
const setPointerFromEvent = (event: PointerEvent, element: HTMLElement) => {
  const rect = element.getBoundingClientRect()

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}

/**
 * Synchronizes Three.js mesh transforms with Rapier physics body states.
 * This is called each frame after physics simulation to keep rendering in sync with the world state.
 * Also updates rope line geometry to connect the visual representations of linked objects.
 */
const syncPhysicsMeshes = () => {
  // Update mesh positions and rotations from physics bodies
  for (const { mesh, body } of physicsObjects) {
    const position = body.translation()
    const rotation = body.rotation()

    mesh.position.set(position.x, position.y, position.z)
    mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
  }

  // Update rope line segments to follow connected mesh positions
  for (const { from, to, line } of ropeSegments) {
    const positions = line.geometry.getAttribute('position') as THREE.BufferAttribute | undefined

    if (!positions) {
      continue
    }

    const fromAnchor = getAnchorWorldPosition(from)
    const toAnchor = getAnchorWorldPosition(to)

    positions.setXYZ(0, fromAnchor.x, fromAnchor.y, fromAnchor.z)
    positions.setXYZ(1, toAnchor.x, toAnchor.y, toAnchor.z)
    positions.needsUpdate = true
  }
}

/**
 * Cleans up the active drag operation by removing the temporary kinematic handle body
 * and the joint that linked it to the grabbed physics object.
 */
const clearDragState = () => {
  if (!world || !dragState) {
    dragState = null
    return
  }

  if (dragState.mode === 'joint' && dragState.joint && dragState.handleBody) {
    world.removeImpulseJoint(dragState.joint, true)
    world.removeRigidBody(dragState.handleBody)
  }

  dragState = null
}

const resetPhysicsObject = ({ body, initialPosition, initialRotation }: PhysicsObject) => {
  body.setTranslation({ x: initialPosition[0], y: initialPosition[1], z: initialPosition[2] }, true)
  body.setRotation(
    {
      x: initialRotation[0],
      y: initialRotation[1],
      z: initialRotation[2],
      w: initialRotation[3],
    },
    true,
  )
  body.setLinvel({ x: 0, y: 0, z: 0 }, true)
  body.setAngvel({ x: 0, y: 0, z: 0 }, true)
  body.wakeUp()
}

const resetSceneObjects = () => {
  clearDragState()

  for (const physicsObject of physicsObjects) {
    resetPhysicsObject(physicsObject)
  }

  if (controller) {
    controller.enabled = true
  }

  syncPhysicsMeshes()
}

/**
 * Releases a grabbed object and applies a throw velocity based on recent pointer motion.
 * Calculates velocity from the oldest and newest samples in the drag history,
 * scales it down, and clamps it to prevent excessive speeds.
 * Re-enables orbit controls after release.
 */
const releaseDraggedBody = () => {
  if (!dragState) {
    return
  }

  const { body, samples } = dragState
  const latestSample = samples.at(-1)
  const earliestSample = samples[0]

  // Calculate throw velocity from motion history
  if (
    dragState.mode === 'joint' &&
    latestSample &&
    earliestSample &&
    latestSample.time > earliestSample.time
  ) {
    const delta = latestSample.point.clone().sub(earliestSample.point)
    const deltaSeconds = (latestSample.time - earliestSample.time) / 1000
    const throwVelocity = delta.multiplyScalar(throwVelocityScale / deltaSeconds)

    // Clamp velocity to prevent explosive throws
    if (throwVelocity.length() > maxThrowSpeed) {
      throwVelocity.setLength(maxThrowSpeed)
    }

    body.setLinvel(
      {
        x: throwVelocity.x,
        y: throwVelocity.y,
        z: throwVelocity.z,
      },
      true,
    )
  }

  clearDragState()

  // Restore camera controls
  if (controller) {
    controller.enabled = true
  }
}

// Cleanup on component unmount
onBeforeUnmount(() => {
  if (frameId) {
    cancelAnimationFrame(frameId)
    frameId = 0
  }

  clearDragState()

  controller?.dispose()
  controller = null

  world?.free()
  world = null
})

// Scene setup and initialization
onMounted(() => {
  if (!viewportRef.value) {
    return
  }

  init()
  mount(viewportRef.value)

  if (!scene.value || !camera.value) {
    return
  }

  const viewport = viewportRef.value

  // Create the ground plane
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(floorSize, floorThickness, floorSize),
    new THREE.MeshStandardMaterial({ color: '#0f172a' }),
  )
  floor.position.y = floorCenterY
  floor.receiveShadow = true

  // Set up lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2)
  keyLight.position.set(3, 6, 4)

  scene.value.add(floor, ambientLight, keyLight)

  // Initialize orbit camera controls
  controller = new OrbitControls(camera.value, viewport)
  controller.enableDamping = true

  // Create Rapier physics world with gravity
  world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })

  // Create static ground collider
  const floorBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, floorCenterY, 0),
  )
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(floorSize / 2, floorThickness / 2, floorSize / 2),
    floorBody,
  )

  /**
   * Creates a dynamic cube in the scene with physics enabled.
   * Returns the PhysicsObject so it can be referenced for rope connections.
   */
  const createPhysicsBox = (
    position: THREE.Vector3Tuple,
    color: string,
    size: number,
    options: PhysicsBoxOptions = {},
  ) => {
    const halfExtent = size / 2
    const {
      angularDamping = 0.9,
      density = 120,
      friction = 0.85,
      linearDamping = 0.9,
      randomAngularVelocity = true,
      restitution = 0.06,
    } = options

    // Create visual mesh
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshStandardMaterial({ color }),
    )

    mesh.castShadow = true
    scene.value?.add(mesh)

    // Create physics body with damping to prevent jitter
    const body = world?.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(...position)
        .setLinearDamping(linearDamping)
        .setAngularDamping(angularDamping)
        .setCanSleep(false),
    )

    if (!body) {
      return
    }

    // Attach collider with restitution for bouncing
    world?.createCollider(
      RAPIER.ColliderDesc.cuboid(halfExtent, halfExtent, halfExtent)
        .setRestitution(restitution)
        .setFriction(friction)
        .setDensity(density),
      body,
    )

    if (randomAngularVelocity) {
      // Give it random initial spin
      body.setAngvel(
        {
          x: Math.random() * 0.25,
          y: Math.random() * 0.12,
          z: Math.random() * 0.25,
        },
        true,
      )
    }

    const physicsObject = {
      dragMode: 'joint' as const,
      initialPosition: position,
      initialRotation: [0, 0, 0, 1] as THREE.QuaternionTuple,
      mesh,
      body,
      ropeAnchorLocal: [0, 0, 0] as THREE.Vector3Tuple,
    }
    physicsObjects.push(physicsObject)

    return physicsObject
  }

  const createRopeAnchor = (position: THREE.Vector3Tuple) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(ropeAnchorSize, 24, 24),
      new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        emissive: '#94a3b8',
        emissiveIntensity: 0.35,
        metalness: 0.25,
        roughness: 0.4,
      }),
    )

    mesh.castShadow = true
    scene.value?.add(mesh)

    const body = world?.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(...position)
        .setCanSleep(false),
    )

    if (!body) {
      return
    }

    world?.createCollider(RAPIER.ColliderDesc.ball(ropeAnchorSize).setDensity(1), body)

    const physicsObject = {
      dragMode: 'direct' as const,
      initialPosition: position,
      initialRotation: [0, 0, 0, 1] as THREE.QuaternionTuple,
      mesh,
      body,
      ropeAnchorLocal: [0, 0, 0] as THREE.Vector3Tuple,
    }
    physicsObjects.push(physicsObject)

    return physicsObject
  }

  const createWreckingBall = (position: THREE.Vector3Tuple) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(wreckingBallRadius, 32, 32),
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        metalness: 0.65,
        roughness: 0.35,
      }),
    )

    mesh.castShadow = true
    scene.value?.add(mesh)

    const body = world?.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(...position)
        .setLinearDamping(0.45)
        .setAngularDamping(0.6)
        .setCanSleep(false),
    )

    if (!body) {
      return
    }

    world?.createCollider(
      RAPIER.ColliderDesc.ball(wreckingBallRadius)
        .setRestitution(0.04)
        .setFriction(0.95)
        .setDensity(wreckingBallDensity),
      body,
    )

    const physicsObject = {
      dragMode: 'joint' as const,
      initialPosition: position,
      initialRotation: [0, 0, 0, 1] as THREE.QuaternionTuple,
      mesh,
      body,
      ropeAnchorLocal: [0, wreckingBallRadius, 0] as THREE.Vector3Tuple,
    }
    physicsObjects.push(physicsObject)

    return physicsObject
  }

  const cubeCount = getCubeCount(props.cubeCount)
  const ropeAnchorPosition = getRopeAnchorPosition(cubeCount)
  const ropeAnchor = createRopeAnchor(ropeAnchorPosition)
  const cubes = Array.from({ length: cubeCount }, (_, index) => {
    const color = cubeColors[index % cubeColors.length] ?? cubeColors[0]

    return createPhysicsBox(
      getCubePosition(index, cubeCount, ropeAnchorPosition),
      color,
      ropeBoxSize,
    )
  })

  const obstacleBases = getRandomStackBases(obstacleStackCount)

  for (const [baseX, baseY, baseZ] of obstacleBases) {
    const stackHeight = randomIntBetween(obstacleMinStackHeight, obstacleMaxStackHeight)

    for (let level = 0; level < stackHeight; level += 1) {
      const colorIndex = (level + Math.floor(Math.abs(baseX + baseZ))) % obstacleColors.length
      const color = obstacleColors[colorIndex] ?? obstacleColors[0]

      createPhysicsBox([baseX, baseY + level * obstacleBoxSize, baseZ], color, obstacleBoxSize, {
        angularDamping: 0.7,
        density: 95,
        friction: 0.9,
        linearDamping: 0.5,
        randomAngularVelocity: false,
        restitution: 0.02,
      })
    }
  }

  const wreckingBall = createWreckingBall(getWreckingBallPosition(cubeCount, ropeAnchorPosition))

  /**
   * Creates a rope constraint between two physics objects and adds a visual line to represent it.
   * The rope has a fixed maximum length and keeps the objects from drifting too far apart.
   */
  const createRopeSegment = (from: PhysicsObject | undefined, to: PhysicsObject | undefined) => {
    if (!from || !to || !world || !scene.value) {
      return
    }

    // Create the physics rope joint
    world.createImpulseJoint(
      RAPIER.JointData.rope(
        ropeLength,
        { x: from.ropeAnchorLocal[0], y: from.ropeAnchorLocal[1], z: from.ropeAnchorLocal[2] },
        { x: to.ropeAnchorLocal[0], y: to.ropeAnchorLocal[1], z: to.ropeAnchorLocal[2] },
      ),
      from.body,
      to.body,
      true,
    )

    // Create a visual line to show the rope
    const geometry = new THREE.BufferGeometry().setFromPoints([
      getAnchorWorldPosition(from),
      getAnchorWorldPosition(to),
    ])
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: '#e2e8f0', transparent: true, opacity: 0.8 }),
    )

    scene.value.add(line)
    ropeSegments.push({ from, to, line })
  }

  // Connect cubes with rope joints in a chain
  createRopeSegment(ropeAnchor, cubes[0])
  for (let index = 0; index < cubes.length - 1; index += 1) {
    createRopeSegment(cubes[index], cubes[index + 1])
  }
  createRopeSegment(cubes.at(-1), wreckingBall)
  syncPhysicsMeshes()

  /**
   * Records a point in the drag motion history for throw velocity calculation.
   * Keeps a rolling buffer of up to 6 recent samples to smooth velocity estimates.
   */
  const addDragSample = (point: THREE.Vector3) => {
    if (!dragState) {
      return
    }

    dragState.samples.push({ point: point.clone(), time: performance.now() })

    // Keep only the most recent samples
    if (dragState.samples.length > 6) {
      dragState.samples.shift()
    }
  }

  /**
   * Updates the drag target point by raycasting the pointer position onto the drag plane.
   * The plane is perpendicular to the camera and passes through the initial grab point.
   */
  const updateDragTarget = (event: PointerEvent) => {
    if (!dragState || !camera.value) {
      return
    }

    setPointerFromEvent(event, viewport)
    raycaster.setFromCamera(pointer, camera.value)

    if (!raycaster.ray.intersectPlane(dragState.plane, dragIntersection)) {
      return
    }

    dragState.targetPoint.copy(dragIntersection)
    addDragSample(dragIntersection)
  }

  /**
   * Initiates a grab operation on the physics object under the pointer.
   * Creates a kinematic handle body at the hit point, links it to the grabbed object
   * with a spherical joint, and sets up drag tracking.
   */
  const startDrag = (event: PointerEvent) => {
    if (!camera.value || !world) {
      return
    }

    // Raycast to find which object was clicked
    setPointerFromEvent(event, viewport)
    raycaster.setFromCamera(pointer, camera.value)

    const intersections = raycaster.intersectObjects(
      physicsObjects.map(({ mesh }) => mesh),
      false,
    )

    const hit = intersections[0]

    if (!hit || !(hit.object instanceof THREE.Mesh)) {
      return
    }

    const physicsObject = physicsObjects.find(({ mesh }) => mesh === hit.object)

    if (!physicsObject) {
      return
    }

    const targetY = physicsObject.initialPosition[1]

    if (physicsObject.dragMode === 'direct') {
      dragState = {
        body: physicsObject.body,
        mode: 'direct',
        targetPoint: new THREE.Vector3(hit.point.x, targetY, hit.point.z),
        targetY,
        plane: new THREE.Plane().setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, targetY, 0),
        ),
        samples: [],
      }

      controller!.enabled = false
      viewport.setPointerCapture(event.pointerId)
      return
    }

    // Create a kinematic body that will be controlled by pointer position
    const localGrabPoint = physicsObject.mesh.worldToLocal(hit.point.clone())
    const handleBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(hit.point.x, hit.point.y, hit.point.z)
        .setCanSleep(false),
    )

    // Connect the handle to the grabbed object with a spherical joint
    const joint = world.createImpulseJoint(
      RAPIER.JointData.spherical(
        { x: 0, y: 0, z: 0 },
        { x: localGrabPoint.x, y: localGrabPoint.y, z: localGrabPoint.z },
      ),
      handleBody,
      physicsObject.body,
      true,
    )

    // Initialize drag state
    dragState = {
      body: physicsObject.body,
      handleBody,
      joint,
      mode: 'joint',
      targetPoint: hit.point.clone(),
      targetY,
      plane: new THREE.Plane().setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, targetY, 0),
      ),
      samples: [],
    }

    addDragSample(hit.point)
    dragIntersection.y = dragState.targetY
    controller!.enabled = false
    viewport.setPointerCapture(event.pointerId)
  }

  // Pointer event handlers
  const handlePointerDown = (event: PointerEvent) => {
    startDrag(event)
  }

  const handlePointerMove = (event: PointerEvent) => {
    updateDragTarget(event)
  }

  const handlePointerUp = (event: PointerEvent) => {
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId)
    }

    releaseDraggedBody()
  }

  const handlePointerLeave = (event: PointerEvent) => {
    if (dragState) {
      handlePointerUp(event)
    }
  }

  // Attach pointer event listeners
  viewport.addEventListener('pointerdown', handlePointerDown)
  viewport.addEventListener('pointermove', handlePointerMove)
  viewport.addEventListener('pointerup', handlePointerUp)
  viewport.addEventListener('pointerleave', handlePointerLeave)
  window.addEventListener('pointerup', handlePointerUp)

  /**
   * Main animation loop: updates physics, syncs meshes, and renders each frame.
   * During drag operations, positions the kinematic handle body to follow the pointer.
   */
  const animate = () => {
    if (!world) {
      return
    }

    // Move the kinematic handle body to follow the pointer during drag
    if (dragState) {
      const nextTranslation = {
        x: dragState.targetPoint.x,
        y: dragState.targetPoint.y,
        z: dragState.targetPoint.z,
      }

      if (dragState.mode === 'joint' && dragState.handleBody) {
        dragState.handleBody.setNextKinematicTranslation(nextTranslation)
      }

      if (dragState.mode === 'direct') {
        dragState.body.setNextKinematicTranslation(nextTranslation)
      }
    }

    // Step the physics simulation
    world.step()

    if (physicsObjects.some(({ body }) => body.translation().y < resetThresholdY)) {
      resetSceneObjects()
    }

    // Sync Three.js meshes with physics state
    syncPhysicsMeshes()
    // Update orbit controls
    controller?.update()

    // Render the frame
    render()
    frameId = requestAnimationFrame(animate)
  }

  animate()

  // Clean up pointer event listeners on unmount
  onBeforeUnmount(() => {
    viewport.removeEventListener('pointerdown', handlePointerDown)
    viewport.removeEventListener('pointermove', handlePointerMove)
    viewport.removeEventListener('pointerup', handlePointerUp)
    viewport.removeEventListener('pointerleave', handlePointerLeave)
    window.removeEventListener('pointerup', handlePointerUp)
  })
})
</script>

<template>
  <section class="home-view">
    <div ref="viewportRef" data-testid="home-three-viewport" class="home-viewport"></div>
  </section>
</template>

<style scoped>
.home-view {
  height: 100%;
  /* padding: 1rem; */
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.home-title {
  font-size: 1.75rem;
  line-height: 1.2;
  font-weight: 700;
}

.home-viewport {
  flex: 1;
  min-height: 320px;
  /* border-radius: 0.75rem; */
  overflow: hidden;
  border: 1px solid #0f172a;
}
</style>
