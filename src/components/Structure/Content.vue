<template>
    <Homescreen v-if="phase === 'lobby'" :phase="detail" />
    <Reconnect v-else-if="phase === 'reconnect'" />
    <Room v-else-if="phase === 'room'" />
</template>

<script lang="ts">
import Homescreen from '@/components/Content/Homescreen.vue'
import Reconnect from '@/components/Content/Reconnect.vue'
import { SyncPlayInstance } from '@/scripts/websocket'
import Room from '@/components/Content/Room.vue'

const SyncPlay = SyncPlayInstance()

export default {
    name: 'Content',
    components: { Reconnect, Room, Homescreen },
    data() {
        return {
            phase: 'lobby',
            detail: 0
        }
    },
    created() {
        SyncPlay.Client.on('phase', (phase) => {
            switch (phase) {
                case 'join-server': {
                    this.phase = 'lobby'
                    this.detail = 0
                    break
                }
                case 'join-room': {
                    this.phase = 'lobby'
                    this.detail = 1
                    break
                }
                case 'room': {
                    this.phase = 'room'
                    this.detail = 0
                    break
                }
                case 'reconnect': {
                    this.phase = 'reconnect'
                    this.detail = 0
                }
            }
        })
    }
}
</script>

<style scoped></style>
