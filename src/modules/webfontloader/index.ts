import { ref } from 'vue'
import WebfontLoader from 'webfontloader'

export const fontsLoaded = ref(false)

WebfontLoader.load({
  google: {
    families: ['Inter:400,500,600,700,800,900'],
  },
  custom: {
    urls: [
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=chevron_left,chevron_right',
    ],
    families: ['Material Symbols Outlined'],
    testStrings: {
      'Material Symbols Outlined': 'chevron_left chevron_right',
    },
  },
  active() {
    // This callback is called when the fonts have loaded
    console.log('Fonts loaded successfully')

    fontsLoaded.value = true
  },
})
