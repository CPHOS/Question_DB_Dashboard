import {
    Box,
    Flex,
    HStack,
    Text,
    Button,
    IconButton,
    VStack,
    Separator,
    Circle,
} from "@chakra-ui/react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/useAuth"
import { ColorModeButton } from "@/components/ui/color-mode"
import {
    LuFileText,
    LuBookOpen,
    LuShield,
    LuUser,
    LuLogOut,
    LuMenu,
} from "react-icons/lu"
import { useState, useEffect } from "react"
import * as api from "@/lib/api"

const NAV = [
    { to: "/questions", label: "题目管理", icon: <LuFileText />, roles: ["viewer", "editor", "admin"] },
    { to: "/papers", label: "试卷管理", icon: <LuBookOpen />, roles: ["viewer", "editor", "admin"] },
    { to: "/profile", label: "个人信息", icon: <LuUser />, roles: ["viewer", "editor"] },
    { to: "/admin", label: "管理后台", icon: <LuShield />, roles: ["admin"] },
] as const

export default function AppLayout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [collapsed, setCollapsed] = useState(false)
    const [healthOk, setHealthOk] = useState<boolean | null>(null)

    useEffect(() => {
        const check = () => {
            api.healthCheck()
                .then(() => setHealthOk(true))
                .catch(() => setHealthOk(false))
        }
        check()
        const timer = setInterval(check, 30_000)
        return () => clearInterval(timer)
    }, [])

    const handleLogout = async () => {
        await logout()
        navigate("/login")
    }

    const visibleNav = NAV.filter((n) => user && (n.roles as readonly string[]).includes(user.role))

    return (
        <Flex h="100vh">
            {/* Sidebar */}
            <Box
                w={collapsed ? "60px" : "220px"}
                bg="bg.subtle"
                borderRightWidth="1px"
                transition="width 0.2s"
                flexShrink={0}
                overflow="hidden"
            >
                <Flex direction="column" h="full">
                    <HStack p="3" justify={collapsed ? "center" : "space-between"}>
                        {!collapsed && (
                            <Text fontWeight="bold" fontSize="lg" truncate>
                                题库管理
                            </Text>
                        )}
                        <IconButton
                            aria-label="toggle sidebar"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCollapsed(!collapsed)}
                        >
                            <LuMenu />
                        </IconButton>
                    </HStack>

                    <Separator />

                    <VStack gap="1" p="2" align="stretch" flex="1">
                        {visibleNav.map((n) => {
                            const active = location.pathname.startsWith(n.to)
                            return (
                                <Button
                                    key={n.to}
                                    asChild
                                    variant={active ? "subtle" : "ghost"}
                                    justifyContent="flex-start"
                                    size="sm"
                                >
                                    <Link to={n.to}>
                                        {n.icon}
                                        {!collapsed && <Text ml="2">{n.label}</Text>}
                                    </Link>
                                </Button>
                            )
                        })}
                    </VStack>

                    <Separator />

                    <VStack p="2" gap="1" align="stretch">
                        {!collapsed && user && (
                            <Text fontSize="xs" color="fg.muted" px="2" truncate>
                                {user.display_name || user.username} ({user.role})
                            </Text>
                        )}
                        <HStack px="2" gap="2">
                            <Circle
                                size="8px"
                                bg={healthOk === null ? "gray.400" : healthOk ? "green.400" : "red.400"}
                                title={healthOk === null ? "检查中..." : healthOk ? "服务正常" : "服务异常"}
                            />
                            {!collapsed && (
                                <Text fontSize="xs" color="fg.muted">
                                    {healthOk === null ? "检查中..." : healthOk ? "服务正常" : "服务异常"}
                                </Text>
                            )}
                        </HStack>
                        <HStack>
                            <ColorModeButton />
                            <IconButton
                                aria-label="logout"
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                            >
                                <LuLogOut />
                            </IconButton>
                        </HStack>
                    </VStack>
                </Flex>
            </Box>

            {/* Main content */}
            <Box flex="1" overflow="auto" p="6">
                <Outlet />
            </Box>
        </Flex>
    )
}
