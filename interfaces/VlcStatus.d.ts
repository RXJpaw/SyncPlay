declare module VlcStatus {
    export interface AudioFilters {
        filter_0: string
    }
    export interface VideoEffects {
        hue: number
        saturation: number
        contrast: number
        brightness: number
        gamma: number
    }
}

interface VlcStatus {
    fullscreen: number
    aspectratio?: string
    audiodelay: number
    apiversion: number
    currentplid: number
    time: number
    volume: number
    length: number
    random: boolean
    audiofilters: VlcStatus.AudioFilters
    rate: number
    videoeffects: VlcStatus.VideoEffects
    state: 'playing' | 'paused' | 'stopped'
    loop: boolean
    version: string
    position: number
    repeat: boolean
    subtitledelay: number
    equalizer: any[]
}
