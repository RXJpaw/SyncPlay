<template>
    <Titlebar />
    <Structure />
</template>

<script lang="ts">
import Structure from '@/components/Structure.vue'
import Titlebar from './components/Titlebar.vue'

export default {
    components: {
        Structure,
        Titlebar
    },
    data() {
        return {}
    },
    async mounted() {
        window.electron.show()
    }
}
</script>

<style>
@font-face {
    font-family: 'BRAVE';
    src: url(~@/assets/fonts/brave.woff) format('woff');
}

::-webkit-scrollbar {
    width: 11px;
    height: 11px;
}
::-webkit-scrollbar-track {
    background-color: transparent;
    border-radius: 10px;
}
::-webkit-scrollbar-thumb {
    border: 3px solid #2f3136;
    background-color: #121314;
    border-radius: 10px;
}

body {
    margin: 0;
}

#app {
    --webkit-fill-available: -webkit-fill-available;
    --webkit-optimize-contrast: -webkit-optimize-contrast;
    --webkit-overlay: overlay;
    image-rendering: var(--webkit-optimize-contrast);

    font-family: BRAVE, Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;

    width: 100vw;
    height: 100vh;

    color: #ffffff;
    z-index: -1;
}

input {
    border: 0;
    outline: 0;
    padding: 0;
    background: transparent;
    font-family: inherit;
    color: inherit;
}
</style>
