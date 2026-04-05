import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { User } from "@/types"
import * as api from "@/lib/api"
import { getAccessToken, clearTokens } from "@/lib/token"

interface AuthState {
    user: User | null
    loading: boolean
    login: (username: string, password: string) => Promise<void>
    logout: () => Promise<void>
    refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        if (!getAccessToken()) {
            setUser(null)
            setLoading(false)
            return
        }
        try {
            const me = await api.getMe()
            setUser(me)
        } catch {
            clearTokens()
            setUser(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    const loginFn = useCallback(async (username: string, password: string) => {
        await api.login({ username, password })
        const me = await api.getMe()
        setUser(me)
    }, [])

    const logoutFn = useCallback(async () => {
        await api.logout()
        setUser(null)
    }, [])

    return (
        <AuthContext.Provider value={{ user, loading, login: loginFn, logout: logoutFn, refresh }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
    return ctx
}
