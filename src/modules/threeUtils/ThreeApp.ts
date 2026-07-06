
import { PerspectiveCamera, Scene, Timer, type WebGLRenderer } from 'three'
import type { WebGPURenderer } from 'three/webgpu'

type AppRenderer = WebGLRenderer | WebGPURenderer;

type RenderEvent<R extends AppRenderer> = (
  app: ThreeApp<R>,
  delta: number,
  elapsed: number
) => void;

type Disposable = {
  dispose(): void;
};

export class ThreeApp<R extends AppRenderer> {
  readonly renderer: R
  readonly scene: Scene
  readonly camera: PerspectiveCamera

  private readonly clock = new Timer()
  private beforeRenderEvents = new Set<RenderEvent<R>>()
  private afterRenderEvents = new Set<RenderEvent<R>>()

  constructor(options: {
    renderer: R;
    scene?: Scene;
    camera?: PerspectiveCamera;
  }) {
    this.renderer = options.renderer
    this.scene = options.scene ?? new Scene()

    this.camera =
      options.camera ??
      new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

    window.addEventListener('resize', this.resize)
    this.resize()
  }

  addBeforeRender(fn: RenderEvent<R>): Disposable {
    this.beforeRenderEvents.add(fn)

    return {
      dispose: () => this.beforeRenderEvents.delete(fn),
    }
  }

  addAfterRender(fn: RenderEvent<R>): Disposable {
    this.afterRenderEvents.add(fn)

    return {
      dispose: () => this.afterRenderEvents.delete(fn),
    }
  }

  start() {
    this.renderer.setAnimationLoop(this.render)
  }

  stop() {
    this.renderer.setAnimationLoop(null)
  }

  private render = () => {
    const delta = this.clock.getDelta()
    const elapsed = this.clock.getElapsed()

    for (const fn of this.beforeRenderEvents) {
      fn(this, delta, elapsed)
    }

    this.renderer.render(this.scene, this.camera)

    for (const fn of this.afterRenderEvents) {
      fn(this, delta, elapsed)
    }
  }

  private resize = () => {
    const width = window.innerWidth
    const height = window.innerHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)
  }

  dispose() {
    this.stop()
    window.removeEventListener('resize', this.resize)

    this.beforeRenderEvents.clear()
    this.afterRenderEvents.clear()

    this.renderer.dispose()
  }
}
