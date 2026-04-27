import { onBeforeUnmount, shallowRef, type Ref, type ShallowRef } from 'vue'
import * as THREE from 'three'

export type ThreeCameraOptions = {
  fov?: number
  near?: number
  far?: number
  position?: THREE.Vector3Tuple
  lookAt?: THREE.Vector3Tuple
}

export type BaseThreeRendererOptions = {
  pixelRatio?: number
  camera?: ThreeCameraOptions
  autoStart?: boolean
}

export type UseThreeRendererOptions = BaseThreeRendererOptions & {
  antialias?: boolean
  alpha?: boolean
  clearColor?: THREE.ColorRepresentation
}

export type ThreeRendererLike = {
  domElement: HTMLCanvasElement
  render: (scene: THREE.Scene, camera: THREE.Camera) => void
  setSize: (width: number, height: number, updateStyle?: boolean) => void
  setPixelRatio: (value: number) => void
  dispose: () => void
}

export type ThreeRenderSystem = {
  scene: ShallowRef<THREE.Scene | null>
  camera: ShallowRef<THREE.PerspectiveCamera | null>
  renderer: ShallowRef<THREE.WebGLRenderer | null>
  isRunning: Ref<boolean>
  init: () => void
  mount: (container: HTMLElement) => void
  start: () => void
  stop: () => void
  resize: () => void
  render: () => void
  dispose: () => void
}

export abstract class BaseThreeRenderer<
  TRenderer extends ThreeRendererLike,
  TOptions extends BaseThreeRendererOptions = BaseThreeRendererOptions,
> {
  public readonly scene = shallowRef<THREE.Scene | null>(null)
  public readonly camera = shallowRef<THREE.PerspectiveCamera | null>(null)
  public readonly renderer = shallowRef<TRenderer | null>(null)
  public readonly isRunning = shallowRef(false)

  protected readonly options: TOptions
  protected readonly cameraOptions: ThreeCameraOptions
  protected readonly autoStart: boolean
  protected readonly pixelRatio: number

  private readonly container = shallowRef<HTMLElement | null>(null)
  private frameId = 0
  private readonly handleWindowResize = () => {
    this.resize()
  }

  public constructor(options: TOptions) {
    this.options = options
    this.cameraOptions = options.camera ?? {}
    this.autoStart = options.autoStart ?? false
    this.pixelRatio = options.pixelRatio ?? window.devicePixelRatio
  }

  protected abstract createRenderer(): TRenderer

  protected configureRenderer(renderer: TRenderer): void {
    renderer.setPixelRatio(this.pixelRatio)
  }

  protected renderFrame(): void {
    if (!this.scene.value || !this.camera.value || !this.renderer.value) {
      return
    }

    this.renderer.value.render(this.scene.value, this.camera.value)
  }

  protected onBeforeFrame(): void {
    // Hook for subclasses.
  }

  protected onAfterFrame(): void {
    // Hook for subclasses.
  }

  protected onDispose(): void {
    // Hook for subclasses.
  }

  public init(): void {
    if (this.scene.value && this.camera.value && this.renderer.value) {
      return
    }

    this.scene.value = new THREE.Scene()

    const createdCamera = new THREE.PerspectiveCamera(
      this.cameraOptions.fov ?? 60,
      1,
      this.cameraOptions.near ?? 0.1,
      this.cameraOptions.far ?? 1000,
    )

    const [x, y, z] = this.cameraOptions.position ?? [0, 0, 5]
    createdCamera.position.set(x, y, z)

    if (this.cameraOptions.lookAt) {
      const [lx, ly, lz] = this.cameraOptions.lookAt
      createdCamera.lookAt(lx, ly, lz)
    }

    this.camera.value = createdCamera

    const createdRenderer = this.createRenderer()
    this.configureRenderer(createdRenderer)
    this.renderer.value = createdRenderer
  }

  public mount(target: HTMLElement): void {
    if (!this.renderer.value) {
      throw new Error('Three renderer is not initialized. Call init() first.')
    }

    this.container.value = target

    if (!target.contains(this.renderer.value.domElement)) {
      target.appendChild(this.renderer.value.domElement)
    }

    this.resize()
    window.removeEventListener('resize', this.handleWindowResize)
    window.addEventListener('resize', this.handleWindowResize)

    if (this.autoStart) {
      this.start()
    }
  }

  public start(): void {
    if (!this.renderer.value || this.isRunning.value) {
      return
    }

    this.isRunning.value = true
    this.frameId = requestAnimationFrame(this.tick)
  }

  public stop(): void {
    if (!this.isRunning.value) {
      return
    }

    cancelAnimationFrame(this.frameId)
    this.isRunning.value = false
  }

  public resize(): void {
    if (!this.container.value || !this.camera.value || !this.renderer.value) {
      return
    }

    const width = this.container.value.clientWidth || 1
    const height = this.container.value.clientHeight || 1

    this.camera.value.aspect = width / height
    this.camera.value.updateProjectionMatrix()
    this.renderer.value.setSize(width, height, false)
  }

  public render(): void {
    this.renderFrame()
  }

  public dispose(): void {
    this.stop()
    window.removeEventListener('resize', this.handleWindowResize)
    this.onDispose()

    if (this.renderer.value?.domElement.parentElement) {
      this.renderer.value.domElement.parentElement.removeChild(this.renderer.value.domElement)
    }

    this.renderer.value?.dispose()

    this.scene.value = null
    this.camera.value = null
    this.renderer.value = null
    this.container.value = null
  }

  private readonly tick = () => {
    if (!this.isRunning.value) {
      return
    }

    this.onBeforeFrame()
    this.render()
    this.onAfterFrame()

    this.frameId = requestAnimationFrame(this.tick)
  }
}

export class WebGLThreeRenderer extends BaseThreeRenderer<
  THREE.WebGLRenderer,
  UseThreeRendererOptions
> {
  protected createRenderer(): THREE.WebGLRenderer {
    const { antialias = true, alpha = false } = this.options
    return new THREE.WebGLRenderer({ antialias, alpha })
  }

  protected override configureRenderer(renderer: THREE.WebGLRenderer): void {
    super.configureRenderer(renderer)

    if (this.options.clearColor !== undefined) {
      renderer.setClearColor(this.options.clearColor)
    }
  }
}

export function useThreeRenderer(options: UseThreeRendererOptions = {}): ThreeRenderSystem {
  const system = new WebGLThreeRenderer(options)

  onBeforeUnmount(() => {
    system.dispose()
  })

  return {
    scene: system.scene,
    camera: system.camera,
    renderer: system.renderer,
    isRunning: system.isRunning,
    init: () => system.init(),
    mount: (container: HTMLElement) => system.mount(container),
    start: () => system.start(),
    stop: () => system.stop(),
    resize: () => system.resize(),
    render: () => system.render(),
    dispose: () => system.dispose(),
  }
}
