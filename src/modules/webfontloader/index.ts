import { ref } from 'vue'
import WebfontLoader from 'webfontloader'

export const fontsLoaded = ref(false)

const icons = [
  'app_shortcut',
  'close',
  'closed_caption',
  'closed_caption_disabled',
  'description',
  'fullscreen',
  'fullscreen_enter',
  'fullscreen_exit',
  'menu_open',
  'pause',
  'play',
  'play_arrow',
  'replay',
  'replay_10',
  'rewind',
  'settings',
  'volume_down',
  'volume_mute',
  'volume_off',
  'volume_up',
  'arrow_drop_down',
  'translate',
  'menu',
].sort()




WebfontLoader.load({

  custom: {
    families:    ['neue-haas-grotesk-display'],
    urls:        ['https://use.typekit.net/kiw1gew.css'],
    testStrings: {
      'neue-haas-grotesk-display': '<div style="font-weight: 600">Wreckingball</div>',
    },
  },
  active() {
    // This callback is called when the fonts have loaded
    console.log('Fonts loaded successfully')

    fontsLoaded.value = true
  },
})
