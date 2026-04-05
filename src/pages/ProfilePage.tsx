import { useState, type FormEvent } from "react"
import {
    Box,
    Button,
    Card,
    Heading,
    Input,
    Stack,
    Text,
    Field,
} from "@chakra-ui/react"
import { useAuth } from "@/contexts/useAuth"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"

export default function ProfilePage() {
    const { user } = useAuth()
    const [oldPwd, setOldPwd] = useState("")
    const [newPwd, setNewPwd] = useState("")
    const [loading, setLoading] = useState(false)

    const handleChangePwd = async (e: FormEvent) => {
        e.preventDefault()
        if (newPwd.length < 6) {
            toaster.error({ title: "新密码至少 6 个字符" })
            return
        }
        setLoading(true)
        try {
            await api.changePassword(oldPwd, newPwd)
            toaster.success({ title: "密码已修改" })
            setOldPwd("")
            setNewPwd("")
        } catch (err) {
            toaster.error({ title: "修改失败", description: String(err) })
        } finally {
            setLoading(false)
        }
    }

    if (!user) return null

    return (
        <Stack gap="5" maxW="500px">
            <Heading size="xl">个人信息</Heading>

            <Card.Root>
                <Card.Body>
                    <Stack gap="2">
                        <Text><strong>用户名:</strong> {user.username}</Text>
                        <Text><strong>显示名:</strong> {user.display_name || "—"}</Text>
                        <Text><strong>角色:</strong> {user.role}</Text>
                        <Text><strong>创建时间:</strong> {new Date(user.created_at).toLocaleString()}</Text>
                    </Stack>
                </Card.Body>
            </Card.Root>

            <Card.Root>
                <Card.Header>
                    <Heading size="md">修改密码</Heading>
                </Card.Header>
                <Card.Body>
                    <Box as="form" onSubmit={handleChangePwd}>
                        <Stack gap="3">
                            <Field.Root required>
                                <Field.Label>当前密码</Field.Label>
                                <Input
                                    type="password"
                                    value={oldPwd}
                                    onChange={(e) => setOldPwd(e.target.value)}
                                />
                            </Field.Root>
                            <Field.Root required>
                                <Field.Label>新密码（至少 6 位）</Field.Label>
                                <Input
                                    type="password"
                                    value={newPwd}
                                    onChange={(e) => setNewPwd(e.target.value)}
                                />
                            </Field.Root>
                            <Button type="submit" colorPalette="blue" loading={loading} alignSelf="flex-start">
                                修改密码
                            </Button>
                        </Stack>
                    </Box>
                </Card.Body>
            </Card.Root>
        </Stack>
    )
}
