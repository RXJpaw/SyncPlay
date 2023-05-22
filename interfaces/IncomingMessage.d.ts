interface IncomingMessage {
    aborted: boolean
    client: import('tls').TLSSocket
    complete: boolean
    httpVersion: string
    httpVersionMajor: number
    httpVersionMinor: number
    method: unknown
    rawHeaders: string[]
    rawTrailers: unknown[]
    req: import('http').ClientRequest
    socket: import('tls').TLSSocket
    statusCode: number
    statusMessage: string
    upgrade: boolean
    url: string
    headers: { [header: string]: string }
}
