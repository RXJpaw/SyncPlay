<template>
    <div class="home">
        <div class="form">
            <div class="fields" :style="`height: ${66 + getFieldsHeight()}px;`">
                <!-- 0: Login -->
                <TextInput
                    class="server-address-input input first"
                    ref="server-address-input"
                    :class="{ prev: phase > 0 }"
                    :disabled="loading || phase !== 0"
                    width="calc(100% - 44px)"
                    placeholder="Server Address"
                    v-model:input="inputs.server_address"
                    type="text"
                />
                <TextInput
                    class="server-password-input input second"
                    ref="server-password-input"
                    :class="{ prev: phase > 0 }"
                    :disabled="loading || phase !== 0"
                    width="calc(100% - 44px)"
                    placeholder="Server Password"
                    v-model:input="inputs.server_password"
                    type="password"
                />

                <!-- 1: Joining -->
                <TextInput
                    class="nickname-input input first"
                    ref="nickname-input"
                    :class="{ prev: phase > 1, next: phase < 1 }"
                    :disabled="loading || phase !== 1"
                    width="calc(100% - 44px)"
                    placeholder="Nickname"
                    v-model:input="inputs.nickname"
                    type="text"
                />
                <TextInput
                    class="room-input input second"
                    ref="room-input"
                    :class="{ prev: phase > 1, next: phase < 1 }"
                    :disabled="loading || phase !== 1"
                    width="calc(100% - 44px)"
                    placeholder="Room"
                    v-model:input="inputs.room"
                    type="text"
                />
            </div>
            <div class="button-flex">
                <Button v-if="phase === 0" :disabled="loading || phase !== 0" class="join-server-button" text="Join Server" @click="joinServer()"></Button>
                <Button v-if="phase === 1" :disabled="loading || phase !== 1" class="join-room-button" text="Join Room" @click="joinRoom"></Button>
                <Button v-if="phase === 1" :disabled="loading || phase !== 1" class="back-to-join-server-button" text="Go Back" @click="quitServer"></Button>
            </div>

            <LoadingBar :loading="loading"></LoadingBar>
        </div>
    </div>
</template>

<script lang="ts">
import TextInput from '@/components/Browser/TextInput.vue'
import LoadingBar from '@/components/Misc/LoadingBar.vue'
import { SyncPlayInstance } from '@/scripts/websocket'
import Button from '@/components/Browser/Button.vue'
import Animation from '@/scripts/animations'
import { sleep } from '@/scripts/methods'

const SyncPlay = SyncPlayInstance()

const LastServerAddress = localStorage.getItem('ServerAddress/last')
const LastServerPassword = localStorage.getItem('ServerPassword/last')
export default {
    name: 'Homescreen',
    components: { LoadingBar, Button, TextInput },
    props: {
        phase: Number as () => number
    },
    data() {
        return {
            loading: false,
            inputs: {
                server_address: LastServerAddress,
                server_password: LastServerPassword,
                nickname: localStorage.getItem(`Nickname/${LastServerAddress}/last`),
                room: localStorage.getItem(`Room/${LastServerAddress}/last`)
            },
            prompt: ''
        }
    },
    methods: {
        serverAddressInputError() {
            this.$refs['server-address-input'].$refs.input.animate(Animation.headShake, 750)
        },
        serverPasswordInputError() {
            this.$refs['server-password-input'].$refs.input.animate(Animation.headShake, 750)
        },
        nickNameInputError() {
            this.$refs['nickname-input'].$refs.input.animate(Animation.headShake, 750)
        },
        roomInputError() {
            this.$refs['room-input'].$refs.input.animate(Animation.headShake, 750)
        },
        async joinServer() {
            if (!this.inputs.server_address) this.serverAddressInputError()
            if (!this.inputs.server_password) this.serverPasswordInputError()
            if (!this.inputs.server_password || !this.inputs.server_address) return

            if (this.loading) return
            this.loading = true

            localStorage.setItem('ServerAddress/last', this.inputs.server_address)
            localStorage.setItem('ServerPassword/last', this.inputs.server_password)

            await sleep(100)

            const ServerAddress = this.inputs.server_address.includes(':') ? this.inputs.server_address : this.inputs.server_address + ':3515'
            const BasicHeader = 'Basic ' + Buffer.from(this.inputs.server_password, 'utf-8').toString('base64url')

            const Authorization = await SyncPlay.getAuthorization(ServerAddress, BasicHeader, { ignoreCert: true })
            if (typeof Authorization === 'string') {
                switch (Authorization) {
                    case 'cert_self_signed':
                        this.promptCertSelfSigned()
                        break
                    case 'cert_name_mismatch':
                        this.promptCertNameMismatch()
                        break
                    case 'unknown_error':
                    case 'tls_unsupported':
                    case 'address_unreachable':
                    case 'insecure_unsupported':
                        this.serverAddressInputError()
                        break
                    case 'unauthorized':
                        this.serverPasswordInputError()
                        break
                }
            } else {
                const status = await SyncPlay.connect(ServerAddress, Authorization.token, { ignoreCert: true, session: crypto.randomUUID() })

                if (status !== 'open') {
                    this.serverAddressInputError()
                } else {
                    this.inputs.nickname = localStorage.getItem(`Nickname/${this.inputs.server_address}/last`)
                    this.inputs.room = localStorage.getItem(`Room/${this.inputs.server_address}/last`)
                }
            }

            this.loading = false
        },
        async quitServer() {
            SyncPlay.disconnect()
        },
        async joinRoom() {
            if (!this.inputs.room) this.roomInputError()
            if (!this.inputs.nickname) this.nickNameInputError()
            if (!this.inputs.nickname || !this.inputs.room) return

            if (this.loading) return
            this.loading = true

            localStorage.setItem(`Nickname/${this.inputs.server_address}/last`, this.inputs.nickname)
            localStorage.setItem(`Room/${this.inputs.server_address}/last`, this.inputs.room)

            await sleep(100)
            await SyncPlay.setNickname(this.inputs.nickname)
            await SyncPlay.joinRoom(this.inputs.room)

            this.loading = false
        },
        promptCertNameMismatch() {},
        promptCertSelfSigned() {},
        getFieldsHeight() {
            switch (this.phase) {
                //login
                case 0: {
                    return 88
                }
                //joining
                case 1: {
                    return 88
                }
            }
        }
    }
}
</script>

<style scoped>
.home {
    position: absolute;

    display: flex;
    justify-content: center;

    height: calc(698px - 66px);
    width: 450px;

    margin: auto;
    background-color: #121212;
}
.home > .form {
    position: relative;
    top: 22px;

    width: calc(100% - 44px);
    height: fit-content;
    border-radius: 6px;

    background-color: #1c1c1c;

    transform-style: preserve-3d;
}
.home > .form > .fields {
    position: relative;
    width: 100%;

    transition: height 250ms ease-in-out;
    overflow: hidden;
}
.home > .form > .fields > .input {
    position: absolute;
    left: 22px;

    transition: left 0.25s ease-in-out;
}
.home > .form > .fields > .input.prev {
    left: -385px;
}
.home > .form > .fields > .input.next {
    left: 428px;
}
.home > .form > .fields > .first {
    top: 22px;
}
.home > .form > .fields > .second {
    top: 77px;
}
.home > .form > .fields > .third {
    top: 132px;
}

.home > .form > .button-flex {
    position: relative;
    margin: 0 22px 22px;

    display: flex;
    justify-content: space-between;
    flex-direction: row-reverse;
    gap: 22px;
}
</style>
