import { useState, useEffect, useCallback, type ReactNode } from "react"
import * as api from "@/lib/api"
import { getAccessToken, clearTokens } from "@/lib/token"
import { AuthContext } from "./auth-context"
import type { User } from "@/types"

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
            if (me.role === "bot") {
                clearTokens()
                setUser(null)
            } else {
                setUser(me)
            }
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
        if (me.role === "bot") {
            await api.logout()
            throw new Error("机器人账号不允许通过前端登录")
        }
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
