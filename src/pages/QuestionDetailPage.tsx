import { useEffect, useState, useCallback } from "react"
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
    VStack,
    Flex,
    Card,
    Spinner,
    Center,
} from "@chakra-ui/react"
import type { QuestionDetail } from "@/types"
import * as api from "@/lib/api"
import { useAuth } from "@/contexts/useAuth"
import { toaster } from "@/components/ui/toaster-instance"
import { LuArrowLeft, LuPencil, LuTrash2 } from "react-icons/lu"
import QuestionEditDrawer from "./QuestionEditPage"
import ConfirmDialog from "@/components/ConfirmDialog"

export default function QuestionDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const canEdit = user?.role === "editor" || user?.role === "admin"

    const [question, setQuestion] = useState<QuestionDetail | null>(null)
    const [failedId, setFailedId] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [reloading, setReloading] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    const currentQuestion = question?.question_id === id ? question : null
    const isLoading = Boolean(id) && failedId !== id && (reloading || !currentQuestion)

    const loadQuestion = useCallback(() => {
        setFailedId(null)
        setReloading(true)
        setReloadKey((value) => value + 1)
    }, [])

    useEffect(() => {
        if (!id) return

        let cancelled = false

        void api
            .getQuestion(id)
            .then((data) => {
                if (cancelled) return
                setQuestion(data)
                setFailedId(null)
            })
            .catch((e) => {
                if (cancelled) return
                setFailedId(id)
                toaster.error({ title: "加载失败", description: String(e) })
            })
            .finally(() => {
                if (cancelled) return
                setReloading(false)
            })

        return () => {
            cancelled = true
        }
    }, [id, reloadKey])

    const handleDelete = async () => {
        if (!id) return
        setConfirmOpen(false)
        try {
            await api.deleteQuestion(id)
            toaster.success({ title: "已删除" })
            navigate("/questions")
        } catch (e) {
            toaster.error({ title: "删除失败", description: String(e) })
        }
    }

    if (!id) {
        return <Text>题目不存在</Text>
    }

    if (isLoading) {
        return (
            <Center h="200px">
                <Spinner size="lg" />
            </Center>
        )
    }

    if (!currentQuestion) {
        return <Text>题目不存在</Text>
    }

    const q = currentQuestion

    return (
        <Stack gap="5">
            <Flex justify="space-between" align="center" wrap="wrap" gap="3">
                <HStack>
                    <Button asChild variant="ghost" size="sm">
                        <Link to="/questions"><LuArrowLeft /> 返回</Link>
                    </Button>
                    <Heading size="lg">{q.description}</Heading>
                </HStack>
                {canEdit && (
                    <HStack>
                        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                            <LuPencil /> 编辑
                        </Button>
                        <Button size="sm" colorPalette="red" variant="outline" onClick={() => setConfirmOpen(true)}>
                            <LuTrash2 /> 删除
                        </Button>
                    </HStack>
                )}
            </Flex>

            <Card.Root>
                <Card.Body>
                    <Stack gap="4">
                        <HStack wrap="wrap" gap="3">
                            <Box>
                                <Text fontSize="xs" color="fg.muted">分类</Text>
                                {q.category === "T" && <Badge colorPalette="blue">理论</Badge>}
                                {q.category === "E" && <Badge colorPalette="green">实验</Badge>}
                                {q.category === "none" && <Badge variant="outline">未分类</Badge>}
                            </Box>
                            <Box>
                                <Text fontSize="xs" color="fg.muted">状态</Text>
                                {q.status === "reviewed" && <Badge colorPalette="purple">已审</Badge>}
                                {q.status === "used" && <Badge colorPalette="orange">已用</Badge>}
                                {q.status === "none" && <Badge variant="outline">无</Badge>}
                            </Box>
                            <Box>
                                <Text fontSize="xs" color="fg.muted">分数</Text>
                                <Text fontWeight="medium">{q.score ?? "—"}</Text>
                            </Box>
                            <Box>
                                <Text fontSize="xs" color="fg.muted">命题人</Text>
                                <Text fontWeight="medium">{q.author || "—"}</Text>
                            </Box>
                            <Box>
                                <Text fontSize="xs" color="fg.muted">审题人</Text>
                                <Text fontWeight="medium">{q.reviewers.length > 0 ? q.reviewers.join(", ") : "—"}</Text>
                            </Box>
                        </HStack>

                        <Separator />

                        <Box>
                            <Text fontSize="xs" color="fg.muted" mb="1">标签</Text>
                            <HStack wrap="wrap" gap="1">
                                {q.tags.length > 0
                                    ? q.tags.map((t) => (
                                        <Badge key={t} variant="subtle">{t}</Badge>
                                    ))
                                    : <Text color="fg.muted">无标签</Text>}
                            </HStack>
                        </Box>

                        <Box>
                            <Text fontSize="xs" color="fg.muted" mb="1">难度</Text>
                            <HStack wrap="wrap" gap="3">
                                {Object.entries(q.difficulty).map(([tag, val]) => (
                                    <Badge key={tag} colorPalette="cyan" variant="subtle">
                                        {tag}: {val.score}/10
                                        {val.notes ? ` (${val.notes})` : ""}
                                    </Badge>
                                ))}
                            </HStack>
                        </Box>

                        <Box>
                            <Text fontSize="xs" color="fg.muted" mb="1">TeX 源文件</Text>
                            <Text fontFamily="mono" fontSize="sm">{q.source_tex_path}</Text>
                        </Box>

                        <Separator />

                        <Box>
                            <Text fontSize="xs" color="fg.muted" mb="1">所属试卷</Text>
                            {q.papers.length > 0 ? (
                                <VStack align="start" gap="1">
                                    {q.papers.map((p) => (
                                        <Link key={p.paper_id} to={`/papers/${p.paper_id}`}>
                                            <Text _hover={{ textDecoration: "underline" }} color="blue.fg">
                                                {p.title} — {p.description}
                                            </Text>
                                        </Link>
                                    ))}
                                </VStack>
                            ) : (
                                <Text color="fg.muted">未被组卷</Text>
                            )}
                        </Box>

                        <Separator />

                        <HStack fontSize="xs" color="fg.muted" gap="4">
                            <Text>创建: {new Date(q.created_at).toLocaleString()}</Text>
                            <Text>更新: {new Date(q.updated_at).toLocaleString()}</Text>
                        </HStack>
                    </Stack>
                </Card.Body>
            </Card.Root>

            {id && (
                <QuestionEditDrawer
                    questionId={id}
                    open={editOpen}
                    onClose={() => setEditOpen(false)}
                    onSaved={loadQuestion}
                />
            )}

            <ConfirmDialog
                open={confirmOpen}
                title="删除确认"
                description="确定要删除此题目吗？"
                onConfirm={handleDelete}
                onCancel={() => setConfirmOpen(false)}
            />
        </Stack>
    )
}
