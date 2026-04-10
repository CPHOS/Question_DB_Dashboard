const PREFIX = "cphos_pref_"

export interface UserPreferences {
    autoFillAuthor: boolean
    authorName: string
    autoFillReviewer: boolean
    reviewerName: string
}

const DEFAULTS: UserPreferences = {
    autoFillAuthor: false,
    authorName: "",
    autoFillReviewer: false,
    reviewerName: "",
}

function key(userId: string) {
    return `${PREFIX}${userId}`
}

export function loadPreferences(userId: string): UserPreferences {
    try {
        const raw = localStorage.getItem(key(userId))
        if (!raw) return { ...DEFAULTS }
        return { ...DEFAULTS, ...JSON.parse(raw) }
    } catch {
        return { ...DEFAULTS }
    }
}

export function savePreferences(userId: string, prefs: UserPreferences) {
    localStorage.setItem(key(userId), JSON.stringify(prefs))
}
