import { Ticker, UPDATE_PRIORITY, type TickerCallback } from '@pixi/ticker'
import { tryOnScopeDispose } from '@vueuse/core'

export const useTicker = (
  fn: TickerCallback<any>,
  context?: any,
  priority = UPDATE_PRIORITY.NORMAL,
) => {
  Ticker.shared.add(fn, context, priority)

  tryOnScopeDispose(() => {
    Ticker.shared.remove(fn, context)
  })

  return () => {
    Ticker.shared.remove(fn, context)
  }
}
