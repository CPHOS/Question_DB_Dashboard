import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
    Box,
    Button,
    Heading,
    HStack,
    Text,
    Badge,
    Stack,
    Separator,
    Flex,
    Card,
    Table,
    Spinner,
    Center,
} from "@chakra-ui/react"
import type { PaperDetail } from "@/types"
import * as api from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toaster } from "@/components/ui/toaster"
import { LuArrowLeft, LuPencil, LuTrash2 } from "react-icons/lu"

export default function PaperDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const canEdit = user?.role === "editor" || user?.role === "admin"

    const [paper, setPaper] = useState<PaperDetail | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return
        setLoading(true)
        api
            .getPaper(id)
            .then(setPaper)
            .catch((e) => toaster.error({ title: "加载失败", description: String(e) }))
            .finally(() => setLoading(false))
    }, [id])

    const handleDelete = async () => {
        if (!id) return
        if (!window.confirm("确定要删除此试卷吗？")) return
        try {
            await api.deletePaper(id)
            toaster.success({ title: "已删除" })
            navigate("/papers")
        } catch (e) {
            toaster.error({ title: "删除失败", description: String(e) })
        }
    }

    if (loading) {
        return (
            <Center h="200px">
                <Spinner size="lg" />
            </Center>
        )
    }

    if (!paper) return <Text>试卷不存在</Text>

    return (
        <Stack gap="5">
            <Flex justify="space-between" align="center" wrap="wrap" gap="3">
                <HStack>
                    <Button asChild variant="ghost" size="sm">
                        <Link to="/papers"><LuArrowLeft /> 返回</Link>
                    </Button>
                    <Heading size="lg">{paper.title}</Heading>
                </HStack>
                {canEdit && (
                    <HStack>
                        <Button asChild size="sm" variant="outline">
                            <Link to={`/papers/${id}/edit`}><LuPencil /> 编辑</Link>
                        </Button>
                        <Button size="sm" colorPalette="red" variant="outline" onClick={handleDelete}>
                            <LuTrash2 /> 删除
                        </Button>
                    </HStack>
                )}
            </Flex>

            <Card.Root>
                <Card.Body>
                    <Stack gap="3">
                        <Box>
                            <Text fontSize="xs" color="fg.muted">副标题</Text>
                            <Text>{paper.subtitle}</Text>
                        </Box>
                        <Box>
                            <Text fontSize="xs" color="fg.muted">描述</Text>
                            <Text>{paper.description}</Text>
                        </Box>
                        <Separator />
                        <HStack fontSize="xs" color="fg.muted" gap="4">
                            <Text>创建: {new Date(paper.created_at).toLocaleString()}</Text>
                            <Text>更新: {new Date(paper.updated_at).toLocaleString()}</Text>
                        </HStack>
                    </Stack>
                </Card.Body>
            </Card.Root>

            <Box>
                <Heading size="md" mb="3">包含题目 ({paper.questions.length})</Heading>
                <Table.Root size="sm" striped>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>#</Table.ColumnHeader>
                            <Table.ColumnHeader>描述</Table.ColumnHeader>
                            <Table.ColumnHeader>分类</Table.ColumnHeader>
                            <Table.ColumnHeader>分数</Table.ColumnHeader>
                            <Table.ColumnHeader>状态</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {paper.questions.map((q, i) => (
                            <Table.Row key={q.question_id}>
                                <Table.Cell>{i + 1}</Table.Cell>
                                <Table.Cell>
                                    <Link to={`/questions/${q.question_id}`}>
                                        <Text _hover={{ textDecoration: "underline" }} color="blue.fg">
                                            {q.description}
                                        </Text>
                                    </Link>
                                </Table.Cell>
                                <Table.Cell>
                                    {q.category === "T" && <Badge colorPalette="blue">T</Badge>}
                                    {q.category === "E" && <Badge colorPalette="green">E</Badge>}
                                    {q.category === "none" && <Badge variant="outline">—</Badge>}
                                </Table.Cell>
                                <Table.Cell>{q.score ?? "—"}</Table.Cell>
                                <Table.Cell>
                                    {q.status === "reviewed" && <Badge colorPalette="purple">已审</Badge>}
                                    {q.status === "used" && <Badge colorPalette="orange">已用</Badge>}
                                    {q.status === "none" && <Badge variant="outline">无</Badge>}
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>
        </Stack>
    )
}
