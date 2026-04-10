import { useState, useEffect, type FormEvent } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
    Box,
    Button,
    Heading,
    Input,
    Stack,
    Field,
    HStack,
    Select,
    Portal,
    createListCollection,
} from "@chakra-ui/react"
import * as api from "@/lib/api"
import { useAuth } from "@/contexts/useAuth"
import { toaster } from "@/components/ui/toaster-instance"
import { LuArrowLeft } from "react-icons/lu"
import FileDropzone from "@/components/FileDropzone"
import TagInput from "@/components/TagInput"
import DifficultyEditor from "@/components/DifficultyEditor"
import type { Difficulty } from "@/types"
import { loadPreferences } from "@/lib/preferences"

function stripUpdatedBy(d: Difficulty): Difficulty {
    const result: Difficulty = {}
    for (const [k, v] of Object.entries(d)) {
        result[k] = { score: v.score, notes: v.notes ?? null }
    }
    return result
}

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

export default function QuestionCreatePage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const isUser = user?.role === "user"
    const [loading, setLoading] = useState(false)
    const [description, setDescription] = useState("")
    const [category, setCategory] = useState("none")
    const [status, setStatus] = useState("none")
    const [author, setAuthor] = useState("")
    const [reviewers, setReviewers] = useState<string[]>([])
    const [tags, setTags] = useState<string[]>([])
    const [difficulty, setDifficulty] = useState<Difficulty>({ human: { score: 5, notes: null } })
    const [file, setFile] = useState<File | null>(null)
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([])

    useEffect(() => {
        api.getQuestionTags().then((r) => setTagSuggestions(r.tags)).catch(() => {})
    }, [])

    useEffect(() => {
        if (!user) return
        const prefs = loadPreferences(user.user_id)
        if (prefs.autoFillAuthor && prefs.authorName) {
            setAuthor(prefs.authorName)
        }
    }, [user])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!file) {
            toaster.error({ title: "请选择文件" })
            return
        }
        if (!description.trim()) {
            toaster.error({ title: "请填写描述" })
            return
        }

        setLoading(true)
        try {
            const fd = new FormData()
            fd.append("file", file)
            fd.append("description", description.trim())
            fd.append("category", category)
            fd.append("status", status)
            fd.append("author", author.trim())

            if (!isUser) {
                fd.append("difficulty", JSON.stringify(stripUpdatedBy(difficulty)))
                fd.append("reviewers", JSON.stringify(reviewers))
            }

            fd.append("tags", JSON.stringify(tags))

            const res = await api.createQuestion(fd)
            toaster.success({ title: "创建成功" })
            navigate(`/questions/${res.question_id}`)
        } catch (err) {
            toaster.error({ title: "创建失败", description: String(err) })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Stack gap="5" maxW="600px">
            <HStack>
                <Button asChild variant="ghost" size="sm">
                    <Link to="/questions"><LuArrowLeft /> 返回</Link>
                </Button>
                <Heading size="lg">新建题目</Heading>
            </HStack>

            <Box as="form" onSubmit={handleSubmit}>
                <Stack gap="4">
                    <Field.Root required>
                        <Field.Label>ZIP 文件</Field.Label>
                        <FileDropzone onFileChange={setFile} />
                    </Field.Root>

                    <Field.Root required>
                        <Field.Label>描述</Field.Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="题目描述"
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
                                <Portal>
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
                                </Portal>
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
                                <Portal>
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
                                </Portal>
                            </Select.Root>
                        </Field.Root>
                    </HStack>

                    <Field.Root>
                        <Field.Label>命题人</Field.Label>
                        <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="命题人姓名" />
                    </Field.Root>

                    {!isUser && (
                        <Field.Root>
                            <Field.Label>审题人</Field.Label>
                            <TagInput value={reviewers} onChange={setReviewers} placeholder="输入审题人后按回车添加" />
                        </Field.Root>
                    )}

                    <Field.Root>
                        <Field.Label>标签</Field.Label>
                        <TagInput value={tags} onChange={setTags} placeholder="输入标签后按回车添加" suggestions={tagSuggestions} />
                    </Field.Root>

                    {!isUser && (
                        <Field.Root>
                            <Field.Label>难度评估</Field.Label>
                            <DifficultyEditor value={difficulty} onChange={setDifficulty} />
                        </Field.Root>
                    )}

                    <Button type="submit" colorPalette="blue" loading={loading}>
                        创建题目
                    </Button>
                </Stack>
            </Box>
        </Stack>
    )
}
