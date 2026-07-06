import { tryOnScopeDispose } from '@vueuse/core'
import { Pane } from 'tweakpane'
import type { PaneConfig } from 'tweakpane/dist/types/pane/pane-config'
import * as EssentialsPlugin from '@tweakpane/plugin-essentials'


let rootPane: Pane | null = null

export function usePane(options?: PaneConfig) {
  const initial = !rootPane
  const pane = rootPane || (rootPane = new Pane(options))

  pane.registerPlugin(EssentialsPlugin)

  const dispose = () => {
    pane.dispose()
    rootPane = null
  }

  if (initial) {
    tryOnScopeDispose(dispose)
  }

  return {
    pane,
    dispose,
  }
}
