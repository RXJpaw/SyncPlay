<template>
    <div class="room">
        <div class="user-list-table">
            <div class="table-header">
                <div class="nickname">Nickname</div>
                <div class="time">Time</div>

                <div class="filesize">Filesize</div>
                <div class="filename">Filename</div>
            </div>
            <div class="user-list">
                <div class="user" v-for="user in users" :key="user.id" :class="{ ['omg-its-me-owo']: user.id === subject, ready: getReadyState(user) }">
                    <div class="nickname">{{ user.nickname || `User ${user.id}` }}</div>
                    <div class="time">{{ getReadableTime(user.time) }}</div>
                    <div class="filesize">{{ getReadableBytes(user.file_size) }}</div>
                    <div class="filename">{{ user.file_name || 'No File Selected' }}</div>
                </div>
            </div>
        </div>

        <div class="playlist-table" @dragover="$event.preventDefault()" @dragenter="$event.preventDefault()" @drop="dropFile">
            <div class="table-header">
                <div class="filename">Filename</div>
                <div class="filesize">Filesize</div>
            </div>
            <!-- TODO: make draggable -->
            <div class="playlist" ref="playlist">
                <div
                    class="item"
                    v-for="(item, index) in playlist"
                    :class="{ selected: playlist_index === index, focused: focused_index === index }"
                    tabindex="0"
                    @dblclick="doubleClickPlaylistItem(index)"
                    @focusin="focusInPlaylistItem(index)"
                    @focusout="focusOutPlaylistItem(index)"
                >
                    <div class="filename">{{ item.file_name }}</div>
                    <div class="filesize">{{ getReadableBytes(item.file_size) }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { getFileStats, getReadableBytes, getReadableTime, sleep } from '@/scripts/methods'
import { SyncPlayInstance } from '@/scripts/websocket'
import { Config } from '@/scripts/config'

const { VLC } = window.require('node-vlc-http') as typeof import('node-vlc-http')

const fs = window.require('fs/promises') as typeof import('fs/promises')
const PATH = window.require('path') as typeof import('path')
const child = window.require('child_process') as typeof import('child_process')
const password = crypto.randomUUID()
const port = 44624 + Math.round(Math.random() * 10000)

const SyncPlay = SyncPlayInstance()

export default {
    name: 'Room',
    components: {},
    data() {
        return {
            exists: false,
            status: null as never as VlcStatus,
            VlcPlayer: new VLC({ host: '127.0.0.1', port, password, username: '', maxTries: 100, triesInterval: 33 }),
            VlcChildProcess: child.execFile('C:\\Program Files\\VideoLAN\\VLC\\vlc.exe', [
                '--width',
                '1280',
                '--height',
                '720',
                '--extraintf',
                'http',
                '--http-host',
                '127.0.0.1',
                '--http-port',
                port.toString(),
                '--http-password',
                password.toString()
            ]),
            video: {
                stop_from_moving_until: 0,
                skip_until_file_change: 0,
                participate_playing: false,
                participate_time: false,

                playing: false,
                file_name: '',
                file_size: 0,
                position: 0,
                length: 0,
                time: 0
            },
            playlist: [] as RoomPlaylistItem[],
            playlist_index: -1,
            users: [] as RoomUser[],
            subject: null,

            focused_index: -1
        }
    },
    watch: {
        'video.time'(current, before) {
            if (Math.floor(before) === Math.floor(current)) return

            SyncPlay.setTime(current)
        }
    },
    async created() {
        this.exists = true

        this.VlcPlayer.on('statuschange', async (before: VlcStatus, status: VlcStatus) => {
            this.status = status
            console.debug(before, status)

            if (!before.aspectratio || !status.aspectratio || this.skip_until_file_change > Date.now()) {
                this.video.playing = this.video.participate_playing
                this.video.time = this.video.participate_time

                this.video.playing ? await this.VlcPlayer.resume() : await this.VlcPlayer.forcePause()
                await this.VlcPlayer.seek(this.video.time)

                this.skip_until_file_change = 0
                return
            }

            if (this.skip_until_file_change > Date.now()) return
            this.video.participate_playing = false
            this.video.participate_time = 0

            const beforeTime = this.video.time
            const currentTime = status.length * status.position

            if (this.video.stop_from_moving_until < Date.now() && Math.abs(beforeTime - currentTime) >= 2.0) {
                await SyncPlay.updateRoom({ time: currentTime })

                console.debug(new Date().toLocaleString())
                console.debug('moved')
            }

            if (status.state === 'paused' && before.state !== 'paused' && this.video.playing) {
                this.video.playing = false
                await this.VlcPlayer.seek(Math.floor(currentTime))
                await SyncPlay.updateRoom({ playing: false, time: Math.floor(currentTime) })

                console.debug(new Date().toLocaleString())
                console.debug('paused')
            }

            if (status.state === 'playing' && before.state !== 'playing' && !this.video.playing) {
                this.video.playing = true
                await SyncPlay.updateRoom({ playing: true })

                console.debug(new Date().toLocaleString())
                console.debug('playing')
            }

            this.video.position = status.position
            this.video.length = status.length
            this.video.time = currentTime
        })

        this.VlcPlayer.once('error', () => {
            this.VlcPlayer.removeAllListeners()
            this.VlcPlayer._doTick = () => null
            SyncPlay.disconnect()
        })

        //If your machine is fast enough you will already receive an update on registration.
        SyncPlay.Client.on('Room/users', this.RoomUsersListener)

        const roomUsers: RoomUser[] = await SyncPlay.getRoomUsers()
        this.users = roomUsers
        const user = await SyncPlay.getUser()
        this.subject = user.id
        const roomInfo = await SyncPlay.getRoom()
        if (!roomInfo) return

        console.debug('Room/info', roomInfo)
        console.debug('Room/users', roomUsers)

        await new Promise<void>((resolve) => (this.status ? resolve() : this.VlcPlayer.once('connect', resolve)))

        this.playlist = roomInfo.playlist
        this.playlist_index = roomInfo.playlist_index

        let participate_time = roomUsers.filter((user) => user.id !== this.subject).sort((a, b) => (b.time || 0) - (a.time || 0))?.[0]?.time ?? 0
        let participate_playing = roomInfo.playing
        await this.playCurrentPlaylistItem(participate_playing, participate_time + 1)

        //Only when the room is fully loaded updates should be changing the client's state.
        SyncPlay.Client.on('Room/update', this.RoomUpdateListener)
    },
    beforeMount() {
        window.onbeforeunload = this.killVlcChildProcess

        window.addEventListener('keydown', this.KeyDownListener)
    },
    beforeUnmount() {
        this.exists = false
        this.killVlcChildProcess()

        SyncPlay.Client.off('Room/users', this.RoomUsersListener)
        SyncPlay.Client.off('Room/update', this.RoomUpdateListener)

        window.removeEventListener('keydown', this.KeyDownListener)
    },
    methods: {
        async KeyDownListener(event: KeyboardEvent) {
            switch (event.code) {
                case 'Delete': {
                    await this.DeleteFocusedPlaylistItem()
                    break
                }
                case 'Backspace': {
                    await this.DeleteFocusedPlaylistItem()
                    break
                }
                case 'Enter': {
                    await this.SelectFocusedPlaylistItem()
                    break
                }
            }
        },
        async SelectFocusedPlaylistItem() {
            if (this.focused_index < 0) return

            await this.setSelectedPlaylistItem(this.focused_index)
        },
        async DeleteFocusedPlaylistItem() {
            if (this.focused_index < 0) return

            const playlist = structuredClone(this.playlist)
            playlist.splice(this.focused_index, 1)

            const roomUpdate = {
                playlist: playlist
            }

            if (this.focused_index === this.playlist_index) {
                roomUpdate['playlist_index'] = 0
            } else if (this.focused_index < this.playlist_index) {
                roomUpdate['playlist_index'] = this.playlist_index - 1
            }

            await SyncPlay.updateRoom(roomUpdate)
        },
        async RoomUpdateListener({ data: update, subject }) {
            const currentPlaylistItem = structuredClone(this.playlist[this.playlist_index])
            const triggeredByYou = subject === this.subject
            console.debug('Room/update', update)

            if (update.playlist instanceof Array) {
                this.playlist = update.playlist
            }
            if (typeof update.playlist_index === 'number') {
                this.playlist_index = update.playlist_index
            }

            if (!triggeredByYou && typeof update.playing === 'boolean') {
                update.playing ? await this.VlcPlayer.resume() : await this.VlcPlayer.forcePause()
                this.video.playing = update.playing
            }
            if (!triggeredByYou && typeof update.time === 'number') {
                this.video.stop_from_moving_until = Date.now() + 1000
                await this.VlcPlayer.seek(Math.ceil(update.time))
                this.video.time = update.time
            }

            const newPlaylistItem = structuredClone(this.playlist[this.playlist_index])
            if (currentPlaylistItem?.file_size !== newPlaylistItem?.file_size || currentPlaylistItem?.file_name !== newPlaylistItem?.file_name) {
                await this.playCurrentPlaylistItem()
            }
        },
        async RoomUsersListener({ data: users }) {
            this.users = users
        },
        async playCurrentPlaylistItem(participate_playing?: boolean, participate_time?: number) {
            const currentPlaylistItem = this.playlist[this.playlist_index]
            if (!currentPlaylistItem) return

            const filePath = await this.getFilePath(this.playlist[this.playlist_index].file_name)
            if (!filePath) return

            const fileStats = await getFileStats(filePath)
            if (!fileStats) return

            await SyncPlay.setFile(this.playlist[this.playlist_index].file_name, fileStats.size)

            if (currentPlaylistItem.file_size !== fileStats.size) return

            this.video.participate_playing = participate_playing || false
            this.video.participate_time = participate_time || 0

            this.skip_until_file_change = Date.now() + 1000
            await this.VlcPlayer.addToQueueAndPlay(filePath)
        },
        async doubleClickPlaylistItem(index: number) {
            await this.setSelectedPlaylistItem(index)
        },
        async setSelectedPlaylistItem(index: number) {
            if (this.playlist_index === index) {
                await this.playCurrentPlaylistItem(this.video.playing, this.video.time)
            } else {
                await SyncPlay.updateRoom({ playing: false, time: 0, playlist_index: index })
            }
        },
        async focusInPlaylistItem(index: number) {
            this.focused_index = index
        },
        async focusOutPlaylistItem(index: number) {
            this.focused_index = -1
        },
        async getFilePath(file_name: string) {
            const activeFolders = Config.get('folders')
            const folders = await this.findFolders(activeFolders, 1)

            for (const folder of folders) {
                const filesUnfiltered = await fs.readdir(folder, { withFileTypes: true }).catch(() => {})
                if (!filesUnfiltered) continue

                const file = filesUnfiltered.find((d) => d.isFile() && d.name === file_name)
                if (file) return `${folder}\\${file.name}`
            }
        },
        async findFolders(folders, iterations: number = 0) {
            let dirs: string[] = []

            for (const folder of folders) {
                const dirsUnfiltered = await fs.readdir(folder, { withFileTypes: true }).catch(() => null)
                if (!dirsUnfiltered) continue

                const dirsFiltered = dirsUnfiltered.filter((d) => d.isDirectory()).map((d) => PATH.normalize(`${folder}\\${d.name}`))

                if (iterations > 0 && dirsFiltered.length > 0) {
                    dirs.push(...(await this.findFolders(dirsFiltered, iterations - 1)))
                }

                dirs.push(...dirsFiltered, folder)
            }

            //wow, such uniqueness O:
            return [...new Set(dirs)]
        },
        async dropFile(event: DragEvent) {
            event.preventDefault()

            const newPlaylist = structuredClone(this.playlist)
            let playlistChanged = false

            for (const file of event.dataTransfer?.files || []) {
                const path = file.path
                if (!path) continue

                const stats = await getFileStats(path)
                if (!stats) continue
                //hate them directories >:3
                if (!stats.isFile()) continue

                newPlaylist.push({
                    file_name: PATH.basename(path),
                    file_size: stats.size
                })

                playlistChanged = true
            }

            if (!playlistChanged) return
            await SyncPlay.updateRoom({
                playlist: newPlaylist
            })
        },
        getReadyState(user: RoomUser) {
            const playlistItem = this.playlist[this.playlist_index]
            if (!playlistItem) return null

            return user.file_name === playlistItem.file_name && user.file_size === playlistItem.file_size
        },
        getReadableTime: getReadableTime,
        getReadableBytes: getReadableBytes,
        killVlcChildProcess() {
            child.exec('taskkill /pid ' + this.VlcChildProcess.pid + ' /T /F')
        }
    }
}
</script>

<style scoped>
.room {
    position: absolute;

    display: flex;
    justify-content: center;

    height: calc(698px - 66px);
    width: 450px;

    margin: auto;
    background-color: #121212;
}

.room > .user-list-table {
    position: absolute;
    top: 22px;

    display: flex;
    flex-direction: column;

    width: calc(100% - 44px);
    border-radius: 6px;

    background-color: #1c1c1c;
}
.room > .user-list-table > .user-list {
    position: relative;

    display: flex;
    flex-direction: column;
    gap: 5px;

    width: calc(100% - 44px);
    height: fit-content;
    margin: 4px 22px 22px;

    transform-style: preserve-3d;
    max-height: 130px;
    overflow: var(--webkit-overlay);
}
.room > .user-list-table > .user-list > .user {
    display: flex;
    gap: 5px;

    height: 22px;
    padding: 0 7px;
    border-radius: 6px;

    color: #eceff1;
    font-size: 11px;
    text-align: left;
    line-height: 8px;

    outline: var(--outline-thiccness) solid var(--outline-ready-color);
    outline-offset: var(--outline-offset);

    background-color: #262626;
}
.room > .user-list-table > .user-list > .user.omg-its-me-owo {
    --outline-thiccness: 2px;
    --outline-offset: -2px;
}
.room > .user-list-table > .user-list > .user:not(.omg-its-me-owo) {
    --outline-thiccness: 1px;
    --outline-offset: -1px;
}

.room > .user-list-table > .user-list > .user.ready {
    --outline-ready-color: #81c784;
}
.room > .user-list-table > .user-list > .user:not(.ready) {
    --outline-ready-color: #ffb74d;
}
.room * .table-header * {
    user-select: none;
}

.room > .user-list-table > .table-header,
.room > .playlist-table > .table-header {
    display: flex;
    gap: 5px;

    height: 22px;
    padding: 0 7px;
    margin: 4px 22px 0;
    border-radius: 6px;

    color: #737373;
    font-size: 11px;
    text-align: left;
    line-height: 8px;
}
.room > .user-list-table > .user-list > .user > .nickname,
.room > .user-list-table > .table-header > .nickname {
    min-width: 74px;
    max-width: 74px;
    padding: 7px 0;

    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.room > .user-list-table > .user-list > .user > .time,
.room > .user-list-table > .table-header > .time {
    min-width: 42px;
    max-width: 42px;
    padding: 7px 0;

    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.room > .user-list-table > .user-list > .user > .filesize,
.room > .user-list-table > .table-header > .filesize {
    min-width: 44px;
    max-width: 44px;

    padding: 7px 0;
    overflow: hidden;
    white-space: nowrap;
}
.room > .user-list-table > .user-list > .user > .filename,
.room > .user-list-table > .table-header > .filename {
    min-width: 173px;
    max-width: 173px;

    padding: 7px 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.room > .playlist-table {
    position: absolute;
    bottom: 22px;
    left: 22px;

    width: calc(100% - 44px);
    height: 290px;
    border-radius: 6px;

    background-color: #1c1c1c;
}
.room > .playlist-table > .playlist {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: calc(100% - 44px);
    height: fit-content;
    margin: 4px 22px 22px;
    transform-style: preserve-3d;
    max-height: 238px;
    overflow: var(--webkit-overlay);
}
.room > .playlist-table > .playlist > .item {
    display: flex;
    gap: 5px;

    height: 22px;
    padding: 0 7px;
    border-radius: 6px;

    color: #eceff1;
    font-size: 11px;
    text-align: left;
    line-height: 8px;

    background-color: #262626;
    outline: 0 solid;

    user-select: none;
    cursor: pointer;
}
.room > .playlist-table > .playlist > .item.selected {
    outline: 1px solid #81c784;
    outline-offset: -1px;
}
.room > .playlist-table > .playlist > .item.focused {
    background-color: #333333;
}
.room > .playlist-table > .playlist > .item > .filename,
.room > .playlist-table > .table-header > .filename {
    min-width: 293px;
    max-width: 293px;
    padding: 7px 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.room > .playlist-table > .playlist > .item > .filesize,
.room > .playlist-table > .table-header > .filesize {
    min-width: 50px;
    max-width: 50px;
    padding: 7px 0;
    overflow: hidden;
    white-space: nowrap;
}

.room > .user-list-table > .user-list > .user:nth-child(15n + 1) {
    --outline-color: #90caf9;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 2) {
    --outline-color: #81d4fa;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 3) {
    --outline-color: #80deea;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 4) {
    --outline-color: #80cbc4;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 5) {
    --outline-color: #c5e1a5;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 6) {
    --outline-color: #e6ee9c;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 7) {
    --outline-color: #fff59d;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 8) {
    --outline-color: #ffe082;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 9) {
    --outline-color: #ffcc80;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 10) {
    --outline-color: #ffab91;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 11) {
    --outline-color: #ef9a9a;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 12) {
    --outline-color: #f48fb1;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 13) {
    --outline-color: #ce93d8;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 14) {
    --outline-color: #b39ddb;
}
.room > .user-list-table > .user-list > .user:nth-child(15n + 15) {
    --outline-color: #9fa8da;
}

.room > * ::-webkit-scrollbar {
    width: 17px;
    height: 17px;
}
.room > * ::-webkit-scrollbar-thumb {
    outline: 2px solid #0a0a0a;
    outline-offset: -7px;
    border-radius: 100px;

    background: transparent;
    border: none;
}
.room > * ::-webkit-scrollbar-track {
    background-color: transparent;
    border-radius: 10px;
}
</style>
