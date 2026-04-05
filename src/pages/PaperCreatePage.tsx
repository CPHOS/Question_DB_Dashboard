import { useState, useEffect, useCallback, type FormEvent } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
    Box,
    Button,
    Heading,
    Input,
    Stack,
    Field,
    HStack,
    Table,
    Text,
    Badge,
    IconButton,
} from "@chakra-ui/react"
import type { QuestionSummary, Paginated } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster"
import { LuArrowLeft, LuSearch, LuChevronLeft, LuChevronRight } from "react-icons/lu"

export default function PaperCreatePage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState("")
    const [subtitle, setSubtitle] = useState("")
    const [description, setDescription] = useState("")
    const [file, setFile] = useState<File | null>(null)

    // Question picker
    const [questions, setQuestions] = useState<Paginated<QuestionSummary> | null>(null)
    const [qSearch, setQSearch] = useState("")
    const [qOffset, setQOffset] = useState(0)
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const LIMIT = 10

    const loadQuestions = useCallback(async () => {
        try {
            const res = await api.getQuestions({
                q: qSearch || undefined,
                limit: LIMIT,
                offset: qOffset,
            })
            setQuestions(res)
        } catch {
            /* ignore */
        }
    }, [qSearch, qOffset])

    useEffect(() => { loadQuestions() }, [loadQuestions])

    const toggleQuestion = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        )
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!file) { toaster.error({ title: "请选择文件" }); return }
        if (!title.trim()) { toaster.error({ title: "请填写标题" }); return }
        if (!subtitle.trim()) { toaster.error({ title: "请填写副标题" }); return }
        if (!description.trim()) { toaster.error({ title: "请填写描述" }); return }
        if (selectedIds.length === 0) { toaster.error({ title: "请选择至少一道题目" }); return }

        setLoading(true)
        try {
            const fd = new FormData()
            fd.append("file", file)
            fd.append("title", title.trim())
            fd.append("subtitle", subtitle.trim())
            fd.append("description", description.trim())
            fd.append("question_ids", JSON.stringify(selectedIds))
            const res = await api.createPaper(fd)
            toaster.success({ title: "创建成功" })
            navigate(`/papers/${res.paper_id}`)
        } catch (err) {
            toaster.error({ title: "创建失败", description: String(err) })
        } finally {
            setLoading(false)
        }
    }

    const qPage = Math.floor(qOffset / LIMIT)
    const qTotalPages = questions ? Math.ceil(questions.total / LIMIT) : 0

    return (
        <Stack gap="5" maxW="800px">
            <HStack>
                <Button asChild variant="ghost" size="sm">
                    <Link to="/papers"><LuArrowLeft /> 返回</Link>
                </Button>
                <Heading size="lg">新建试卷</Heading>
            </HStack>

            <Box as="form" onSubmit={handleSubmit}>
                <Stack gap="4">
                    <Field.Root required>
                        <Field.Label>附件 ZIP 文件</Field.Label>
                        <Input type="file" accept=".zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    </Field.Root>

                    <Field.Root required>
                        <Field.Label>标题</Field.Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="试卷标题" />
                    </Field.Root>

                    <Field.Root required>
                        <Field.Label>副标题</Field.Label>
                        <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="试卷副标题" />
                    </Field.Root>

                    <Field.Root required>
                        <Field.Label>描述</Field.Label>
                        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="试卷描述" />
                    </Field.Root>

                    <Box>
                        <Text fontWeight="medium" mb="2">选择题目 ({selectedIds.length} 已选)</Text>
                        <HStack mb="2" gap="2">
                            <Input
                                placeholder="搜索题目..."
                                value={qSearch}
                                onChange={(e) => setQSearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQOffset(0); loadQuestions() } }}
                                size="sm"
                                maxW="250px"
                            />
                            <IconButton aria-label="search" size="sm" onClick={() => { setQOffset(0); loadQuestions() }}>
                                <LuSearch />
                            </IconButton>
                        </HStack>

                        <Table.Root size="sm">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader w="40px" />
                                    <Table.ColumnHeader>描述</Table.ColumnHeader>
                                    <Table.ColumnHeader>分类</Table.ColumnHeader>
                                    <Table.ColumnHeader>状态</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {questions?.items.map((q) => (
                                    <Table.Row key={q.question_id}>
                                        <Table.Cell>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(q.question_id)}
                                                onChange={() => toggleQuestion(q.question_id)}
                                            />
                                        </Table.Cell>
                                        <Table.Cell>{q.description}</Table.Cell>
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
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>

                        <HStack justify="end" mt="2">
                            <IconButton
                                aria-label="prev"
                                size="xs"
                                variant="outline"
                                disabled={qPage === 0}
                                onClick={() => setQOffset(qOffset - LIMIT)}
                            >
                                <LuChevronLeft />
                            </IconButton>
                            <Text fontSize="xs">{qPage + 1} / {qTotalPages || 1}</Text>
                            <IconButton
                                aria-label="next"
                                size="xs"
                                variant="outline"
                                disabled={qPage + 1 >= qTotalPages}
                                onClick={() => setQOffset(qOffset + LIMIT)}
                            >
                                <LuChevronRight />
                            </IconButton>
                        </HStack>
                    </Box>

                    <Button type="submit" colorPalette="blue" loading={loading}>
                        创建试卷
                    </Button>
                </Stack>
            </Box>
        </Stack>
    )
}
