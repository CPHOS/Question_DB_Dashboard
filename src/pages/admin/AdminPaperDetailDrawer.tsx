import { useEffect, useState } from "react"
import {
    Box,
    Text,
    Badge,
    Stack,
    Separator,
    HStack,
    Flex,
    Drawer,
    Portal,
    CloseButton,
    Spinner,
    Center,
    Table,
} from "@chakra-ui/react"
import { Link } from "react-router-dom"
import type { AdminPaperDetail } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"

interface Props {
    paperId: string | null
    open: boolean
    onClose: () => void
}

export default function AdminPaperDetailDrawer({ paperId, open, onClose }: Props) {
    const [data, setData] = useState<AdminPaperDetail | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!open || !paperId) return
        setLoading(true)
        api.adminGetPaper(paperId)
            .then(setData)
            .catch((e) => toaster.error({ title: "加载失败", description: String(e) }))
            .finally(() => setLoading(false))
    }, [paperId, open])

    return (
        <Drawer.Root open={open} onOpenChange={(e) => { if (!e.open) onClose() }} size="lg" placement="end">
            <Portal>
                <Drawer.Backdrop />
                <Drawer.Positioner>
                    <Drawer.Content>
                        <Drawer.Header>
                            <Drawer.Title>试卷详情（管理员）</Drawer.Title>
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
                                        <Text fontSize="xs" color="fg.muted">标题</Text>
                                        <Text fontWeight="bold" fontSize="lg">{data.title}</Text>
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

                                    <Box>
                                        <Text fontSize="xs" color="fg.muted">副标题</Text>
                                        <Text>{data.subtitle}</Text>
                                    </Box>
                                    <Box>
                                        <Text fontSize="xs" color="fg.muted">描述</Text>
                                        <Text>{data.description}</Text>
                                    </Box>

                                    <Separator />

                                    <Box>
                                        <Text fontSize="xs" color="fg.muted" mb="2">
                                            包含题目 ({data.questions.length})
                                        </Text>
                                        <Box overflowX="auto">
                                            <Table.Root size="sm" striped>
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>#</Table.ColumnHeader>
                                                        <Table.ColumnHeader>描述</Table.ColumnHeader>
                                                        <Table.ColumnHeader>分类</Table.ColumnHeader>
                                                        <Table.ColumnHeader>状态</Table.ColumnHeader>
                                                        <Table.ColumnHeader>分数</Table.ColumnHeader>
                                                        <Table.ColumnHeader>难度</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {data.questions.map((q, i) => (
                                                        <Table.Row key={q.question_id}>
                                                            <Table.Cell>{i + 1}</Table.Cell>
                                                            <Table.Cell>
                                                                <Link to={`/questions/${q.question_id}`}>
                                                                    <Text _hover={{ textDecoration: "underline" }} color="blue.fg" fontSize="sm">
                                                                        {q.description}
                                                                    </Text>
                                                                </Link>
                                                            </Table.Cell>
                                                            <Table.Cell>
                                                                {q.category === "T" && <Badge colorPalette="blue">T</Badge>}
                                                                {q.category === "E" && <Badge colorPalette="green">E</Badge>}
                                                                {q.category === "none" && <Badge variant="outline">—</Badge>}
                                                            </Table.Cell>
                                                            <Table.Cell>
                                                                {q.status === "reviewed" && <Badge colorPalette="purple">已审</Badge>}
                                                                {q.status === "used" && <Badge colorPalette="orange">已用</Badge>}
                                                                {q.status === "none" && <Badge variant="outline">无</Badge>}
                                                            </Table.Cell>
                                                            <Table.Cell>{q.score ?? "—"}</Table.Cell>
                                                            <Table.Cell>
                                                                {q.difficulty?.human ? `${q.difficulty.human.score}/10` : "—"}
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    ))}
                                                </Table.Body>
                                            </Table.Root>
                                        </Box>
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
