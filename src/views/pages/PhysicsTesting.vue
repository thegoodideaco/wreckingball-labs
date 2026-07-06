<script lang="ts" setup>
import { until, useElementSize, useEventListener } from '@vueuse/core'
import * as THREE from 'three'
import { Line2, LineGeometry, LineMaterial } from 'three/examples/jsm/Addons.js'
import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue'

import * as RAPIER from '@dimforge/rapier3d'

import * as loaders from '@/modules/three-loaders'

import matcapImage from '@/assets/img/matcaps/matcap@2x.webp'

import wb_glb from '@/assets/glb/wb.glb?url'
import VLink from '@/components/VLink.vue'
import { usePane } from '@/composables/usePane'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import type { FpsGraphBladeApi } from '@tweakpane/plugin-essentials'

gsap.registerPlugin(SplitText)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000)

camera.position.set(-6.465078304793501, 8.152871972394895, 5.295491579145013)

camera.rotation.set(0.05630318882413194, -0.6985168448182596, 0.03623004917942865, 'XYZ')

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha:     true,
})

const containerElement = ref<HTMLDivElement | null>(null)
const overlayElement = ref<HTMLDivElement | null>(null)
const containerSize = useElementSize(containerElement)

async function init() {
  await until(containerElement).not.toBeNull()

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

  const material = new THREE.MeshMatcapMaterial()
  scene.add(camera)

  const matcapTexture = await loaders.textureLoader.loadAsync(matcapImage)
  matcapTexture.colorSpace = THREE.SRGBColorSpace
  material.matcap = matcapTexture

  const gltf = await loaders.glbLoader.loadAsync(wb_glb)
  const duck = gltf.scene.getObjectByProperty('isMesh', true) as THREE.Mesh
  duck.material = material
  // duck.scale.set(0.01, 0.01, 0.01)
  scene.add(duck)

  // const controls = new OrbitControls(camera, renderer.domElement)

  // controls.enableDamping = true
  // controls.dampingFactor = 0.1

  // camera.position.z = 15

  const physics = initPhysics()

  const ballP = generateBodyFromGeometry(physics.world, duck)

  if (ballP) {
    const { body, collider } = ballP
    collider.setDensity(0.1)
    collider.setRestitution(0.5)
    body.recomputeMassPropertiesFromColliders()
    body.setGravityScale(10, true)
    body.setLinearDamping(5)
    body.setAngularDamping(5)
  }

  duck.userData.physics = ballP

  // const yellowSphere = new THREE.Mesh(
  //   new THREE.SphereGeometry(1.9, 26, 26),
  //   new THREE.MeshBasicMaterial({ color: '#FFAD00', side: THREE.BackSide }),
  // )

  // duck.add(yellowSphere)

  physics.chain.appendSegment(0.4, duck.userData.physics.body, 1.2)
  const chainLine = physics.chain.createRopeMesh()

  // duck.material.transparent = true
  // duck.material.opacity = .6

  // physics.chain.bodies.splice(physics.chain.bodies.length - 1)

  // physics.createFloor(physics.world)

  const ticker = new THREE.Timer()
  ticker.connect(document)

  let lastFrameTime = 0
  const targetFrameTime = 1 / 60 // 60 FPS cap

  function step() {

    if(document.visibilityState === 'hidden') {
      return
    }

    ticker.update()

    const delta = ticker.getDelta()
    const currentTime = performance.now()
    const elapsed = currentTime - lastFrameTime

    if(elapsed < targetFrameTime) {
      console.warn('Skipping physics step due to frame time being too short:', elapsed)
    }

    lastFrameTime = currentTime

    // if(delta > 0 && delta < 0.1) {
    //   // physics.world.timestep = delta
    // } else {
    //   console.warn('Delta time is too large or too small, skipping physics step:', delta)
    //   return
    // }

    pane.fpsGraph.begin()




    physics.world.step()
    // physics.world.timestep = delta
    physics.update()
    chainLine.update()
    physics.syncMeshWithBody(duck, duck.userData.physics.body)

    renderer.render(scene, camera)

    pane.fpsGraph.end()
    // controls.update()
  }

  const pane = setupDebug()

  renderer.setAnimationLoop(step)

  Object.assign(window, {
    scene,
    camera,
    renderer,
    duck,
    physics,
  })

  function setupDebug() {
    const { pane, dispose } = usePane({
      title: 'Wreckingball Labs Debug',
    })

    pane.addBinding(physics.debugMesh, 'visible', {
      label: 'Show Physics Debug',
    })

    const damping = {
      get linear() {
        return physics.chain.getLinearDamping()
      },
      set linear(value: number) {
        physics.chain.setLinearDamping(value)
        duck.userData.physics.body.setLinearDamping(value, true)
      },
      get angular() {
        return physics.chain.getAngularDamping()
      },
      set angular(value: number) {
        physics.chain.setAngularDamping(value)
        duck.userData.physics.body.setAngularDamping(value, true)
      },

      get gravScale() {
        return physics.chain.bodies[0]?.gravityScale() ?? 0
      },

      set gravScale(value: number) {
        physics.chain.bodies.forEach((body) => body.setGravityScale(value, true))
        duck.userData.physics.body.setGravityScale(value, true)
      },

      get density() {
        return physics.chain.colliders[0]?.restitution() ?? 0
      },

      set density(value: number) {
        physics.chain.colliders.forEach((collider) => {
          // collider.setDensity(value)
          collider.setRestitution(value)
          const body = collider.parent()
          body?.recomputeMassPropertiesFromColliders()
        })
        // duck.userData.physics.collider.setDensity(value)
        // duck.userData.physics.body.recomputeMassPropertiesFromColliders()
      },
    }

    pane.addBinding(damping, 'linear', {
      label: 'Linear Damping',
      min:   0,
      max:   5,
      step:  0.01,
    })
    pane.addBinding(damping, 'angular', {
      label: 'Angular Damping',
      min:   0,
      max:   5,
      step:  0.01,
    })
    pane.addBinding(damping, 'gravScale', {
      label: 'Gravity Scale',
      min:   0,
      max:   20,
      step:  0.1,
    })

    pane.addBinding(chainLine.lineMesh.material, 'linewidth', {
      label: 'Chain Line Width',
      min:   0.01,
      max:   0.5,
      step:  0.01,
    })

    pane.addBinding(damping, 'density', {
      label: 'Density',
      min:   0.01,
      max:   10,
      step:  0.01,
    })

    const fpsGraph = pane.addBlade({
      view:  'fpsgraph',
      label: 'fpsgraph',
    }) as FpsGraphBladeApi

    return {
      fpsGraph,
      pane,
      dispose,
    }
  }

  /**
   * Cleanup function to dispose of Three.js resources and event listeners when the component is unmounted
   */
  return () => {
    renderer.setAnimationLoop(null)

    renderer.dispose()

    pane.dispose()

    // controls.disconnect()
    // controls.dispose()

    scene.clear()

    delete (window as any).scene
    delete (window as any).camera
    delete (window as any).renderer
    delete (window as any).duck
    delete (window as any).controls
  }
}

function initPhysics() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })

  const debugMesh = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xff0000 }),
  )
  debugMesh.raycast = () => null // disable raycasting on the debug mesh
  debugMesh.visible = false
  scene.add(debugMesh)

  const update = () => {
    if (debugMesh.visible === false) return

    // const bodies = world.bodies
    const geometry = debugMesh.geometry as THREE.BufferGeometry

    const { vertices, colors } = world.debugRender()

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))
  }

  const chain = createWreckingballJointChain(world, new THREE.Vector3(0, 15, 0), 0.25, 15)

  const mouseCollision = createMouseCollision(world)

  mouseCollision.plane.position.set(0, 10, 0)

  chain.anim.pause(chain.anim.duration() * 0.5, false)
  return {
    world,
    debugMesh,
    update,
    createFloor,
    addSphere,
    generateBodyFromGeometry,
    createWreckingballJointChain,
    syncMeshWithBody,
    chain,
    mouseCollision,
    createMouseCollision,
  }
}

function createFloor(world: RAPIER.World) {
  const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())

  const floorCollider = world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.5, 10), floorBody)

  const floorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(20, 1, 20),
    new THREE.MeshPhongMaterial({ color: 0x808080 }),
  )

  floorMesh.position.set(0, 0, 0)
  scene.add(floorMesh)

  floorMesh.userData.physics = {
    body:     floorBody,
    collider: floorCollider,
  }

  return floorMesh
}

function addSphere(world: RAPIER.World, position: THREE.Vector3 = new THREE.Vector3(0, 5, 0)) {
  const radius = 0.5

  const sphereBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z),
  )

  const sphereCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(radius).setRestitution(0.7),
    sphereBody,
  )

  const sphereMesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 32),
    new THREE.MeshPhongMaterial({ color: 0xff0000 }),
  )
  sphereMesh.position.copy(position)
  scene.add(sphereMesh)

  sphereMesh.userData.physics = {
    body:     sphereBody,
    collider: sphereCollider,
  }

  return sphereMesh
}

function generateBodyFromGeometry(world: RAPIER.World, mesh: THREE.Mesh) {
  const geometry = mesh.geometry as THREE.BufferGeometry

  const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute
  const vertices = Float32Array.from(positionAttribute.array)

  const colliderDesc = RAPIER.ColliderDesc.convexHull(vertices)

  if (colliderDesc === null) {
    console.warn('Failed to create convex hull collider from geometry')
    return null
  }

  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic())
  const collider = world.createCollider(colliderDesc, body)

  return {
    body,
    collider,
  }
}

function createWreckingballJointChain(
  world: RAPIER.World,
  anchor: THREE.Vector3,
  segmentLength = 1,
  segments = 5,
  lastBody: RAPIER.RigidBody | null = null,
) {
  const bodies: RAPIER.RigidBody[] = []
  const colliders: RAPIER.Collider[] = []
  const joints: RAPIER.ImpulseJoint[] = []

  let previousBody: RAPIER.RigidBody | null = null

  for (let i = 0; i < segments; i++) {
    appendSegment(segmentLength)
  }

  if (lastBody) {
    appendSegment(segmentLength, lastBody)
  }

  const anchorVec = new THREE.Vector3(anchor.x, anchor.y, anchor.z)

  const anim = gsap.fromTo(
    anchorVec,
    {
      x: anchor.x + 10,
      y: anchor.y,
      z: anchor.z,
    },
    {
      x:        anchor.x - 10,
      duration: 3,
      ease:     'power1.inOut',
      yoyo:     true,
      repeat:   -1,
      onUpdate: () => {
        const firstBody = bodies[0]
        if (firstBody) {
          firstBody.setNextKinematicTranslation({ x: anchorVec.x, y: anchorVec.y, z: anchorVec.z })
        }
      },
      paused: true,
    },
  )

  function appendSegment(
    length = segmentLength,
    body: RAPIER.RigidBody | null = null,
    jointY: number = 0,
  ) {
    const _body =
      body ||
      world.createRigidBody(
        (previousBody
          ? RAPIER.RigidBodyDesc.dynamic()
          : RAPIER.RigidBodyDesc.kinematicPositionBased()
        )

          .setCanSleep(true)
          .setAngularDamping(4.21)
          .setGravityScale(10)
          .setLinearDamping(5),
      )

    if (previousBody) {
      const prevTranslation = previousBody.translation()
      _body.setTranslation(
        { x: prevTranslation.x, y: prevTranslation.y - length, z: prevTranslation.z },
        true,
      )
    } else {
      _body.setTranslation({ x: anchor.x, y: anchor.y, z: anchor.z }, true)
    }

    const collider =
      body?.collider(0) ??
      world.createCollider(RAPIER.ColliderDesc.ball(segmentLength * 0.5), _body)

    collider.setFriction(0)
    collider.setRestitution(0)
    colliders.push(collider)

    // collider.setMass(5.01)

    bodies.push(_body)

    if (previousBody) {
      // const isFirstJoint = joints.length === 0
      const jointData = RAPIER.JointData.rope(
        length,
        { x: 0, y: 0, z: 0 },
        { x: 0, y: jointY, z: 0 },
      )

      jointData.anchor1.y = 0

      jointData.stiffness = 100

      jointData.anchor2.y = jointY

      jointData.damping = 0.5

      jointData.limitsEnabled = true
      // jointData.limits = [
      //   0,
      //   0.45,
      // ] // min and max distance between the two bodies
      // jointData.minLength = 0.45

      // jointData.damping = .1

      const joint = world.createImpulseJoint(jointData, previousBody, _body, true)

      // joint.setContactsEnabled(false)

      joints.push(joint)
    }

    previousBody = _body
  }

  function getLinearDamping() {
    return bodies[0]?.linearDamping() ?? 0
  }

  function getAngularDamping() {
    return bodies[0]?.angularDamping() ?? 0
  }

  function setLinearDamping(damping: number) {
    bodies.forEach((body) => body.setLinearDamping(damping))
  }

  function setAngularDamping(damping: number) {
    bodies.forEach((body) => body.setAngularDamping(damping))
  }

  function createRopeMesh() {
    // positions is a flat array of xyz of each body in the chain, so its length is joints.length + 1 (for the last body) times 3 (for x, y, z)
    const positions = new Float32Array(joints.length * 3)
    // const posAttribute = new THREE.Float32BufferAttribute(positions, 3)

    const posVec = new THREE.Vector3()

    // for (let i = 0; i < joints.length; i++) {
    //   const joint = joints[i]!
    //   const bodyA = joint.body1()
    //   const bodyB = joint.body2()

    //   const posA = bodyA.translation()
    //   const posB = bodyB.translation()

    //   const offsetA = joint.anchor1()
    //   const offsetB = joint.anchor2()

    //   posVec.copy(posA).add(offsetA)

    //   positions.set([
    //     posVec.x,
    //     posVec.y,
    //     posVec.z,
    //   ], i * 3)
    // }

    const geometry = new LineGeometry()

    update()

    const lineMesh = new Line2(
      geometry,
      new LineMaterial({ color: '#cccccc', linewidth: 0.04, worldUnits: true }),
    )

    lineMesh.computeLineDistances()

    scene.add(lineMesh)

    function update() {
      for (let i = 0; i < joints.length; i++) {
        const joint = joints[i]!
        // const bodyA = joint.body1()
        const bodyB = joint.body2()

        // const posA = bodyA.translation()
        const posB = bodyB.translation()

        // const rotA = bodyA.rotation()
        const rotB = bodyB.rotation()

        // const offsetA = joint.anchor1()
        const offsetB = joint.anchor2()

        // calculate the world position based on the offset and the rotation of the body

        posVec
          .copy(offsetB)
          .applyQuaternion(new THREE.Quaternion(rotB.x, rotB.y, rotB.z, rotB.w))
          .add(posB)

        // posVec.copy(offsetB).applyQuaternion(new THREE.Quaternion(rotB.x, rotB.y, rotB.z, rotB.w)).add(posB)

        positions.set([
          posVec.x,
          posVec.y,
          posVec.z,
        ], i * 3)

        geometry.setPositions(positions)
      }
    }

    return {
      lineMesh,
      update,
    }
  }

  return {
    bodies,
    colliders,
    joints,
    anim,
    appendSegment,
    getLinearDamping,
    getAngularDamping,
    setLinearDamping,
    setAngularDamping,
    createRopeMesh,
  }
}

function syncMeshWithBody(mesh: THREE.Mesh, body: RAPIER.RigidBody) {
  mesh.position.copy(body.translation())
  mesh.quaternion.copy(body.rotation())
}

/**
 * animates the wreckingball intro when the pages load
 */
async function animate() {
  const ball = scene.getObjectByProperty('isMesh', true) as THREE.Mesh

  const timeline = gsap.timeline()

  timeline.fromTo(
    ball!.position,
    {
      // x:        Math.PI * 2,
      // y:        Math.PI * 2,
      x: camera.position.z,
    },
    {
      x:        0,
      duration: 3,
      ease:     'expo.out',
    },
  )

  // timeline.to(
  //   ball!.rotation,
  //   {
  //     y:        Math.PI * 2,
  //     duration: 6,
  //     ease:     'none',
  //     repeat:   -1,
  //   },
  //   1,
  // )

  // split elements with the class "split" into words and characters
  const split = SplitText.create(overlayElement.value!.querySelector('h1'), {
    type: 'words, chars',
    mask: 'words',
  })

  const wordContainer = overlayElement.value!.querySelector('h1')

  timeline.to(
    wordContainer,
    {
      autoAlpha: 1, // fade in the container first
      duration:  0.4,
    },
    0,
  )

  // now animate the characters in a staggered fashion
  return await timeline.from(
    split.words,
    {
      duration:  2,
      y:         50, // animate from 100px below
      autoAlpha: 0, // fade in from opacity: 0 and visibility: hidden
      stagger:   0.1, // 0.05 seconds between each
      ease:      'elastic.out(2, 0.45)', // elastic ease for a bouncy effect
    },
    0.2,
  )
}

function createMouseCollision(world: RAPIER.World) {
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshBasicMaterial({ color: 0xff0000 }),
  )

  plane.visible = false

  const mouseHelper = new THREE.Mesh(
    new THREE.SphereGeometry(0.01, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
  )
  // scene.add(mouseHelper)

  const raycaster = new THREE.Raycaster()

  const mouseBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased())
  world.createCollider(RAPIER.ColliderDesc.ball(0.01), mouseBody)

  mouseBody.enableCcd(true)

  function onMouseMove(event: MouseEvent | TouchEvent) {
    let offsetX: number = 0,
      offsetY: number = 0

    if (event instanceof MouseEvent) {
      offsetX = event.offsetX
      offsetY = event.offsetY
    } else if (event instanceof TouchEvent) {
      offsetX = event.touches[0]!.clientX - containerElement.value!.getBoundingClientRect().left
      offsetY = event.touches[0]!.clientY - containerElement.value!.getBoundingClientRect().top
    }

    const mouse = new THREE.Vector2(
      (offsetX / renderer.domElement.clientWidth) * 2 - 1,
      -(offsetY / renderer.domElement.clientHeight) * 2 + 1,
    )

    raycaster.setFromCamera(mouse, camera)

    const intersects = raycaster.intersectObject(plane, true)

    mouseBody.setEnabled(intersects.length > 0)
    mouseBody.collider(0)?.setEnabled(intersects.length > 0)

    if (intersects.length > 0) {
      const point = intersects[0]!.point
      mouseHelper.position.copy(point)
      mouseBody.setNextKinematicTranslation(point)

      const vel = new THREE.Vector3().subVectors(point, mouseBody.translation()).multiplyScalar(60)

      mouseBody.setNextKinematicRotation(mouseBody.rotation())

      vel.copy(mouseBody.linvel()).multiplyScalar(0.3)

      // mouseBody.setLinvel(vel, true)
      // mouseBody.setGravityScale(10, true)
    }

    // console.log(intersects)
  }

  if ('ontouchstart' in window) {
    renderer.domElement.addEventListener('touchmove', onMouseMove)
  } else {
    renderer.domElement.addEventListener('mousemove', onMouseMove)
  }

  scene.add(plane)

  return {
    plane,
    raycaster,
    mouseBody,
    mouseHelper,
  }
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
    <div ref="containerElement" class="w-full h-full absolute container-element"></div>

    <div class="overlay w-full h-full" ref="overlayElement">
      <div class="overlay-hero">
        <h1 class="text-6xl font-bold max-w-2xl opacity-0">
          Hello! welcome to <strong class="text-yellow-500">Wreckingball Labs</strong>
        </h1>
        <VLink href="/content"> Play </VLink>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
::v-deep(canvas) {
  display: block;
  // z-index: 1;
  position: absolute;
  width: 100%;
  height: 100%;
}

.container-element {
  background: url('@/assets/img/grid.webp') repeat fixed;
}

.overlay {
  // position: absolute;
  // z-index: 10;
}
</style>
