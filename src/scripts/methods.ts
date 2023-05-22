import { project_version } from '../../package.json'
import type { Stats } from 'fs'

export const fsSync = window.require('fs') as typeof import('fs')
export const https = window.require('https') as typeof import('https')
export const http = window.require('http') as typeof import('http')

export const getFileStats = (filePath: string): Promise<Stats | null> => {
    return new Promise((resolve) => {
        fsSync.stat(filePath, (err, stats) => {
            if (err) return resolve(null)

            resolve(stats)
        })
    })
}

export const getRequestError = (error_code: string) => {
    switch (error_code) {
        case 'EPROTO':
            return 'tls_unsupported'
        case 'DEPTH_ZERO_SELF_SIGNED_CERT':
            return 'cert_self_signed'
        case 'ERR_TLS_CERT_ALTNAME_INVALID':
            return 'cert_name_mismatch'
        case 'ECONNREFUSED':
            return 'address_unreachable'
        case 'ECONNRESET':
            return 'insecure_unsupported'
        default:
            return 'unknown_error'
    }
}

export const sleep = (duration) => {
    return new Promise((resolve) => {
        setTimeout(resolve, duration)
    })
}

const Byte = {
    Kilo: 1024,
    Mega: 1024 << 10,
    Giga: 1024 << 20
}

export const getReadableTime = (seconds: number = 0) => {
    const milliseconds = (seconds || 0) * 1000
    const date = new Date(milliseconds)

    const hrs = (date.getUTCDate() - 1) * 24 + date.getUTCHours()
    const min = date.getUTCMinutes()
    const sec = date.getUTCSeconds()

    const hh = String(hrs).slice(-2)
    const mm = ('0' + min).slice(-2)
    const ss = ('0' + sec).slice(-2)

    return (hrs ? hh + ':' : '') + mm + ':' + ss
}
export const getReadableBytes = (bytes: number = 0) => {
    if (bytes / Byte.Giga >= 0.9) {
        return `${(bytes / Byte.Giga).toFixed(1)} GB`
    } else if (bytes / Byte.Mega >= 0.9) {
        return `${(bytes / Byte.Mega).toFixed(1)} MB`
    } else if (bytes / Byte.Kilo >= 0.9) {
        return `${(bytes / Byte.Kilo).toFixed(1)} KB`
    } else {
        return `${bytes} B`
    }
}
