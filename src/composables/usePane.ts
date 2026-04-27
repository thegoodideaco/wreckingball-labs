import { tryOnScopeDispose } from '@vueuse/core'
import { Pane } from 'tweakpane'
import type { PaneConfig } from 'tweakpane/dist/types/pane/pane-config'

let rootPane: Pane | null = null

export function usePane(options?: PaneConfig) {
  const initial = !rootPane
  const pane = rootPane || (rootPane = new Pane(options))

  if(initial) {
    tryOnScopeDispose(() => {
      pane.dispose()
      rootPane = null
    })
  }

  return pane
}
