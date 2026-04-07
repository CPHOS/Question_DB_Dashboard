import { useEffect, useState, type FormEvent } from "react"
import {
    Box,
    Button,
    Input,
    Stack,
    Field,
    Textarea,
    HStack,
    Spinner,
    Center,
    Drawer,
    Portal,
    CloseButton,
    Select,
    createListCollection,
} from "@chakra-ui/react"
import type { QuestionDetail } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"
import FileDropzone from "@/components/FileDropzone"
import TagInput from "@/components/TagInput"

const categoryOptions = createListCollection({
    items: [
        { label: "未分类", value: "none" },
        { label: "理论 (T)", value: "T" },
        { label: "实验 (E)", value: "E" },
    ],
})

const statusOptions = createListCollection({
    items: [
        { label: "无", value: "none" },
        { label: "已审", value: "reviewed" },
        { label: "已用", value: "used" },
    ],
})

interface Props {
    questionId: string
    open: boolean
    onClose: () => void
    onSaved: () => void
}

export default function QuestionEditDrawer({ questionId, open, onClose, onSaved }: Props) {
    const [question, setQuestion] = useState<QuestionDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [description, setDescription] = useState("")
    const [category, setCategory] = useState("none")
    const [status, setStatus] = useState("none")
    const [author, setAuthor] = useState("")
    const [reviewers, setReviewers] = useState<string[]>([])
    const [tags, setTags] = useState<string[]>([])
    const [humanScore, setHumanScore] = useState("5")
    const [humanNotes, setHumanNotes] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([])

    useEffect(() => {
        if (!open) return
        api.getQuestionTags().then((r) => setTagSuggestions(r.tags)).catch(() => {})
    }, [open])

    useEffect(() => {
        if (!open || !questionId) return
        setLoading(true)
        api
            .getQuestion(questionId)
            .then((q) => {
                setQuestion(q)
                setDescription(q.description)
                setCategory(q.category)
                setStatus(q.status)
                setAuthor(q.author)
                setReviewers(q.reviewers)
                setTags(q.tags)
                if (q.difficulty.human) {
                    setHumanScore(String(q.difficulty.human.score))
                    setHumanNotes(q.difficulty.human.notes ?? "")
                }
            })
            .catch((e) => toaster.error({ title: "加载失败", description: String(e) }))
            .finally(() => setLoading(false))
    }, [questionId, open])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!questionId) return
        setSaving(true)
        try {
            await api.patchQuestion(questionId, {
                description: description.trim(),
                category: category as "none" | "T" | "E",
                status: status as "none" | "reviewed" | "used",
                author: author.trim(),
                reviewers,
                tags,
                difficulty: {
                    human: {
                        score: parseInt(humanScore),
                        notes: humanNotes.trim() || null,
                    },
                },
            })

            if (file) {
                const fd = new FormData()
                fd.append("file", file)
                await api.replaceQuestionFile(questionId, fd)
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

    return (
        <Drawer.Root open={open} onOpenChange={(e) => { if (!e.open) onClose() }} size="lg" placement="end">
            <Portal>
                <Drawer.Backdrop />
                <Drawer.Positioner>
                    <Drawer.Content>
                        <Drawer.Header>
                            <Drawer.Title>编辑题目</Drawer.Title>
                            <Drawer.CloseTrigger asChild>
                                <CloseButton size="sm" />
                            </Drawer.CloseTrigger>
                        </Drawer.Header>
                        <Drawer.Body>
                            {loading ? (
                                <Center h="200px">
                                    <Spinner size="lg" />
                                </Center>
                            ) : question ? (
                                <Box as="form" id="questionEditForm" onSubmit={handleSubmit}>
                                    <Stack gap="4">
                                        <Field.Root>
                                            <Field.Label>替换 ZIP 文件（可选）</Field.Label>
                                            <FileDropzone onFileChange={setFile} label="拖放文件替换（可选）" />
                                        </Field.Root>

                                        <Field.Root required>
                                            <Field.Label>描述</Field.Label>
                                            <Input
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                            />
                                        </Field.Root>

                                        <HStack gap="4">
                                            <Field.Root>
                                                <Field.Label>分类</Field.Label>
                                                <Select.Root
                                                    collection={categoryOptions}
                                                    size="sm"
                                                    value={[category]}
                                                    onValueChange={(e) => setCategory(e.value[0] || "none")}
                                                >
                                                    <Select.HiddenSelect />
                                                    <Select.Control>
                                                        <Select.Trigger>
                                                            <Select.ValueText />
                                                        </Select.Trigger>
                                                        <Select.IndicatorGroup>
                                                            <Select.Indicator />
                                                        </Select.IndicatorGroup>
                                                    </Select.Control>
                                                    <Select.Positioner>
                                                        <Select.Content>
                                                            {categoryOptions.items.map((item) => (
                                                                <Select.Item item={item} key={item.value}>
                                                                    {item.label}
                                                                    <Select.ItemIndicator />
                                                                </Select.Item>
                                                            ))}
                                                        </Select.Content>
                                                    </Select.Positioner>
                                                </Select.Root>
                                            </Field.Root>
                                            <Field.Root>
                                                <Field.Label>状态</Field.Label>
                                                <Select.Root
                                                    collection={statusOptions}
                                                    size="sm"
                                                    value={[status]}
                                                    onValueChange={(e) => setStatus(e.value[0] || "none")}
                                                >
                                                    <Select.HiddenSelect />
                                                    <Select.Control>
                                                        <Select.Trigger>
                                                            <Select.ValueText />
                                                        </Select.Trigger>
                                                        <Select.IndicatorGroup>
                                                            <Select.Indicator />
                                                        </Select.IndicatorGroup>
                                                    </Select.Control>
                                                    <Select.Positioner>
                                                        <Select.Content>
                                                            {statusOptions.items.map((item) => (
                                                                <Select.Item item={item} key={item.value}>
                                                                    {item.label}
                                                                    <Select.ItemIndicator />
                                                                </Select.Item>
                                                            ))}
                                                        </Select.Content>
                                                    </Select.Positioner>
                                                </Select.Root>
                                            </Field.Root>
                                        </HStack>

                                        <Field.Root>
                                            <Field.Label>命题人</Field.Label>
                                            <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
                                        </Field.Root>

                                        <Field.Root>
                                            <Field.Label>审题人</Field.Label>
                                            <TagInput value={reviewers} onChange={setReviewers} placeholder="输入审题人后按回车添加" />
                                        </Field.Root>

                                        <Field.Root>
                                            <Field.Label>标签</Field.Label>
                                            <TagInput value={tags} onChange={setTags} placeholder="输入标签后按回车添加" suggestions={tagSuggestions} />
                                        </Field.Root>

                                        <HStack gap="4">
                                            <Field.Root required>
                                                <Field.Label>人工难度 (1-10)</Field.Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={10}
                                                    value={humanScore}
                                                    onChange={(e) => setHumanScore(e.target.value)}
                                                />
                                            </Field.Root>
                                            <Field.Root>
                                                <Field.Label>难度备注</Field.Label>
                                                <Textarea
                                                    value={humanNotes}
                                                    onChange={(e) => setHumanNotes(e.target.value)}
                                                    rows={1}
                                                />
                                            </Field.Root>
                                        </HStack>
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
                                form="questionEditForm"
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
