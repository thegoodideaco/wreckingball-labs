import * as THREE from 'three'

const matcapUrls = Object.values(
  import.meta.glob('@/assets/img/matcaps/*.webp', { eager: true, query: 'url' }),
) as string[]

function getRandomMatcap(): string {
  const randomIndex = Math.floor(Math.random() * matcapUrls.length)
  return matcapUrls[randomIndex]!
}
const loader = new THREE.TextureLoader()

export async function loadRandomMatcapTexture(): Promise<THREE.Texture> {
  const url = getRandomMatcap()
  const texture = await new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(
      url,
      (tex) => resolve(tex),
      undefined,
      (err) => reject(err),
    )
  })
  return texture
}

export function swapMatcap(material: THREE.MeshMatcapMaterial, newMatcap?: THREE.Texture) {
  if (newMatcap === undefined) {
    if (material.matcap) {
      material.matcap.dispose()
    }

    material.matcap = null
    material.needsUpdate = true
    return
  }

  material.matcap = newMatcap
  material.needsUpdate = true
}
