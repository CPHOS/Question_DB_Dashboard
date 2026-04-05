import { Link, Outlet, useLocation } from "react-router-dom"
import { Button, HStack, Heading, Stack } from "@chakra-ui/react"

const TABS = [
    { to: "/admin/questions", label: "已删除题目" },
    { to: "/admin/papers", label: "已删除试卷" },
    { to: "/admin/gc", label: "垃圾回收" },
    { to: "/admin/users", label: "用户管理" },
    { to: "/admin/ops", label: "运维操作" },
]

export default function AdminLayout() {
    const location = useLocation()

    return (
        <Stack gap="4">
            <Heading size="xl">管理后台</Heading>
            <HStack gap="2" wrap="wrap">
                {TABS.map((t) => (
                    <Button
                        key={t.to}
                        asChild
                        size="sm"
                        variant={location.pathname.startsWith(t.to) ? "subtle" : "outline"}
                    >
                        <Link to={t.to}>{t.label}</Link>
                    </Button>
                ))}
            </HStack>
            <Outlet />
        </Stack>
    )
}
