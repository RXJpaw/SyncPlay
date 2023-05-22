<template>
    <transition>
        <div v-if="loading" class="loading-bar">
            <div class="animation" ref="animation"></div>
        </div>
    </transition>
</template>

<script lang="ts">
export default {
    name: 'LoadingBar',
    props: {
        loading: Boolean as () => boolean
    },
    data() {
        return {}
    }
}
</script>

<style scoped>
.loading-bar:is(.v-enter-active, .v-leave-active) {
    transition: bottom ease-in-out 250ms;
    bottom: -5px;
}
.loading-bar:is(.v-enter-from, .v-leave-to) {
    bottom: 5px;
}

.loading-bar {
    transform: translateZ(-10px);
    overflow: hidden;

    position: absolute;
    bottom: -5px;
    height: 10px;

    width: 100%;

    border: 0 solid;
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;

    background-color: #171717;
}

.loading-bar > .animation {
    position: absolute;
    left: 0;
    bottom: 0;

    width: 0;
    height: inherit;
    background-color: #4caf50;

    animation: loading-bar-animation 1s infinite;
}

@keyframes loading-bar-animation {
    0%,
    15% {
        left: 0;
        width: 0;
    }
    55% {
        left: 0;
        width: 101%;
    }
    95%,
    100% {
        left: 100%;
        width: 0;
    }
}
</style>
