import { sleep, https, http, getRequestError } from '@/scripts/methods'
import { EventEmitter } from 'events'

const { WebSocket } = window
const Emitter = new EventEmitter()

let last_session_uuid = crypto.randomUUID()
let server_address = ''
let server_token = ''
let websocket = null as never as import('ws')
let user = {} as ConnectionUser

export const SyncPlayInstance = () => {
    const connect = async (address: string, token: string, options: SyncPlayClient.Options = {}): Promise<SyncPlayClient.Response> => {
        if (options.session) last_session_uuid = options.session
        if (websocket) disconnect()

        try {
            websocket = new WebSocket(`${options.insecure ? 'ws' : 'wss'}://${address}/v1/websocket`, {
                headers: { authorization: 'Bearer ' + token },
                rejectUnauthorized: !options.ignoreCert
            })
        } catch {
            return 'error'
        }

        const OpenListener = async () => {
            console.debug('[sp-ws] connected to websocket!')

            Emitter.once('User/update', () => {
                server_address = address
                server_token = token

                Emitter.emit('websocket-connection', 'open')
            })
        }
        const ErrorListener = async (error: Error) => {
            if (error.message.startsWith('Unexpected server response')) disconnect(true)

            console.debug('[sp-ws] connection error:', { ...error, name: error.name, stack: error.stack, cause: error.cause, message: error.message })

            Emitter.emit('websocket-connection', 'error')
        }
        const CloseListener = async (code: number) => {
            console.debug('[sp-ws] connection closed!')

            user = {} as ConnectionUser

            if (code === 1000) {
                Emitter.emit('phase', 'join-server')
            } else {
                if (options.session !== last_session_uuid) return
                Emitter.emit('phase', 'reconnect')

                await sleep(1000)

                if (options.session !== last_session_uuid) return
                await connect(address, token, options)
            }
        }
        const MessageListener = async (buffer) => {
            const payload = JSON.parse(buffer.toString())
            if (payload.id) return

            Emitter.emit(payload.event, { data: payload.data, subject: payload.subject })

            switch (payload.event) {
                case 'User/update': {
                    const before = user
                    user = payload.data
                    const current = user

                    if (!before.room && current.room) {
                        Emitter.emit('phase', 'room')
                    } else if (!current.room) {
                        Emitter.emit('phase', 'join-room')
                    }

                    break
                }
            }
        }

        websocket.removeAllListeners()

        websocket.on('open', OpenListener)
        websocket.on('error', ErrorListener)
        websocket.on('close', CloseListener)
        websocket.on('message', MessageListener)

        return new Promise((resolve) => {
            Emitter.once('websocket-connection', resolve)
        })
    }

    const request = async (method: string, path: string, body?) => {
        const getHeaders = () => {
            const headers = { authorization: 'Bearer ' + server_token }
            if (body) headers['content-type'] = 'application/json'
            return headers
        }

        const response = await fetch('https://' + server_address + '/v1' + path, {
            method: method.toUpperCase(),
            headers: getHeaders(),
            body: JSON.stringify(body)
        })

        return response.headers.get('content-length') === '0' ? {} : await response.json()
    }

    const disconnect = (force?: boolean) => {
        if (force) {
            last_session_uuid = crypto.randomUUID()
            Emitter.emit('phase', 'join-server')
        }

        const status = getStatus()
        if ([WebSocket.OPEN, WebSocket.CONNECTING].includes(status)) websocket.close(1000)
    }
    const getStatus = (): any => websocket?.readyState ?? 3
    const isConnected = () => getStatus() === WebSocket.OPEN
    const getAuthorization = async (server_address: string, authorization: string, options: SyncPlayClient.Options = {}) => {
        const Request: IncomingMessage | SyncPlayClient.Error = await new Promise((resolve: any) => {
            const proto = options.insecure ? 'http' : 'https'
            const module = options.insecure ? http : https
            const request = module.request(`${proto}://${server_address}/v1/authorization`, { headers: { authorization }, rejectUnauthorized: !options.ignoreCert }, resolve)

            request.once('socket', () => request.end())
            request.once('error', (err) => resolve(getRequestError(err['code'])))
        })

        if (typeof Request === 'string') return Request
        if (Request.statusCode !== 200) return 'unauthorized'

        return {
            token: Request.headers.authorization,
            certificate: Request.socket.getPeerCertificate()
        }
    }

    //Room
    const joinRoom = (room) => {
        return request('post', `/room/${room}/join`)
    }
    const updateRoom = (update) => {
        return request('put', `/room`, update)
    }
    const leaveRoom = () => {
        return request('delete', `/room`)
    }
    const getRoom = () => {
        return request('get', `/room`)
    }
    const getRoomUsers = () => {
        return request('get', `/users`)
    }

    //User
    const setNickname = (nickname) => {
        return request('put', '/nickname', nickname)
    }
    const getUser = () => {
        return request('get', '/user')
    }
    const setFile = (name, size) => {
        return request('put', '/file', { name, size })
    }
    const setTime = (time) => {
        if (!isConnected()) return null

        return websocket.send(
            JSON.stringify({
                event: 'Time/set',
                data: time
            })
        )
    }

    return {
        Client: Emitter,
        connect,
        disconnect,
        getStatus,
        isConnected,
        getAuthorization,

        joinRoom,
        updateRoom,
        leaveRoom,
        getRoom,
        getRoomUsers,

        setNickname,
        getUser,
        setFile,
        setTime
    }
}
