import { useEffect, useState } from "react"
import {
    Box,
    Text,
    Badge,
    Stack,
    Separator,
    HStack,
    VStack,
    Flex,
    Drawer,
    Portal,
    CloseButton,
    Spinner,
    Center,
} from "@chakra-ui/react"
import { Link } from "react-router-dom"
import type { AdminQuestionDetail } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"

interface Props {
    questionId: string | null
    open: boolean
    onClose: () => void
}

export default function AdminQuestionDetailDrawer({ questionId, open, onClose }: Props) {
    const [data, setData] = useState<AdminQuestionDetail | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!open || !questionId) return
        setLoading(true)
        api.adminGetQuestion(questionId)
            .then(setData)
            .catch((e) => toaster.error({ title: "加载失败", description: String(e) }))
            .finally(() => setLoading(false))
    }, [questionId, open])

    return (
        <Drawer.Root open={open} onOpenChange={(e) => { if (!e.open) onClose() }} size="lg" placement="end">
            <Portal>
                <Drawer.Backdrop />
                <Drawer.Positioner>
                    <Drawer.Content>
                        <Drawer.Header>
                            <Drawer.Title>题目详情（管理员）</Drawer.Title>
                            <Drawer.CloseTrigger asChild>
                                <CloseButton size="sm" />
                            </Drawer.CloseTrigger>
                        </Drawer.Header>
                        <Drawer.Body>
                            {loading ? (
                                <Center h="200px"><Spinner size="lg" /></Center>
                            ) : data ? (
                                <Stack gap="4">
                                    <Box>
                                        <Text fontSize="xs" color="fg.muted">描述</Text>
                                        <Text fontWeight="bold" fontSize="lg">{data.description}</Text>
                                    </Box>

                                    {data.is_deleted && (
                                        <HStack>
                                            <Badge colorPalette="red" size="lg">已软删除</Badge>
                                            <Text fontSize="xs" color="fg.muted">
                                                删除时间: {data.deleted_at ? new Date(data.deleted_at).toLocaleString() : "—"}
                                            </Text>
                                        </HStack>
                                    )}

                                    <Separator />

                                    <HStack wrap="wrap" gap="3">
                                        <Box>
                                            <Text fontSize="xs" color="fg.muted">分类</Text>
                                            {data.category === "T" && <Badge colorPalette="blue">理论</Badge>}
                                            {data.category === "E" && <Badge colorPalette="green">实验</Badge>}
                                            {data.category === "none" && <Badge variant="outline">未分类</Badge>}
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" color="fg.muted">状态</Text>
                                            {data.status === "reviewed" && <Badge colorPalette="purple">已审</Badge>}
                                            {data.status === "used" && <Badge colorPalette="orange">已用</Badge>}
                                            {data.status === "none" && <Badge variant="outline">无</Badge>}
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" color="fg.muted">分数</Text>
                                            <Text fontWeight="medium">{data.score ?? "—"}</Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" color="fg.muted">命题人</Text>
                                            <Text fontWeight="medium">{data.author || "—"}</Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" color="fg.muted">审题人</Text>
                                            <Text fontWeight="medium">{data.reviewers.length > 0 ? data.reviewers.join(", ") : "—"}</Text>
                                        </Box>
                                    </HStack>

                                    <Separator />

                                    <Box>
                                        <Text fontSize="xs" color="fg.muted" mb="1">标签</Text>
                                        <HStack wrap="wrap" gap="1">
                                            {data.tags.length > 0
                                                ? data.tags.map((t) => <Badge key={t} variant="subtle">{t}</Badge>)
                                                : <Text color="fg.muted">无标签</Text>}
                                        </HStack>
                                    </Box>

                                    <Box>
                                        <Text fontSize="xs" color="fg.muted" mb="1">难度</Text>
                                        <HStack wrap="wrap" gap="3">
                                            {Object.entries(data.difficulty).map(([tag, val]) => (
                                                <Badge key={tag} colorPalette="cyan" variant="subtle">
                                                    {tag}: {val.score}/10
                                                    {val.notes ? ` (${val.notes})` : ""}
                                                </Badge>
                                            ))}
                                        </HStack>
                                    </Box>

                                    <Separator />

                                    <Box>
                                        <Text fontSize="xs" color="fg.muted" mb="1">所属试卷</Text>
                                        {data.papers.length > 0 ? (
                                            <VStack align="start" gap="1">
                                                {data.papers.map((p) => (
                                                    <Link key={p.paper_id} to={`/papers/${p.paper_id}`}>
                                                        <Text _hover={{ textDecoration: "underline" }} color="blue.fg" fontSize="sm">
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

                                    <Flex wrap="wrap" gap="4" fontSize="xs" color="fg.muted">
                                        <Text>创建: {new Date(data.created_at).toLocaleString()}</Text>
                                        <Text>更新: {new Date(data.updated_at).toLocaleString()}</Text>
                                    </Flex>
                                </Stack>
                            ) : null}
                        </Drawer.Body>
                    </Drawer.Content>
                </Drawer.Positioner>
            </Portal>
        </Drawer.Root>
    )
}
