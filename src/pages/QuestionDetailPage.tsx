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
    Popover,
    Portal,
    IconButton,
    Switch,
} from "@chakra-ui/react"
import type { QuestionDetail, ReviewerInfo, User } from "@/types"
import * as api from "@/lib/api"
import { useAuth } from "@/contexts/useAuth"
import { toaster } from "@/components/ui/toaster-instance"
import { LuArrowLeft, LuPencil, LuTrash2, LuX } from "react-icons/lu"
import QuestionEditDrawer from "./QuestionEditPage"
import ConfirmDialog from "@/components/ConfirmDialog"
import UserSearchPicker from "@/components/UserSearchPicker"

export default function QuestionDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [question, setQuestion] = useState<QuestionDetail | null>(null)
    const [failedId, setFailedId] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [reloading, setReloading] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    const canManageReviewers = user?.role === "leader" || user?.role === "admin"
    const [reviewers, setReviewers] = useState<ReviewerInfo[]>([])
    const [reviewersLoaded, setReviewersLoaded] = useState(false)
    const [addingReviewer, setAddingReviewer] = useState(false)

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

    useEffect(() => {
        if (!id) return
        setReviewersLoaded(false)
        api.getQuestionReviewers(id)
            .then((res) => { setReviewers(res.reviewers); setReviewersLoaded(true) })
            .catch(() => setReviewersLoaded(true))
    }, [id, reloadKey])

    const handleAddReviewer = async (selectedUser: User) => {
        if (!id) return
        setAddingReviewer(true)
        try {
            const res = await api.addQuestionReviewer(id, selectedUser.user_id)
            setReviewers(res.reviewers)
            toaster.success({ title: `已添加审阅人 ${selectedUser.display_name || selectedUser.username}` })
        } catch (e) {
            toaster.error({ title: "添加失败", description: String(e) })
        } finally {
            setAddingReviewer(false)
        }
    }

    const handleRemoveReviewer = async (reviewerId: string) => {
        if (!id) return
        try {
            const res = await api.removeQuestionReviewer(id, reviewerId)
            setReviewers(res.reviewers)
            toaster.success({ title: "已移除审阅人" })
        } catch (e) {
            toaster.error({ title: "移除失败", description: String(e) })
        }
    }

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

    const isOwner = !!(user && q.created_by && q.created_by === user.user_id)
    const isReviewer = !!(user && reviewersLoaded && reviewers.some((r) => r.reviewer_id === user.user_id))
    const canEdit = user?.role === "admin" || user?.role === "leader" || (user?.role === "user" && isOwner)
    const canReviewEdit = !canEdit && user?.role === "user" && isReviewer
    const canDelete = user?.role === "admin" || user?.role === "leader"

    return (
        <Stack gap="5">
            <Flex justify="space-between" align="center" wrap="wrap" gap="3">
                <HStack>
                    <Button asChild variant="ghost" size="sm">
                        <Link to="/questions"><LuArrowLeft /> 返回</Link>
                    </Button>
                    <Heading size="lg">{q.description}</Heading>
                </HStack>
                {(canEdit || canReviewEdit || canDelete) && (
                    <HStack>
                        {canEdit && (
                            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                                <LuPencil /> 编辑
                            </Button>
                        )}
                        {canReviewEdit && (
                            <Button size="sm" variant="outline" colorPalette="purple" onClick={() => setEditOpen(true)}>
                                <LuPencil /> 审阅编辑
                            </Button>
                        )}
                        {canDelete && (
                            <Button size="sm" colorPalette="red" variant="outline" onClick={() => setConfirmOpen(true)}>
                                <LuTrash2 /> 删除
                            </Button>
                        )}
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
                                {Object.entries(q.difficulty).map(([tag, val]) => {
                                    const editor = val.updated_by
                                    const editorLabel = editor
                                        ? ` · ${editor.display_name || editor.username} (@${editor.username})`
                                        : ""
                                    const label = tag === "human" ? "人工难度" : tag
                                    return val.notes ? (
                                        <Popover.Root key={tag} positioning={{ placement: "bottom" }}>
                                            <Popover.Trigger asChild>
                                                <Badge
                                                    colorPalette={editor ? "purple" : "cyan"}
                                                    variant="subtle"
                                                    cursor="pointer"
                                                    _hover={{ opacity: 0.8 }}
                                                >
                                                    {label}: {val.score}/10{editorLabel} 💬
                                                </Badge>
                                            </Popover.Trigger>
                                            <Portal>
                                                <Popover.Positioner>
                                                    <Popover.Content maxW="240px">
                                                        <Popover.Arrow>
                                                            <Popover.ArrowTip />
                                                        </Popover.Arrow>
                                                        <Popover.Body fontSize="sm">
                                                            {val.notes}
                                                        </Popover.Body>
                                                    </Popover.Content>
                                                </Popover.Positioner>
                                            </Portal>
                                        </Popover.Root>
                                    ) : (
                                        <Badge key={tag} colorPalette={editor ? "purple" : "cyan"} variant="subtle">
                                            {label}: {val.score}/10{editorLabel}
                                        </Badge>
                                    )
                                })}
                            </HStack>
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

            {canManageReviewers && (
                <Card.Root>
                    <Card.Header>
                        <Heading size="md">审阅人管理</Heading>
                    </Card.Header>
                    <Card.Body>
                        <Stack gap="3">
                            {reviewers.length > 0 ? (
                                <VStack align="stretch" gap="1">
                                    {reviewers.map((r) => (
                                        <HStack key={r.reviewer_id} justify="space-between">
                                            <Text fontSize="sm">
                                                {r.display_name || r.username}
                                                <Text as="span" color="fg.muted" ml="1">(@{r.username})</Text>
                                            </Text>
                                            <IconButton
                                                aria-label="remove"
                                                size="xs"
                                                variant="ghost"
                                                colorPalette="red"
                                                onClick={() => handleRemoveReviewer(r.reviewer_id)}
                                            >
                                                <LuX />
                                            </IconButton>
                                        </HStack>
                                    ))}
                                </VStack>
                            ) : (
                                <Text fontSize="sm" color="fg.muted">暂无审阅人</Text>
                            )}
                            <Separator />
                            <Switch.Root
                                checked={q.allow_auto_reviewer}
                                onCheckedChange={async (e) => {
                                    try {
                                        await api.patchQuestion(id!, { allow_auto_reviewer: e.checked })
                                        loadQuestion()
                                        toaster.success({ title: e.checked ? "已启用自动填充审题人" : "已关闭自动填充审题人" })
                                    } catch (err) {
                                        toaster.error({ title: "设置失败", description: String(err) })
                                    }
                                }}
                            >
                                <Switch.HiddenInput />
                                <Switch.Control>
                                    <Switch.Thumb />
                                </Switch.Control>
                                <Switch.Label fontSize="sm">允许审阅人自动填充审题人姓名</Switch.Label>
                            </Switch.Root>
                            <Separator />
                            <UserSearchPicker
                                placeholder="搜索用户名或显示名添加审阅人…"
                                excludeIds={reviewers.map((r) => r.reviewer_id)}
                                onSelect={handleAddReviewer}
                                disabled={addingReviewer}
                            />
                        </Stack>
                    </Card.Body>
                </Card.Root>
            )}

            {id && (
                <QuestionEditDrawer
                    questionId={id}
                    open={editOpen}
                    onClose={() => setEditOpen(false)}
                    onSaved={loadQuestion}
                    reviewerOnly={canReviewEdit}
                    userOnly={canEdit && user?.role === "user"}
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
