import type { TextOptions } from 'three-mesh-ui'

declare module 'three-mesh-ui' {
  interface Text {

    /**
     * Set the content of the text element.
     *
     * @example
     * text.set({ content: 'Hello, World!' });
     */
    set(content: TextOptions): void;
  }
}
