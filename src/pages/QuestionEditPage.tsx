import { useEffect, useState, type FormEvent } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
    Box,
    Button,
    Heading,
    Input,
    Stack,
    Field,
    NativeSelect,
    Textarea,
    HStack,
    Spinner,
    Center,
} from "@chakra-ui/react"
import type { QuestionDetail } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster"
import { LuArrowLeft } from "react-icons/lu"

export default function QuestionEditPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [question, setQuestion] = useState<QuestionDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [description, setDescription] = useState("")
    const [category, setCategory] = useState("none")
    const [status, setStatus] = useState("none")
    const [author, setAuthor] = useState("")
    const [reviewers, setReviewers] = useState("")
    const [tags, setTags] = useState("")
    const [humanScore, setHumanScore] = useState("5")
    const [humanNotes, setHumanNotes] = useState("")
    const [file, setFile] = useState<File | null>(null)

    useEffect(() => {
        if (!id) return
        api
            .getQuestion(id)
            .then((q) => {
                setQuestion(q)
                setDescription(q.description)
                setCategory(q.category)
                setStatus(q.status)
                setAuthor(q.author)
                setReviewers(q.reviewers.join(", "))
                setTags(q.tags.join(", "))
                if (q.difficulty.human) {
                    setHumanScore(String(q.difficulty.human.score))
                    setHumanNotes(q.difficulty.human.notes ?? "")
                }
            })
            .catch((e) => toaster.error({ title: "加载失败", description: String(e) }))
            .finally(() => setLoading(false))
    }, [id])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!id) return
        setSaving(true)
        try {
            await api.patchQuestion(id, {
                description: description.trim(),
                category: category as "none" | "T" | "E",
                status: status as "none" | "reviewed" | "used",
                author: author.trim(),
                reviewers: reviewers
                    .split(",")
                    .map((r) => r.trim())
                    .filter(Boolean),
                tags: tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
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
                await api.replaceQuestionFile(id, fd)
            }

            toaster.success({ title: "保存成功" })
            navigate(`/questions/${id}`)
        } catch (err) {
            toaster.error({ title: "保存失败", description: String(err) })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <Center h="200px">
                <Spinner size="lg" />
            </Center>
        )
    }

    if (!question) return null

    return (
        <Stack gap="5" maxW="600px">
            <HStack>
                <Button asChild variant="ghost" size="sm">
                    <Link to={`/questions/${id}`}><LuArrowLeft /> 返回</Link>
                </Button>
                <Heading size="lg">编辑题目</Heading>
            </HStack>

            <Box as="form" onSubmit={handleSubmit}>
                <Stack gap="4">
                    <Field.Root>
                        <Field.Label>替换 ZIP 文件（可选）</Field.Label>
                        <Input
                            type="file"
                            accept=".zip"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
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
                            <NativeSelect.Root>
                                <NativeSelect.Field value={category} onChange={(e) => setCategory(e.target.value)}>
                                    <option value="none">未分类</option>
                                    <option value="T">理论 (T)</option>
                                    <option value="E">实验 (E)</option>
                                </NativeSelect.Field>
                            </NativeSelect.Root>
                        </Field.Root>
                        <Field.Root>
                            <Field.Label>状态</Field.Label>
                            <NativeSelect.Root>
                                <NativeSelect.Field value={status} onChange={(e) => setStatus(e.target.value)}>
                                    <option value="none">无</option>
                                    <option value="reviewed">已审</option>
                                    <option value="used">已用</option>
                                </NativeSelect.Field>
                            </NativeSelect.Root>
                        </Field.Root>
                    </HStack>

                    <Field.Root>
                        <Field.Label>命题人</Field.Label>
                        <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
                    </Field.Root>

                    <Field.Root>
                        <Field.Label>审题人（逗号分隔）</Field.Label>
                        <Input value={reviewers} onChange={(e) => setReviewers(e.target.value)} />
                    </Field.Root>

                    <Field.Root>
                        <Field.Label>标签（逗号分隔）</Field.Label>
                        <Input value={tags} onChange={(e) => setTags(e.target.value)} />
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

                    <Button type="submit" colorPalette="blue" loading={saving}>
                        保存修改
                    </Button>
                </Stack>
            </Box>
        </Stack>
    )
}
