import * as THREE from 'three'
import { createRenderer, type VNode } from 'vue'

type ThreeTextNode = {
  kind: 'text' | 'comment'
  value: string
}

type ThreeRootContainer = {
  kind: 'root'
  scene: THREE.Scene
}

type ThreeNode =
  | THREE.Object3D
  | THREE.Material
  | THREE.BufferGeometry
  | ThreeTextNode
  | ThreeRootContainer

type ThreeElement = Exclude<ThreeNode, ThreeRootContainer>

function isTextNode(node: unknown): node is ThreeTextNode {
  return Boolean(node) && typeof node === 'object' && 'kind' in (node as Record<string, unknown>)
}

function isObject3D(node: unknown): node is THREE.Object3D {
  return node instanceof THREE.Object3D
}

function isRootContainer(node: unknown): node is ThreeRootContainer {
  return (
    Boolean(node) &&
    typeof node === 'object' &&
    'kind' in (node as Record<string, unknown>) &&
    (node as { kind: string }).kind === 'root'
  )
}

function isMaterial(node: unknown): node is THREE.Material {
  return node instanceof THREE.Material
}

function isGeometry(node: unknown): node is THREE.BufferGeometry {
  return node instanceof THREE.BufferGeometry
}

function toVector3Tuple(value: unknown): THREE.Vector3Tuple | null {
  if (!Array.isArray(value) || value.length < 3) {
    return null
  }

  const [x, y, z] = value

  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    return null
  }

  return [x, y, z]
}

function applyProp(target: ThreeElement, key: string, value: unknown): void {
  if (key === 'args' || key === 'key' || key === 'ref') {
    return
  }

  if (isTextNode(target)) {
    target.value = String(value ?? '')
    return
  }

  if (isObject3D(target)) {
    if (key === 'position' || key === 'rotation' || key === 'scale') {
      const tuple = toVector3Tuple(value)

      if (tuple) {
        target[key].set(...tuple)
      }

      return
    }

    if (key === 'lookAt') {
      const tuple = toVector3Tuple(value)

      if (tuple) {
        target.lookAt(...tuple)
      }

      return
    }
  }

  if (
    key === 'color' &&
    'color' in target &&
    target.color instanceof THREE.Color &&
    (typeof value === 'string' || typeof value === 'number' || value instanceof THREE.Color)
  ) {
    target.color.set(value)
    return
  }

  if (key in target) {
    const recordTarget = target as unknown as Record<string, unknown>
    const current = recordTarget[key]

    if (Array.isArray(value) && current && typeof current === 'object' && 'set' in current) {
      const setter = (current as { set: (...args: unknown[]) => void }).set
      setter(...value)
      return
    }

    recordTarget[key] = value
  }
}

function createThreeElement(type: string): ThreeElement {
  switch (type) {
    case 'group':
      return new THREE.Group() as ThreeElement
    case 'mesh':
      return new THREE.Mesh() as ThreeElement
    case 'ambientLight':
    case 'ambient-light':
    case 'ambientlight':
      return new THREE.AmbientLight(0xffffff, 1) as ThreeElement
    case 'directionalLight':
    case 'directional-light':
    case 'directionallight':
      return new THREE.DirectionalLight(0xffffff, 1) as ThreeElement
    case 'perspectiveCamera':
    case 'perspective-camera':
    case 'perspectivecamera':
      return new THREE.PerspectiveCamera(60, 1, 0.1, 1000) as ThreeElement
    case 'boxGeometry':
    case 'box-geometry':
    case 'boxgeometry':
      return new THREE.BoxGeometry(1, 1, 1) as ThreeElement
    case 'sphereGeometry':
    case 'sphere-geometry':
    case 'spheregeometry':
      return new THREE.SphereGeometry(1, 24, 24) as ThreeElement
    case 'planeGeometry':
    case 'plane-geometry':
    case 'planegeometry':
      return new THREE.PlaneGeometry(1, 1) as ThreeElement
    case 'meshStandardMaterial':
    case 'mesh-standard-material':
    case 'meshstandardmaterial':
      return new THREE.MeshStandardMaterial() as ThreeElement
    case 'meshBasicMaterial':
    case 'mesh-basic-material':
    case 'meshbasicmaterial':
      return new THREE.MeshBasicMaterial() as ThreeElement
    default:
      throw new Error(`Unsupported Three element type: ${type}`)
  }
}

const threeRenderer = createRenderer<ThreeNode, ThreeNode>({
  patchProp(el, key, _prevValue, nextValue) {
    if (isRootContainer(el)) {
      return
    }

    applyProp(el, key, nextValue)
  },
  insert(el, parent) {
    if (isTextNode(el)) {
      return
    }

    if (isRootContainer(parent)) {
      if (isObject3D(el)) {
        parent.scene.add(el)
      }
      return
    }

    if (isObject3D(parent) && isObject3D(el)) {
      parent.add(el)
      return
    }

    if (parent instanceof THREE.Mesh) {
      if (isGeometry(el)) {
        parent.geometry = el
      }

      if (isMaterial(el)) {
        parent.material = el
      }
    }
  },
  remove(el) {
    if (isTextNode(el)) {
      return
    }

    if (isObject3D(el) && el.parent) {
      el.parent.remove(el)
    }

    if (isGeometry(el)) {
      el.dispose()
    }

    if (isMaterial(el)) {
      el.dispose()
    }
  },
  createElement(type) {
    return createThreeElement(type)
  },
  createText(text) {
    return { kind: 'text', value: text }
  },
  createComment(text) {
    return { kind: 'comment', value: text }
  },
  setText(node, text) {
    if (isTextNode(node)) {
      node.value = text
    }
  },
  setElementText(_node, _text) {
    // Text children are ignored in the Three graph.
  },
  parentNode(node) {
    if (isTextNode(node)) {
      return null
    }

    return isObject3D(node) ? (node.parent as ThreeNode | null) : null
  },
  nextSibling(_node) {
    return null
  },
})

export function renderThreeScene(vnode: VNode | null, scene: THREE.Scene): void {
  threeRenderer.render(vnode, { kind: 'root', scene })
}
