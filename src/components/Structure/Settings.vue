<template>
    <transition>
        <div v-if="loaded && active" ref="settings" class="settings-window">
            <div class="settings">
                <div class="setting watched-folders">
                    <div class="header">Watched Folders</div>
                    <div class="items">
                        <div class="item" v-for="(item, index) in watched_folders.list">
                            <div class="folder">{{ item }}</div>
                            <div class="remove-button" @click="clickRemoveFolderWatchedFolders(index)">
                                <svg aria-hidden="false" width="12" height="12" viewBox="0 0 12 12" style="margin: 5px">
                                    <polygon
                                        fill="currentColor"
                                        fill-rule="evenodd"
                                        points="11 1.576 6.583 6 11 10.424 10.424 11 6 6.583 1.576 11 1 10.424 5.417 6 1 1.576 1.576 1 6 5.417 10.424 1"
                                    ></polygon>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div class="buttons">
                        <Button :disabled="watched_folders.selecting" class="button" text="Add Folders" @click="clickAddFoldersWatchedFolders" />
                    </div>
                </div>
                <div class="setting auto-updating">
                    <div class="header">Update-Server Preferences</div>
                    <div class="inputs">
                        <TextInput
                            ref="auto-updating-server-address-input"
                            class="server-address-input input"
                            width="100%"
                            placeholder="Server Address"
                            v-model:input="auto_updating.server_address"
                            type="text"
                        />
                        <TextInput
                            ref="auto-updating-server-password-input"
                            class="server-password-input input"
                            width="100%"
                            placeholder="Server Password"
                            v-model:input="auto_updating.server_password"
                            type="password"
                        />
                    </div>
                    <div class="buttons">
                        <Button
                            :disabled="auto_updating.testing"
                            class="button"
                            :text="auto_updating.tested ? 'Save Server' : 'Test Server'"
                            @click="auto_updating.tested ? clickSaveAutoUpdating() : clickTestAutoUpdating()"
                        />
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script lang="ts">
import TextInput from '@/components/Browser/TextInput.vue'
import LoadingBar from '@/components/Misc/LoadingBar.vue'
import Button from '@/components/Browser/Button.vue'
import Animation from '@/scripts/animations'
import { sleep } from '@/scripts/methods'
import { Config } from '@/scripts/config'

export default {
    name: 'Settings',
    components: { LoadingBar, TextInput, Button },
    props: {
        active: Boolean as () => boolean
    },
    data() {
        return {
            loaded: false,
            watched_folders: {
                list: [],
                selecting: false
            },
            auto_updating: {
                testing: false,
                tested: false,
                server_address: '',
                server_password: ''
            }
        }
    },
    async created() {
        this.watched_folders.list = Config.get('folders') || []
        await this.getUpdaterSource()
        this.loaded = true

        window.addEventListener('keydown', (event) => {
            if (event.code === 'Escape') this.disableActive()
        })
        window.addEventListener('mousedown', (event) => {
            if (!this.loaded || !this.active || !this.$refs.settings || event.target?.['className'] === 'settings-button button') return
            const settingsRects = this.$refs.settings.getBoundingClientRect()

            if (event.x < settingsRects.x) return this.disableActive()
            if (event.y < settingsRects.y) return this.disableActive()
            if (event.x > settingsRects.x + settingsRects.width) return this.disableActive()
            if (event.y > settingsRects.y + settingsRects.height) return this.disableActive()
        })
    },
    methods: {
        disableActive() {
            if (!this.active) return
            this.$emit('update:active', false)
        },
        async clickAddFoldersWatchedFolders() {
            this.watched_folders.selecting = true

            const { filePaths } = await window.electron.ipcRenderer.invoke('show-open-dialog', { properties: ['openDirectory', 'multiSelections'] })

            this.watched_folders.list.push(...filePaths)
            Config.set('folders', this.watched_folders.list)

            this.watched_folders.selecting = false
        },
        clickRemoveFolderWatchedFolders(index: number) {
            this.watched_folders.list.splice(index, 1)
            Config.set('folders', this.watched_folders.list)
        },
        async testUpdaterSource() {
            this.auto_updating.testing = true

            const source = this.auto_updating.server_address.match(/https:\/\/api\.github\.com\/repos\/.+\/releases\/latest/gm) ? 'github' : 'custom'
            const response = await fetch(`${this.auto_updating.server_address}?key=${this.auto_updating.server_password}`)
            if (!response.ok) return (this.auto_updating.testing = false)

            try {
                const json = await response.json()
                if (source === 'github') {
                    if (!json.tag_name || !json.name || !json.assets.find((a) => a.name === 'update.bin')) return (this.auto_updating.testing = false)

                    this.auto_updating.testing = false
                    this.auto_updating.tested = true
                } else {
                    if (!json.electron || !json.project || !json.asarURL || !json.download) return (this.auto_updating.testing = false)

                    this.auto_updating.testing = false
                    this.auto_updating.tested = true
                }
            } finally {
                this.auto_updating.testing = false
            }

            this.auto_updating.testing = false
        },
        async getUpdaterSource() {
            const result = await window.electron.ipcRenderer.invoke('get-updater-source')

            this.auto_updating.server_address = result.url
            this.auto_updating.server_password = result.key
        },
        async setUpdaterSource() {
            if (!this.auto_updating.tested) return
            this.auto_updating.testing = true

            window.electron.ipcRenderer.send('change-updater-source', {
                url: this.auto_updating.server_address,
                key: this.auto_updating.server_password
            })

            await sleep(500)
            await this.getUpdaterSource()

            this.auto_updating.testing = false
            this.auto_updating.tested = false
        },
        async clickTestAutoUpdating() {
            await this.testUpdaterSource()
            if (this.auto_updating.tested) return

            this.$refs['auto-updating-server-address-input'].$refs.input.animate(Animation.headShake, 750)
            this.$refs['auto-updating-server-password-input'].$refs.input.animate(Animation.headShake, 750)
        },
        async clickSaveAutoUpdating() {
            await this.setUpdaterSource()
        }
    }
}
</script>

<style scoped>
.settings-window:is(.v-enter-from, .v-leave-to) {
    opacity: 0;
    margin-bottom: -11px;
}

.settings-window {
    z-index: 100;

    width: 384px;
    height: 566px;

    outline: 0 solid;
    border-radius: 6px;

    background-color: #0a0a0a;
    transition: opacity 0.15s ease-in-out, margin-bottom 0.15s ease-in-out;
}
.settings {
    position: relative;
    left: 22px;
    top: 22px;

    display: flex;
    flex-direction: column;
    gap: 22px;

    width: calc(100% - 22px);
    max-height: calc(100% - 44px);

    overflow: var(--webkit-overlay);
}
.settings > .setting {
    padding: 11px 22px 22px;
    margin-right: 22px;
    border-radius: 6px;

    background-color: #121212;
}
.settings > .setting.watched-folders {
    --lighter: #64b5f6;
    --darker: #42a5f5;
    --darkest: #2196f3;
}
.settings > .setting.auto-updating {
    --lighter: #9575cd;
    --darker: #7e57c2;
    --darkest: #673ab7;
}
.settings > .setting > .header {
    font-size: 13px;
    text-align: left;
    line-height: 9px;

    width: fit-content;
    padding: 6px;
    margin-bottom: 11px;

    color: var(--darker);
    outline: 1px solid var(--darker);
    outline-offset: -1px;
    border-radius: 6px;
}
.settings > .setting > .inputs {
    display: flex;
    flex-direction: column;
    gap: 11px;
}
.settings > .setting > .inputs > .input {
    --background-color: #1c1c1c;
    --placeholder-font-color: #737373;
    --vibrant-color: var(--lighter);
}
.settings > .setting > .buttons {
    display: flex;
    justify-content: space-between;
    flex-direction: row-reverse;
    margin-top: 11px;
}
.settings > .setting > .buttons > .button {
    --button-color: var(--darkest);
}
.settings > .setting > .items {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;

    border-radius: 6px;
}
.settings > .setting > .items > .item {
    display: flex;
    gap: 5px;
}
.settings > .setting > .items > .item > .folder {
    min-width: 255px;
    max-width: 255px;

    color: #eceff1;
    padding: 7px;
    font-size: 11px;
    text-align: left;
    line-height: 8px;
    border-radius: 6px;

    outline: 1px solid var(--lighter);
    outline-offset: -1px;

    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    background-color: #1c1c1c;
}
.settings > .setting > .items > .item > .remove-button {
    color: #b9bbbe;
    width: 22px;
    height: 22px;
    border-radius: 6px;

    background-color: #1c1c1c;
    transition: background-color 0.075s ease-in-out;
    cursor: pointer;
}
.settings > .setting > .items > .item > .remove-button:hover {
    background-color: #ed4245;
}
.settings::-webkit-scrollbar {
    width: 22px;
    height: 22px;
}
.settings::-webkit-scrollbar-thumb {
    border: 7px solid #0a0a0a;
    background-color: #1c1c1c;
    border-radius: 10px;
}
</style>
