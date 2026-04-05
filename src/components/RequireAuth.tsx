import { Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/useAuth"
import { Spinner, Center } from "@chakra-ui/react"
import type { ReactNode } from "react"

interface Props {
    children: ReactNode
    roles?: string[]
}

export default function RequireAuth({ children, roles }: Props) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <Center h="100vh">
                <Spinner size="xl" />
            </Center>
        )
    }

    if (!user) return <Navigate to="/login" replace />

    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/questions" replace />
    }

    return <>{children}</>
}
