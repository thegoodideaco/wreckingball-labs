<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const menuItems = computed(() => {
  return router.getRoutes().map((route) => route.name)
})

const router = useRouter()
</script>

<template>
  <aside class="page-sidebar">
    <div class="page-logo">
      <a
        href="#"
        data-toggle="modal"
        data-target="#modal-shortcut"
        class="page-logo-link press-scale-down flex items-center relative w-64 p-5"
        ><img
          src="@/assets/img/wrecking-ball-logo-light-bg.webp"
          alt="Wreckingball Labs"
          aria-roledescription="logo" />

        <i class="fal fa-angle-down inline-block ml-1 fs-lg color-primary-300"></i
      ></a>
    </div>
    <nav id="js-primary-nav" role="navigation" class="primary-nav p-5">
      <ul id="js-nav-menu" class="nav-menu" style="margin-left: 0px">
        <li v-for="item in menuItems" :key="item">
          <RouterLink :to="{ name: item }" class="nav-link">{{ item }}</RouterLink>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped></style>
