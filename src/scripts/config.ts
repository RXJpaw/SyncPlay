export const Config = {
    get: (key: string) => {
        const configKey = key.toLowerCase()

        try {
            return JSON.parse(localStorage.getItem(`Config/${configKey}`)!)
        } catch (e) {
            return null
        }
    },
    set: (key: string, value: any) => {
        const configKey = key.toLowerCase()

        try {
            localStorage.setItem(`Config/${configKey}`, JSON.stringify(value))

            return value
        } catch (e) {
            return null
        }
    }
}
