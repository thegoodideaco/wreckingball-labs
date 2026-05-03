import { DRACOLoader, GLTFLoader } from 'three/examples/jsm/Addons.js'
import * as THREE from 'three'

export const glbLoader = new GLTFLoader()
glbLoader.dracoLoader = new DRACOLoader()
glbLoader.dracoLoader.setDecoderPath('/draco/')
glbLoader.dracoLoader.setDecoderConfig({ type: 'js' })


export const textureLoader = new THREE.TextureLoader()
