<template>
    <div class="reconnect">
        <div class="title">Lost Connection!</div>
        <div class="description">Please wait while we reconnect you to the server...</div>

        <div class="animation-wrapper">
            <div class="animation"></div>
        </div>

        <Button text="Abort Reconnection" @click="abortReconnection" />
    </div>
</template>

<script>
import { SyncPlayInstance } from '@/scripts/websocket'
import Button from '@/components/Browser/Button.vue'

const SyncPlay = SyncPlayInstance()

export default {
    name: 'Reconnect',
    components: { Button },
    methods: {
        abortReconnection() {
            SyncPlay.disconnect(true)
        }
    }
}
</script>

<style scoped>
.reconnect {
    position: absolute;

    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    gap: 5px;

    height: calc(698px - 66px);
    width: 450px;

    margin: auto;
    background-color: #121212;
}

.reconnect > .button {
    --button-color: #737373;

    margin-top: 6px;
}

.reconnect > .animation-wrapper {
    position: relative;
    overflow: hidden;

    width: 354px;
    height: 11px;

    background-color: #737373;
}
.reconnect > .animation-wrapper > .animation {
    position: absolute;
    left: 0;
    bottom: 0;

    width: 0;
    height: inherit;

    background-color: #262626;

    animation: loading-bar-animation 2s infinite;
}

.reconnect > .title {
    color: #737373;
    font-size: 50px;
    font-weight: 600;
    line-height: 36px;
}
.reconnect > .description {
    color: #737373;
    font-size: 16.35px;
    line-height: 11px;
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
