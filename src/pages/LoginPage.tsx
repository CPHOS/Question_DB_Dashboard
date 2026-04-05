import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
    Box,
    Button,
    Center,
    Heading,
    Input,
    Stack,
    Text,
    Fieldset,
    Field,
} from "@chakra-ui/react"
import { useAuth } from "@/contexts/useAuth"

export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)
        try {
            await login(username, password)
            navigate("/questions", { replace: true })
        } catch (err) {
            setError(err instanceof Error ? err.message : "登录失败")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Center h="100vh" bg="bg.subtle">
            <Box
                as="form"
                onSubmit={handleSubmit}
                bg="bg"
                p="8"
                rounded="xl"
                shadow="md"
                w="full"
                maxW="400px"
            >
                <Stack gap="5">
                    <Heading size="lg" textAlign="center">
                        CPHOS 题库
                    </Heading>

                    <Fieldset.Root>
                        <Stack gap="4">
                            <Field.Root>
                                <Field.Label>用户名</Field.Label>
                                <Input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="请输入用户名"
                                    autoFocus
                                />
                            </Field.Root>

                            <Field.Root>
                                <Field.Label>密码</Field.Label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="请输入密码"
                                />
                            </Field.Root>
                        </Stack>
                    </Fieldset.Root>

                    {error && (
                        <Text color="fg.error" fontSize="sm">
                            {error}
                        </Text>
                    )}

                    <Button type="submit" colorPalette="blue" loading={loading} w="full">
                        登录
                    </Button>
                </Stack>
            </Box>
        </Center>
    )
}
