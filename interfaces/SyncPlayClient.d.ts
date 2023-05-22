declare module SyncPlayClient {
    export interface Options {
        session?: string
        insecure?: boolean
        ignoreCert?: boolean
    }

    export type Response = 'open' | 'error'
    export type Error = 'tls_unsupported' | 'cert_self_signed' | 'cert_name_mismatch' | 'address_unreachable' | 'insecure_unsupported' | 'unknown_error' | 'unauthorized'
}
