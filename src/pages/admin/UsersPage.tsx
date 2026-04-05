import { useEffect, useState, useCallback, type FormEvent } from "react"
import {
    Box,
    Button,
    HStack,
    Table,
    Text,
    Badge,
    IconButton,
    Stack,
    Input,
    Field,
    Select,
    Portal,
    Dialog,
    createListCollection,
} from "@chakra-ui/react"
import type { User, Paginated } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"
import { LuPlus, LuChevronLeft, LuChevronRight, LuTrash2, LuPencil } from "react-icons/lu"
import ConfirmDialog from "@/components/ConfirmDialog"

const LIMIT = 20

const roleOptions = createListCollection({
    items: [
        { label: "Viewer", value: "viewer" },
        { label: "Editor", value: "editor" },
        { label: "Admin", value: "admin" },
    ],
})

const activeOptions = createListCollection({
    items: [
        { label: "活跃", value: "true" },
        { label: "停用", value: "false" },
    ],
})

export default function UsersPage() {
    const [data, setData] = useState<Paginated<User> | null>(null)
    const [offset, setOffset] = useState(0)
    const [loading, setLoading] = useState(false)

    // Create user dialog
    const [showCreate, setShowCreate] = useState(false)
    const [newUsername, setNewUsername] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [newDisplayName, setNewDisplayName] = useState("")
    const [newRole, setNewRole] = useState<"viewer" | "editor" | "admin">("viewer")
    const [creating, setCreating] = useState(false)

    // Edit user dialog
    const [editUser, setEditUser] = useState<User | null>(null)
    const [editDisplayName, setEditDisplayName] = useState("")
    const [editRole, setEditRole] = useState<"viewer" | "editor" | "admin">("viewer")
    const [editActive, setEditActive] = useState(true)
    const [saving, setSaving] = useState(false)

    // Deactivate confirm
    const [deactivateUser, setDeactivateUser] = useState<User | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.adminGetUsers(LIMIT, offset)
            setData(res)
        } catch (e) {
            toaster.error({ title: "加载失败", description: String(e) })
        } finally {
            setLoading(false)
        }
    }, [offset])

    useEffect(() => { load() }, [load])

    const page = Math.floor(offset / LIMIT)
    const totalPages = data ? Math.ceil(data.total / LIMIT) : 0

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault()
        setCreating(true)
        try {
            await api.adminCreateUser({
                username: newUsername.trim(),
                password: newPassword,
                display_name: newDisplayName.trim(),
                role: newRole,
            })
            toaster.success({ title: "创建成功" })
            setShowCreate(false)
            setNewUsername("")
            setNewPassword("")
            setNewDisplayName("")
            setNewRole("viewer")
            load()
        } catch (err) {
            toaster.error({ title: "创建失败", description: String(err) })
        } finally {
            setCreating(false)
        }
    }

    const openEdit = (u: User) => {
        setEditUser(u)
        setEditDisplayName(u.display_name)
        setEditRole(u.role)
        setEditActive(u.is_active)
    }

    const handleEdit = async (e: FormEvent) => {
        e.preventDefault()
        if (!editUser) return
        setSaving(true)
        try {
            await api.adminUpdateUser(editUser.user_id, {
                display_name: editDisplayName.trim(),
                role: editRole,
                is_active: editActive,
            })
            toaster.success({ title: "更新成功" })
            setEditUser(null)
            load()
        } catch (err) {
            toaster.error({ title: "更新失败", description: String(err) })
        } finally {
            setSaving(false)
        }
    }

    const handleDeactivate = async (u: User) => {
        setDeactivateUser(null)
        try {
            await api.adminDeleteUser(u.user_id)
            toaster.success({ title: "已停用" })
            load()
        } catch (e) {
            toaster.error({ title: "停用失败", description: String(e) })
        }
    }

    const roleColor = (r: string) => {
        if (r === "admin") return "red"
        if (r === "editor") return "blue"
        return "gray"
    }

    return (
        <Stack gap="3">
            <HStack justify="space-between">
                <Text fontWeight="medium">用户列表</Text>
                <Button size="sm" colorPalette="blue" onClick={() => setShowCreate(true)}>
                    <LuPlus /> 创建用户
                </Button>
            </HStack>

            <Box overflowX="auto">
                <Table.Root size="sm" striped>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>用户名</Table.ColumnHeader>
                            <Table.ColumnHeader>显示名</Table.ColumnHeader>
                            <Table.ColumnHeader>角色</Table.ColumnHeader>
                            <Table.ColumnHeader>状态</Table.ColumnHeader>
                            <Table.ColumnHeader>创建时间</Table.ColumnHeader>
                            <Table.ColumnHeader>操作</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {loading && (
                            <Table.Row>
                                <Table.Cell colSpan={6}><Text textAlign="center">加载中...</Text></Table.Cell>
                            </Table.Row>
                        )}
                        {data?.items.map((u) => (
                            <Table.Row key={u.user_id}>
                                <Table.Cell fontWeight="medium">{u.username}</Table.Cell>
                                <Table.Cell>{u.display_name || "—"}</Table.Cell>
                                <Table.Cell>
                                    <Badge colorPalette={roleColor(u.role)}>{u.role}</Badge>
                                </Table.Cell>
                                <Table.Cell>
                                    {u.is_active ? (
                                        <Badge colorPalette="green">活跃</Badge>
                                    ) : (
                                        <Badge colorPalette="gray">已停用</Badge>
                                    )}
                                </Table.Cell>
                                <Table.Cell fontSize="xs" color="fg.muted">
                                    {new Date(u.created_at).toLocaleDateString()}
                                </Table.Cell>
                                <Table.Cell>
                                    <HStack gap="1">
                                        <IconButton aria-label="edit" size="xs" variant="ghost" onClick={() => openEdit(u)}>
                                            <LuPencil />
                                        </IconButton>
                                        {u.is_active && (
                                            <IconButton
                                                aria-label="deactivate"
                                                size="xs"
                                                variant="ghost"
                                                colorPalette="red"
                                                onClick={() => setDeactivateUser(u)}
                                            >
                                                <LuTrash2 />
                                            </IconButton>
                                        )}
                                    </HStack>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>

            <HStack justify="space-between">
                <Text fontSize="sm" color="fg.muted">共 {data?.total ?? 0} 条</Text>
                <HStack>
                    <IconButton aria-label="prev" size="xs" variant="outline" disabled={page === 0}
                        onClick={() => setOffset(offset - LIMIT)}>
                        <LuChevronLeft />
                    </IconButton>
                    <Text fontSize="sm">{page + 1} / {totalPages || 1}</Text>
                    <IconButton aria-label="next" size="xs" variant="outline" disabled={page + 1 >= totalPages}
                        onClick={() => setOffset(offset + LIMIT)}>
                        <LuChevronRight />
                    </IconButton>
                </HStack>
            </HStack>

            {/* Create User Dialog */}
            <Dialog.Root open={showCreate} onOpenChange={(e) => setShowCreate(e.open)}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title>创建用户</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body>
                                <Box as="form" id="createUserForm" onSubmit={handleCreate}>
                                    <Stack gap="3">
                                        <Field.Root required>
                                            <Field.Label>用户名</Field.Label>
                                            <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                                        </Field.Root>
                                        <Field.Root required>
                                            <Field.Label>密码（至少 6 位）</Field.Label>
                                            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label>显示名</Field.Label>
                                            <Input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label>角色</Field.Label>
                                            <Select.Root
                                                collection={roleOptions}
                                                size="sm"
                                                value={[newRole]}
                                                onValueChange={(e) => setNewRole(e.value[0] as "viewer" | "editor" | "admin")}
                                            >
                                                <Select.HiddenSelect />
                                                <Select.Control>
                                                    <Select.Trigger>
                                                        <Select.ValueText />
                                                    </Select.Trigger>
                                                    <Select.IndicatorGroup>
                                                        <Select.Indicator />
                                                    </Select.IndicatorGroup>
                                                </Select.Control>
                                                <Select.Positioner>
                                                    <Select.Content>
                                                        {roleOptions.items.map((item) => (
                                                            <Select.Item item={item} key={item.value}>
                                                                {item.label}
                                                                <Select.ItemIndicator />
                                                            </Select.Item>
                                                        ))}
                                                    </Select.Content>
                                                </Select.Positioner>
                                            </Select.Root>
                                        </Field.Root>
                                    </Stack>
                                </Box>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline">取消</Button>
                                </Dialog.ActionTrigger>
                                <Button type="submit" form="createUserForm" colorPalette="blue" loading={creating}>
                                    创建
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* Edit User Dialog */}
            <Dialog.Root open={!!editUser} onOpenChange={(e) => { if (!e.open) setEditUser(null) }}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title>编辑用户 — {editUser?.username}</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body>
                                <Box as="form" id="editUserForm" onSubmit={handleEdit}>
                                    <Stack gap="3">
                                        <Field.Root>
                                            <Field.Label>显示名</Field.Label>
                                            <Input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label>角色</Field.Label>
                                            <Select.Root
                                                collection={roleOptions}
                                                size="sm"
                                                value={[editRole]}
                                                onValueChange={(e) => setEditRole(e.value[0] as "viewer" | "editor" | "admin")}
                                            >
                                                <Select.HiddenSelect />
                                                <Select.Control>
                                                    <Select.Trigger>
                                                        <Select.ValueText />
                                                    </Select.Trigger>
                                                    <Select.IndicatorGroup>
                                                        <Select.Indicator />
                                                    </Select.IndicatorGroup>
                                                </Select.Control>
                                                <Select.Positioner>
                                                    <Select.Content>
                                                        {roleOptions.items.map((item) => (
                                                            <Select.Item item={item} key={item.value}>
                                                                {item.label}
                                                                <Select.ItemIndicator />
                                                            </Select.Item>
                                                        ))}
                                                    </Select.Content>
                                                </Select.Positioner>
                                            </Select.Root>
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label>是否活跃</Field.Label>
                                            <Select.Root
                                                collection={activeOptions}
                                                size="sm"
                                                value={[editActive ? "true" : "false"]}
                                                onValueChange={(e) => setEditActive(e.value[0] === "true")}
                                            >
                                                <Select.HiddenSelect />
                                                <Select.Control>
                                                    <Select.Trigger>
                                                        <Select.ValueText />
                                                    </Select.Trigger>
                                                    <Select.IndicatorGroup>
                                                        <Select.Indicator />
                                                    </Select.IndicatorGroup>
                                                </Select.Control>
                                                <Select.Positioner>
                                                    <Select.Content>
                                                        {activeOptions.items.map((item) => (
                                                            <Select.Item item={item} key={item.value}>
                                                                {item.label}
                                                                <Select.ItemIndicator />
                                                            </Select.Item>
                                                        ))}
                                                    </Select.Content>
                                                </Select.Positioner>
                                            </Select.Root>
                                        </Field.Root>
                                    </Stack>
                                </Box>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline">取消</Button>
                                </Dialog.ActionTrigger>
                                <Button type="submit" form="editUserForm" colorPalette="blue" loading={saving}>
                                    保存
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            <ConfirmDialog
                open={!!deactivateUser}
                title="停用确认"
                description={`确定要停用用户 ${deactivateUser?.username ?? ""} 吗？`}
                onConfirm={() => deactivateUser && handleDeactivate(deactivateUser)}
                onCancel={() => setDeactivateUser(null)}
            />
        </Stack>
    )
}
