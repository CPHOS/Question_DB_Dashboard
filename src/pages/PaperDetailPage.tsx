import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
    Box,
    Button,
    Heading,
    HStack,
    Text,
    Stack,
    Separator,
    Flex,
    Card,
    Spinner,
    Center,
} from "@chakra-ui/react"
import type { PaperDetail } from "@/types"
import * as api from "@/lib/api"
import { useAuth } from "@/contexts/useAuth"
import QuestionTable from "@/components/QuestionTable"
import { toaster } from "@/components/ui/toaster-instance"
import { LuArrowLeft, LuPencil, LuTrash2 } from "react-icons/lu"
import PaperEditDrawer from "./PaperEditPage"
import ConfirmDialog from "@/components/ConfirmDialog"

export default function PaperDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const canEdit = user?.role === "editor" || user?.role === "admin"

    const [paper, setPaper] = useState<PaperDetail | null>(null)
    const [failedId, setFailedId] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [reloading, setReloading] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    const currentPaper = paper?.paper_id === id ? paper : null
    const isLoading = Boolean(id) && failedId !== id && (reloading || !currentPaper)

    const loadPaper = useCallback(() => {
        setFailedId(null)
        setReloading(true)
        setReloadKey((value) => value + 1)
    }, [])

    useEffect(() => {
        if (!id) return

        let cancelled = false

        void api
            .getPaper(id)
            .then((data) => {
                if (cancelled) return
                setPaper(data)
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
            await api.deletePaper(id)
            toaster.success({ title: "已删除" })
            navigate("/papers")
        } catch (e) {
            toaster.error({ title: "删除失败", description: String(e) })
        }
    }

    if (!id) {
        return <Text>试卷不存在</Text>
    }

    if (isLoading) {
        return (
            <Center h="200px">
                <Spinner size="lg" />
            </Center>
        )
    }

    if (!currentPaper) return <Text>试卷不存在</Text>

    return (
        <Stack gap="5">
            <Flex justify="space-between" align="center" wrap="wrap" gap="3">
                <HStack>
                    <Button asChild variant="ghost" size="sm">
                        <Link to="/papers"><LuArrowLeft /> 返回</Link>
                    </Button>
                    <Heading size="lg">{currentPaper.title}</Heading>
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
                    <Stack gap="3">
                        <Box>
                            <Text fontSize="xs" color="fg.muted">副标题</Text>
                            <Text>{currentPaper.subtitle}</Text>
                        </Box>
                        <Box>
                            <Text fontSize="xs" color="fg.muted">描述</Text>
                            <Text>{currentPaper.description}</Text>
                        </Box>
                        <Separator />
                        <HStack fontSize="xs" color="fg.muted" gap="4">
                            <Text>创建: {new Date(currentPaper.created_at).toLocaleString()}</Text>
                            <Text>更新: {new Date(currentPaper.updated_at).toLocaleString()}</Text>
                        </HStack>
                    </Stack>
                </Card.Body>
            </Card.Root>

            <Box>
                <Heading size="md" mb="3">包含题目 ({currentPaper.questions.length})</Heading>
                <QuestionTable
                    questions={currentPaper.questions}
                    showIndex
                    columns={["description", "category", "status", "score", "difficulty", "tags", "author", "reviewers"]}
                />
            </Box>

            {id && (
                <PaperEditDrawer
                    paperId={id}
                    open={editOpen}
                    onClose={() => setEditOpen(false)}
                    onSaved={loadPaper}
                />
            )}

            <ConfirmDialog
                open={confirmOpen}
                title="删除确认"
                description="确定要删除此试卷吗？"
                onConfirm={handleDelete}
                onCancel={() => setConfirmOpen(false)}
            />
        </Stack>
    )
}
