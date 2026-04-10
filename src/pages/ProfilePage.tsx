import { useState, useEffect, type FormEvent } from "react"
import {
    Box,
    Button,
    Card,
    Heading,
    Input,
    Stack,
    Text,
    Field,
    Switch,
} from "@chakra-ui/react"
import { useAuth } from "@/contexts/useAuth"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"
import { loadPreferences, savePreferences, type UserPreferences } from "@/lib/preferences"

export default function ProfilePage() {
    const { user } = useAuth()
    const [oldPwd, setOldPwd] = useState("")
    const [newPwd, setNewPwd] = useState("")
    const [confirmPwd, setConfirmPwd] = useState("")
    const [loading, setLoading] = useState(false)

    const [prefs, setPrefs] = useState<UserPreferences>({
        autoFillAuthor: false, authorName: "",
        autoFillReviewer: false, reviewerName: "",
    })

    useEffect(() => {
        if (user) setPrefs(loadPreferences(user.user_id))
    }, [user])

    const updatePref = <K extends keyof UserPreferences>(key: K, val: UserPreferences[K]) => {
        if (!user) return
        const next = { ...prefs, [key]: val }
        setPrefs(next)
        savePreferences(user.user_id, next)
    }

    const handleChangePwd = async (e: FormEvent) => {
        e.preventDefault()
        if (newPwd.length < 6) {
            toaster.error({ title: "新密码至少 6 个字符" })
            return
        }
        if (newPwd !== confirmPwd) {
            toaster.error({ title: "两次输入的新密码不一致" })
            return
        }
        setLoading(true)
        try {
            await api.changePassword(oldPwd, newPwd)
            toaster.success({ title: "密码已修改" })
            setOldPwd("")
            setNewPwd("")
            setConfirmPwd("")
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
                        {user.role === "leader" && user.leader_expires_at && (
                            <Text>
                                <strong>Leader 到期:</strong>{" "}
                                <Text as="span" color={
                                    new Date(user.leader_expires_at).getTime() - Date.now() < 7 * 86400_000
                                        ? "orange.500" : undefined
                                }>
                                    {new Date(user.leader_expires_at).toLocaleString()}
                                </Text>
                            </Text>
                        )}
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
                            <Field.Root required>
                                <Field.Label>确认新密码</Field.Label>
                                <Input
                                    type="password"
                                    value={confirmPwd}
                                    onChange={(e) => setConfirmPwd(e.target.value)}
                                />
                            </Field.Root>
                            <Button type="submit" colorPalette="blue" loading={loading} alignSelf="flex-start">
                                修改密码
                            </Button>
                        </Stack>
                    </Box>
                </Card.Body>
            </Card.Root>

            <Card.Root>
                <Card.Header>
                    <Heading size="md">自动填充设置</Heading>
                </Card.Header>
                <Card.Body>
                    <Stack gap="4">
                        <Stack gap="2">
                            <Switch.Root
                                checked={prefs.autoFillAuthor}
                                onCheckedChange={(e) => updatePref("autoFillAuthor", e.checked)}
                            >
                                <Switch.HiddenInput />
                                <Switch.Control>
                                    <Switch.Thumb />
                                </Switch.Control>
                                <Switch.Label>自动填充命题人姓名</Switch.Label>
                            </Switch.Root>
                            {prefs.autoFillAuthor && (
                                <Field.Root>
                                    <Field.Label>命题人姓名</Field.Label>
                                    <Input
                                        size="sm"
                                        value={prefs.authorName}
                                        onChange={(e) => updatePref("authorName", e.target.value)}
                                        placeholder="填入默认命题人姓名"
                                    />
                                </Field.Root>
                            )}
                        </Stack>
                        <Stack gap="2">
                            <Switch.Root
                                checked={prefs.autoFillReviewer}
                                onCheckedChange={(e) => updatePref("autoFillReviewer", e.checked)}
                            >
                                <Switch.HiddenInput />
                                <Switch.Control>
                                    <Switch.Thumb />
                                </Switch.Control>
                                <Switch.Label>自动填充审题人姓名</Switch.Label>
                            </Switch.Root>
                            {prefs.autoFillReviewer && (
                                <Field.Root>
                                    <Field.Label>审题人姓名</Field.Label>
                                    <Input
                                        size="sm"
                                        value={prefs.reviewerName}
                                        onChange={(e) => updatePref("reviewerName", e.target.value)}
                                        placeholder="填入默认审题人姓名"
                                    />
                                    <Text fontSize="xs" color="fg.muted">审阅编辑保存时，若题目允许自动填充，将自动添加此姓名到审题人列表</Text>
                                </Field.Root>
                            )}
                        </Stack>
                    </Stack>
                </Card.Body>
            </Card.Root>
        </Stack>
    )
}
