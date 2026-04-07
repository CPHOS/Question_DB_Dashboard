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
} from "@chakra-ui/react"
import type { AdminPaperDetail } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"
import QuestionTable from "@/components/QuestionTable"

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
                                        <QuestionTable
                                            questions={data.questions}
                                            showIndex
                                            columns={["description", "category", "status", "score", "difficulty", "author", "reviewers"]}
                                        />
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
