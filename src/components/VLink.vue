<script lang="ts" setup>

defineProps<{
  href: string
}>()

</script>

<template>
  <a class="v-link v-link-link" :href="href">
    <span class="v-link-content-wrapper">
      <span class="v-link-text">
        <slot>
          View Our Work
        </slot>
      </span>
    </span>
  </a>
</template>

<style lang="scss" scoped>



.v-link {
  --e-global-typography-accent-font-family: 'neue-haas-grotesk-display', sans-serif;
  --e-global-typography-accent-font-size: 16px;
  --e-global-typography-accent-font-weight: 500;
  --e-global-typography-accent-line-height: 1.5;
  --btn-size: 60px;
  --btn-dark-color: #FFAD00;
  --arrow-color: #FFFFFF;

    background-color: #00000000;
    font-family: var( --e-global-typography-accent-font-family ), Sans-serif;
    font-size: var( --e-global-typography-accent-font-size );
    font-weight: var( --e-global-typography-accent-font-weight );
    line-height: var( --e-global-typography-accent-line-height );
    fill: #FFFFFF;
    color: #FFFFFF;

    cursor: pointer;
    position: relative;
    outline: none;
    border: 0;
    vertical-align: middle;
    text-decoration: none;
    background: transparent;
    box-shadow: none;
    display: inline-flex;
    align-items: center;
    height: var(--btn-size);
    padding: 0px 25px;
}

.v-link-content-wrapper {
    display: flex;
    flex-direction: row;
    gap: 5px;
    justify-content: center;
}

.v-link-content-wrapper:before {
    content: "";
    display: block;
    position: absolute;
    width: var(--btn-size);
    height: var(--btn-size);
    background: var(--btn-dark-color);
    margin: 0;
    left: 0;
    top: 0;
    border-radius: 15em;
    transition: all 0.45s cubic-bezier(0.65, 0, 0.076, 1);
}

.v-link-text {
    font-size: calc(var(--btn-size) / 2.5);
    padding-left: calc(var(--btn-size) - 5px);
    position: relative;
    z-index: 1;
    transition: all 0.45s cubic-bezier(0.65, 0, 0.076, 1);
}


.v-link:hover .v-link-content-wrapper:before {
    width: 100%;
}


.v-link-text:before {
    content: "";
    display: block;
    position: absolute;
    width: 18px;
    height: 2px;
    background: none;
    top: 50%;
    left: -12px;
    margin-top: -1px;
    transition: all 0.45s cubic-bezier(0.65, 0, 0.076, 1);
}

.v-link:hover .v-link-text:before {
    background: var(--arrow-color);
    transform: translate(17px, 0);
}

.v-link-text:after {
    content: "";
    position: absolute;
    width: 10px;
    height: 10px;
    top: 50%;
    left: calc(var(--btn-size) - (var(--btn-size) + 2px));
    margin-top: -5px;
    border-top: 2px solid var(--arrow-color);
    border-right: 2px solid var(--arrow-color);
    transform: rotate(45deg);
    transition: all 0.45s cubic-bezier(0.65, 0, 0.076, 1);
}

.v-link:hover .v-link-text:after {
    transform: translate(15px, 0) rotate(45deg);
}
</style>
