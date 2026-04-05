import {
    Box,
    Flex,
    HStack,
    Text,
    Button,
    IconButton,
    VStack,
    Separator,
} from "@chakra-ui/react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { ColorModeButton } from "@/components/ui/color-mode"
import {
    LuFileText,
    LuBookOpen,
    LuShield,
    LuSettings,
    LuLogOut,
    LuMenu,
} from "react-icons/lu"
import { useState } from "react"

const NAV = [
    { to: "/questions", label: "题目管理", icon: <LuFileText />, roles: ["viewer", "editor", "admin"] },
    { to: "/papers", label: "试卷管理", icon: <LuBookOpen />, roles: ["viewer", "editor", "admin"] },
    { to: "/ops", label: "运维操作", icon: <LuSettings />, roles: ["editor", "admin"] },
    { to: "/admin", label: "管理后台", icon: <LuShield />, roles: ["admin"] },
] as const

export default function AppLayout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [collapsed, setCollapsed] = useState(false)

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
