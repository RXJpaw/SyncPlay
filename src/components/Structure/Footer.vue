<template>
    <div class="footer">
        <div class="items">
            <div class="settings-button button" @click="toggleSettings">Settings</div>
            <div class="github-button button" @click="openGitHub">GitHub</div>
        </div>
        <div class="info">
            <div class="software-version">SyncPlay, Public {{ version }}</div>
            <div class="copyright-disclaimer">Copyright © 2023 RXJpaw</div>
        </div>
        <UpdateButton class="update-button" />
        <Settings v-model:active="settingsActive" />
    </div>
</template>

<script lang="ts">
import UpdateButton from '@/components/Browser/UpdateButton.vue'
import { project_version, author } from '../../../package.json'
import Settings from '@/components/Structure/Settings.vue'
export default {
    name: 'Sidebar',
    components: { Settings, UpdateButton },
    data() {
        return {
            version: project_version,
            settingsActive: false
        }
    },
    methods: {
        openGitHub() {
            window.electron.openExternal(author.url)
        },
        toggleSettings() {
            this.settingsActive = !this.settingsActive
        }
    }
}
</script>

<style scoped>
.footer {
    position: absolute;
    bottom: 0;

    height: 66px;
    width: 450px;

    background-color: #0a0a0a;
}
.footer > .update-button {
    position: absolute;
    bottom: 77px;
    left: 127px;
}
.footer > .settings-window {
    position: absolute;
    bottom: 77px;
    left: 11px;
}
.footer > .items {
    display: flex;
    justify-content: space-between;

    width: calc(100% - 44px);
    height: 22px;
    margin: 22px;
}

.footer > .info {
    position: absolute;
    top: 21px;

    width: 100%;
    font-size: 12px;
    line-height: 12px;
    color: #333333;

    user-select: none;
    pointer-events: none;
}

.footer * .button {
    color: #737373;
    font-size: 14px;
    line-height: 10px;
    padding: 6px 0;
    border-radius: 6px;

    width: 74px;

    background-color: #121212;
    user-select: none;
    cursor: pointer;
}
</style>
