import { useState, useEffect, useCallback, useRef, useMemo, type FormEvent } from "react"
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
    Checkbox,
    Separator,
    Flex,
    Card,
    Select,
    Portal,
    createListCollection,
} from "@chakra-ui/react"
import type { QuestionSummary, Paginated } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"
import { LuArrowLeft, LuSearch, LuChevronLeft, LuChevronRight, LuGripVertical, LuX, LuArrowUp, LuArrowDown } from "react-icons/lu"
import FileDropzone from "@/components/FileDropzone"

const categoryOptions = createListCollection({
    items: [
        { label: "全部分类", value: "" },
        { label: "理论 (T)", value: "T" },
        { label: "实验 (E)", value: "E" },
        { label: "未分类", value: "none" },
    ],
})

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
    const [qCategory, setQCategory] = useState<string>("")
    const [qTag, setQTag] = useState<string>("")
    const [qScoreMin, setQScoreMin] = useState("")
    const [qScoreMax, setQScoreMax] = useState("")
    const [qDiffTag, setQDiffTag] = useState("")
    const [qDiffMin, setQDiffMin] = useState("")
    const [qDiffMax, setQDiffMax] = useState("")
    // Ordered list of selected questions (full objects to display info)
    const [selectedQuestions, setSelectedQuestions] = useState<QuestionSummary[]>([])

    // Collect tags
    const [allTags, setAllTags] = useState<string[]>([])
    const tagOptions = useMemo(() => createListCollection({
        items: [
            { label: "全部标签", value: "" },
            ...allTags.map((t) => ({ label: t, value: t })),
        ],
    }), [allTags])

    // Drag state
    const dragItem = useRef<number | null>(null)
    const dragOverItem = useRef<number | null>(null)

    const LIMIT = 10

    const loadQuestions = useCallback(async () => {
        try {
            const res = await api.getQuestions({
                q: qSearch || undefined,
                category: qCategory || undefined,
                tag: qTag || undefined,
                score_min: qScoreMin ? Number(qScoreMin) : undefined,
                score_max: qScoreMax ? Number(qScoreMax) : undefined,
                difficulty_tag: qDiffTag || undefined,
                difficulty_min: qDiffMin ? Number(qDiffMin) : undefined,
                difficulty_max: qDiffMax ? Number(qDiffMax) : undefined,
                limit: LIMIT,
                offset: qOffset,
            })
            setQuestions(res)
            // collect tags
            const tags = new Set<string>()
            res.items.forEach((q) => q.tags.forEach((t) => tags.add(t)))
            setAllTags((prev) => {
                const merged = new Set([...prev, ...tags])
                return [...merged].sort()
            })
        } catch {
            /* ignore */
        }
    }, [qSearch, qOffset, qCategory, qTag, qScoreMin, qScoreMax, qDiffTag, qDiffMin, qDiffMax])

    useEffect(() => { loadQuestions() }, [loadQuestions])

    const selectedIds = selectedQuestions.map((q) => q.question_id)

    const toggleQuestion = (q: QuestionSummary) => {
        setSelectedQuestions((prev) => {
            if (prev.some((s) => s.question_id === q.question_id)) {
                return prev.filter((s) => s.question_id !== q.question_id)
            }
            return [...prev, q]
        })
    }

    const removeSelected = (id: string) => {
        setSelectedQuestions((prev) => prev.filter((q) => q.question_id !== id))
    }

    const moveItem = (from: number, to: number) => {
        setSelectedQuestions((prev) => {
            const next = [...prev]
            const [item] = next.splice(from, 1)
            next.splice(to, 0, item)
            return next
        })
    }

    const handleDragStart = (idx: number) => {
        dragItem.current = idx
    }

    const handleDragEnter = (idx: number) => {
        dragOverItem.current = idx
    }

    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            moveItem(dragItem.current, dragOverItem.current)
        }
        dragItem.current = null
        dragOverItem.current = null
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!title.trim()) { toaster.error({ title: "请填写标题" }); return }
        if (!subtitle.trim()) { toaster.error({ title: "请填写副标题" }); return }
        if (!description.trim()) { toaster.error({ title: "请填写描述" }); return }
        if (selectedQuestions.length === 0) { toaster.error({ title: "请选择至少一道题目" }); return }

        setLoading(true)
        try {
            const fd = new FormData()
            if (file) fd.append("file", file)
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
        <Stack gap="5" maxW="900px">
            <HStack>
                <Button asChild variant="ghost" size="sm">
                    <Link to="/papers"><LuArrowLeft /> 返回</Link>
                </Button>
                <Heading size="lg">新建试卷</Heading>
            </HStack>

            <Box as="form" onSubmit={handleSubmit}>
                <Stack gap="4">
                    <Field.Root>
                        <Field.Label>附件 ZIP 文件（可选）</Field.Label>
                        <FileDropzone onFileChange={setFile} label="拖放附件到此处（可选）" />
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

                    <Separator />

                    {/* Selected questions - sortable list */}
                    <Box>
                        <Heading size="sm" mb="2">已选题目顺序 ({selectedQuestions.length})</Heading>
                        {selectedQuestions.length === 0 ? (
                            <Card.Root variant="outline">
                                <Card.Body py="6">
                                    <Text textAlign="center" color="fg.muted" fontSize="sm">
                                        从下方题库中选择题目，选中后可在此处拖拽排序
                                    </Text>
                                </Card.Body>
                            </Card.Root>
                        ) : (
                            <Stack gap="1">
                                {selectedQuestions.map((q, idx) => (
                                    <Card.Root
                                        key={q.question_id}
                                        size="sm"
                                        variant="outline"
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragEnter={() => handleDragEnter(idx)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e: React.DragEvent) => e.preventDefault()}
                                        cursor="grab"
                                        _hover={{ borderColor: "blue.300", bg: "bg.subtle" }}
                                    >
                                        <Card.Body py="2" px="3">
                                            <Flex align="center" gap="2">
                                                <Box color="fg.muted" cursor="grab">
                                                    <LuGripVertical />
                                                </Box>
                                                <Badge size="sm" variant="solid" colorPalette="blue" minW="24px" textAlign="center">
                                                    {idx + 1}
                                                </Badge>
                                                <Text fontSize="sm" flex="1" truncate>
                                                    {q.description}
                                                </Text>
                                                {q.category !== "none" && (
                                                    <Badge size="sm" colorPalette={q.category === "T" ? "blue" : "green"}>{q.category}</Badge>
                                                )}
                                                {q.score != null && (
                                                    <Badge size="sm" variant="outline">{q.score}分</Badge>
                                                )}
                                                <HStack gap="0">
                                                    <IconButton
                                                        aria-label="move up"
                                                        size="2xs"
                                                        variant="ghost"
                                                        disabled={idx === 0}
                                                        onClick={() => moveItem(idx, idx - 1)}
                                                    >
                                                        <LuArrowUp />
                                                    </IconButton>
                                                    <IconButton
                                                        aria-label="move down"
                                                        size="2xs"
                                                        variant="ghost"
                                                        disabled={idx === selectedQuestions.length - 1}
                                                        onClick={() => moveItem(idx, idx + 1)}
                                                    >
                                                        <LuArrowDown />
                                                    </IconButton>
                                                    <IconButton
                                                        aria-label="remove"
                                                        size="2xs"
                                                        variant="ghost"
                                                        colorPalette="red"
                                                        onClick={() => removeSelected(q.question_id)}
                                                    >
                                                        <LuX />
                                                    </IconButton>
                                                </HStack>
                                            </Flex>
                                        </Card.Body>
                                    </Card.Root>
                                ))}
                            </Stack>
                        )}
                    </Box>

                    <Separator />

                    {/* Question picker */}
                    <Box>
                        <Heading size="sm" mb="2">题库</Heading>
                        <HStack mb="2" gap="2" wrap="wrap">
                            <Input
                                placeholder="搜索题目..."
                                value={qSearch}
                                onChange={(e) => setQSearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQOffset(0) } }}
                                size="sm"
                                maxW="200px"
                            />
                            <IconButton aria-label="search" size="sm" onClick={() => setQOffset(0)}>
                                <LuSearch />
                            </IconButton>

                            <Select.Root
                                collection={categoryOptions}
                                size="sm"
                                width="130px"
                                value={qCategory ? [qCategory] : [""]}
                                onValueChange={(e) => { setQCategory(e.value[0] || ""); setQOffset(0) }}
                            >
                                <Select.HiddenSelect />
                                <Select.Control>
                                    <Select.Trigger><Select.ValueText placeholder="全部分类" /></Select.Trigger>
                                    <Select.IndicatorGroup><Select.Indicator /></Select.IndicatorGroup>
                                </Select.Control>
                                <Portal><Select.Positioner><Select.Content>
                                    {categoryOptions.items.map((item) => (
                                        <Select.Item item={item} key={item.value}>{item.label}<Select.ItemIndicator /></Select.Item>
                                    ))}
                                </Select.Content></Select.Positioner></Portal>
                            </Select.Root>

                            <Select.Root
                                collection={tagOptions}
                                size="sm"
                                width="130px"
                                value={qTag ? [qTag] : [""]}
                                onValueChange={(e) => { setQTag(e.value[0] || ""); setQOffset(0) }}
                            >
                                <Select.HiddenSelect />
                                <Select.Control>
                                    <Select.Trigger><Select.ValueText placeholder="全部标签" /></Select.Trigger>
                                    <Select.IndicatorGroup><Select.Indicator /></Select.IndicatorGroup>
                                </Select.Control>
                                <Portal><Select.Positioner><Select.Content>
                                    {tagOptions.items.map((item) => (
                                        <Select.Item item={item} key={item.value}>{item.label}<Select.ItemIndicator /></Select.Item>
                                    ))}
                                </Select.Content></Select.Positioner></Portal>
                            </Select.Root>
                        </HStack>
                        <HStack mb="2" gap="2" wrap="wrap">
                            <Input placeholder="最低分数" value={qScoreMin} onChange={(e) => setQScoreMin(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQOffset(0) } }}
                                maxW="90px" size="sm" type="number" />
                            <Input placeholder="最高分数" value={qScoreMax} onChange={(e) => setQScoreMax(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQOffset(0) } }}
                                maxW="90px" size="sm" type="number" />
                            <Input placeholder="难度标签" value={qDiffTag} onChange={(e) => setQDiffTag(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQOffset(0) } }}
                                maxW="100px" size="sm" />
                            <Input placeholder="最低难度" value={qDiffMin} onChange={(e) => setQDiffMin(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQOffset(0) } }}
                                maxW="90px" size="sm" type="number" />
                            <Input placeholder="最高难度" value={qDiffMax} onChange={(e) => setQDiffMax(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQOffset(0) } }}
                                maxW="90px" size="sm" type="number" />
                        </HStack>

                        <Table.Root size="sm">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader w="40px" />
                                    <Table.ColumnHeader>描述</Table.ColumnHeader>
                                    <Table.ColumnHeader>分类</Table.ColumnHeader>
                                    <Table.ColumnHeader>状态</Table.ColumnHeader>
                                    <Table.ColumnHeader>分数</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {questions?.items.map((q) => (
                                    <Table.Row key={q.question_id} bg={selectedIds.includes(q.question_id) ? "blue.subtle" : undefined}>
                                        <Table.Cell>
                                            <Checkbox.Root
                                                size="sm"
                                                checked={selectedIds.includes(q.question_id)}
                                                onCheckedChange={() => toggleQuestion(q)}
                                            >
                                                <Checkbox.HiddenInput />
                                                <Checkbox.Control>
                                                    <Checkbox.Indicator />
                                                </Checkbox.Control>
                                            </Checkbox.Root>
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
                                        <Table.Cell>{q.score ?? "—"}</Table.Cell>
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
