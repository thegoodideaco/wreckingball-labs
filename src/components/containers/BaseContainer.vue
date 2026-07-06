<script lang="ts" setup>
const _props = withDefaults(
  defineProps<{
    fixedNavigation?: boolean
    hideNavigation?: boolean
  }>(),
  {
    fixedNavigation: false,
    hideNavigation:  false,
  },
)
</script>

<template>
  <main class="main-container">
    <aside class="side-menu absolute overflow-x-hidden overflow-y-auto flex">
      <div class="side-menu__inner">
        <slot name="nav">
          Nav menu here
        </slot>
      </div>
    </aside>

    <div class="main-content">
      <div class="main-content__inner">
        <slot name="default">
          Main content here
        </slot>
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.main-container {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
}

.side-menu {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 904;
  min-height: 100%;
  width: var(--aside-width);



  &__inner {
    width: 100%;
    background: red;
    position: relative;
    min-height: 100%;
  }
}

.main-content {
  padding-left: var(--aside-width);
  flex: 1;
  // padding: 1rem;
  position: relative;
  min-height: 100%;

  display: flex;

  align-items: stretch;



  &__inner {
    flex: 1;
    // background: blue;
    position: relative;
    min-height: 100%;
  }
}
</style>
