import { useEffect, useState, useCallback, useRef, type FormEvent } from "react"
import {
    Box,
    Button,
    Input,
    Stack,
    Field,
    Spinner,
    Center,
    Drawer,
    Portal,
    CloseButton,
    Heading,
    HStack,
    Table,
    Text,
    Badge,
    IconButton,
    Checkbox,
    Separator,
    Flex,
    Card,
} from "@chakra-ui/react"
import type { PaperDetail, QuestionSummary, Paginated } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"
import FileDropzone from "@/components/FileDropzone"
import { LuSearch, LuChevronLeft, LuChevronRight, LuGripVertical, LuX, LuArrowUp, LuArrowDown } from "react-icons/lu"

interface Props {
    paperId: string
    open: boolean
    onClose: () => void
    onSaved: () => void
}

export default function PaperEditDrawer({ paperId, open, onClose, onSaved }: Props) {
    const [paper, setPaper] = useState<PaperDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [title, setTitle] = useState("")
    const [subtitle, setSubtitle] = useState("")
    const [description, setDescription] = useState("")
    const [file, setFile] = useState<File | null>(null)

    // Question editing
    const [selectedQuestions, setSelectedQuestions] = useState<QuestionSummary[]>([])
    const [questionsChanged, setQuestionsChanged] = useState(false)

    // Question picker
    const [pickerQuestions, setPickerQuestions] = useState<Paginated<QuestionSummary> | null>(null)
    const [qSearch, setQSearch] = useState("")
    const [qOffset, setQOffset] = useState(0)
    const PICKER_LIMIT = 10

    // Drag state
    const dragItem = useRef<number | null>(null)
    const dragOverItem = useRef<number | null>(null)

    useEffect(() => {
        if (!open || !paperId) return
        setLoading(true)
        setQuestionsChanged(false)
        api
            .getPaper(paperId)
            .then((p) => {
                setPaper(p)
                setTitle(p.title)
                setSubtitle(p.subtitle)
                setDescription(p.description)
                setSelectedQuestions(p.questions)
            })
            .catch((e) => toaster.error({ title: "加载失败", description: String(e) }))
            .finally(() => setLoading(false))
    }, [paperId, open])

    const loadPickerQuestions = useCallback(async () => {
        try {
            const res = await api.getQuestions({
                q: qSearch || undefined,
                limit: PICKER_LIMIT,
                offset: qOffset,
            })
            setPickerQuestions(res)
        } catch { /* ignore */ }
    }, [qSearch, qOffset])

    useEffect(() => {
        if (open) loadPickerQuestions()
    }, [open, loadPickerQuestions])

    const selectedIds = selectedQuestions.map((q) => q.question_id)

    const toggleQuestion = (q: QuestionSummary) => {
        setQuestionsChanged(true)
        setSelectedQuestions((prev) => {
            if (prev.some((s) => s.question_id === q.question_id)) {
                return prev.filter((s) => s.question_id !== q.question_id)
            }
            return [...prev, q]
        })
    }

    const removeSelected = (id: string) => {
        setQuestionsChanged(true)
        setSelectedQuestions((prev) => prev.filter((q) => q.question_id !== id))
    }

    const moveItem = (from: number, to: number) => {
        setQuestionsChanged(true)
        setSelectedQuestions((prev) => {
            const next = [...prev]
            const [item] = next.splice(from, 1)
            next.splice(to, 0, item)
            return next
        })
    }

    const handleDragStart = (idx: number) => { dragItem.current = idx }
    const handleDragEnter = (idx: number) => { dragOverItem.current = idx }
    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            moveItem(dragItem.current, dragOverItem.current)
        }
        dragItem.current = null
        dragOverItem.current = null
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!paperId) return
        setSaving(true)
        try {
            const patch: Record<string, unknown> = {
                title: title.trim(),
                subtitle: subtitle.trim(),
                description: description.trim(),
            }
            if (questionsChanged) {
                patch.question_ids = selectedIds
            }
            await api.patchPaper(paperId, patch as Parameters<typeof api.patchPaper>[1])

            if (file) {
                const fd = new FormData()
                fd.append("file", file)
                await api.replacePaperFile(paperId, fd)
            }

            toaster.success({ title: "保存成功" })
            onSaved()
            onClose()
        } catch (err) {
            toaster.error({ title: "保存失败", description: String(err) })
        } finally {
            setSaving(false)
        }
    }

    const qPage = Math.floor(qOffset / PICKER_LIMIT)
    const qTotalPages = pickerQuestions ? Math.ceil(pickerQuestions.total / PICKER_LIMIT) : 0

    return (
        <Drawer.Root open={open} onOpenChange={(e) => { if (!e.open) onClose() }} size="xl" placement="end">
            <Portal>
                <Drawer.Backdrop />
                <Drawer.Positioner>
                    <Drawer.Content>
                        <Drawer.Header>
                            <Drawer.Title>编辑试卷</Drawer.Title>
                            <Drawer.CloseTrigger asChild>
                                <CloseButton size="sm" />
                            </Drawer.CloseTrigger>
                        </Drawer.Header>
                        <Drawer.Body>
                            {loading ? (
                                <Center h="200px">
                                    <Spinner size="lg" />
                                </Center>
                            ) : paper ? (
                                <Box as="form" id="paperEditForm" onSubmit={handleSubmit}>
                                    <Stack gap="4">
                                        <Field.Root>
                                            <Field.Label>替换附件 ZIP（可选）</Field.Label>
                                            <FileDropzone onFileChange={setFile} label="拖放文件替换（可选）" />
                                        </Field.Root>

                                        <Field.Root required>
                                            <Field.Label>标题</Field.Label>
                                            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                                        </Field.Root>

                                        <Field.Root required>
                                            <Field.Label>副标题</Field.Label>
                                            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
                                        </Field.Root>

                                        <Field.Root required>
                                            <Field.Label>描述</Field.Label>
                                            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                                        </Field.Root>

                                        <Separator />

                                        {/* Selected questions - sortable list */}
                                        <Box>
                                            <Heading size="sm" mb="2">题目顺序 ({selectedQuestions.length})</Heading>
                                            {selectedQuestions.length === 0 ? (
                                                <Card.Root variant="outline">
                                                    <Card.Body py="4">
                                                        <Text textAlign="center" color="fg.muted" fontSize="sm">
                                                            从下方题库中选择题目
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
                                                                    <Box color="fg.muted" cursor="grab"><LuGripVertical /></Box>
                                                                    <Badge size="sm" variant="solid" colorPalette="blue" minW="24px" textAlign="center">
                                                                        {idx + 1}
                                                                    </Badge>
                                                                    <Text fontSize="sm" flex="1" truncate>{q.description}</Text>
                                                                    {q.category !== "none" && (
                                                                        <Badge size="sm" colorPalette={q.category === "T" ? "blue" : "green"}>
                                                                            {q.category}
                                                                        </Badge>
                                                                    )}
                                                                    <Text fontSize="xs" color="fg.muted">{q.score ?? "—"}分</Text>
                                                                    <HStack gap="0">
                                                                        <IconButton aria-label="上移" size="xs" variant="ghost"
                                                                            disabled={idx === 0} onClick={() => moveItem(idx, idx - 1)}>
                                                                            <LuArrowUp />
                                                                        </IconButton>
                                                                        <IconButton aria-label="下移" size="xs" variant="ghost"
                                                                            disabled={idx === selectedQuestions.length - 1}
                                                                            onClick={() => moveItem(idx, idx + 1)}>
                                                                            <LuArrowDown />
                                                                        </IconButton>
                                                                        <IconButton aria-label="移除" size="xs" variant="ghost"
                                                                            colorPalette="red" onClick={() => removeSelected(q.question_id)}>
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
                                            <HStack mb="2" gap="2">
                                                <Input
                                                    placeholder="搜索题目..."
                                                    value={qSearch}
                                                    onChange={(e) => setQSearch(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQOffset(0); loadPickerQuestions() } }}
                                                    size="sm"
                                                    maxW="250px"
                                                />
                                                <IconButton aria-label="search" size="sm" onClick={() => { setQOffset(0); loadPickerQuestions() }}>
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
                                                        <Table.ColumnHeader>分数</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {pickerQuestions?.items.map((q) => (
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
                                                            <Table.Cell fontSize="sm">{q.description}</Table.Cell>
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
                                                <IconButton aria-label="prev" size="xs" variant="outline"
                                                    disabled={qPage === 0} onClick={() => setQOffset(qOffset - PICKER_LIMIT)}>
                                                    <LuChevronLeft />
                                                </IconButton>
                                                <Text fontSize="xs">{qPage + 1} / {qTotalPages || 1}</Text>
                                                <IconButton aria-label="next" size="xs" variant="outline"
                                                    disabled={qPage + 1 >= qTotalPages} onClick={() => setQOffset(qOffset + PICKER_LIMIT)}>
                                                    <LuChevronRight />
                                                </IconButton>
                                            </HStack>
                                        </Box>
                                    </Stack>
                                </Box>
                            ) : null}
                        </Drawer.Body>
                        <Drawer.Footer>
                            <Drawer.ActionTrigger asChild>
                                <Button variant="outline">取消</Button>
                            </Drawer.ActionTrigger>
                            <Button
                                type="submit"
                                form="paperEditForm"
                                colorPalette="blue"
                                loading={saving}
                            >
                                保存修改
                            </Button>
                        </Drawer.Footer>
                    </Drawer.Content>
                </Drawer.Positioner>
            </Portal>
        </Drawer.Root>
    )
}
