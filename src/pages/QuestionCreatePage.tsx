import { useState, type FormEvent } from "react"
import { useNavigate, Link } from "react-router-dom"
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
} from "@chakra-ui/react"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster"
import { LuArrowLeft } from "react-icons/lu"

export default function QuestionCreatePage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [description, setDescription] = useState("")
    const [category, setCategory] = useState("none")
    const [status, setStatus] = useState("none")
    const [author, setAuthor] = useState("")
    const [reviewers, setReviewers] = useState("")
    const [tags, setTags] = useState("")
    const [humanScore, setHumanScore] = useState("5")
    const [humanNotes, setHumanNotes] = useState("")
    const [file, setFile] = useState<File | null>(null)

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

            const diffObj = {
                human: {
                    score: parseInt(humanScore),
                    notes: humanNotes.trim() || null,
                },
            }
            fd.append("difficulty", JSON.stringify(diffObj))

            if (tags.trim()) {
                fd.append("tags", JSON.stringify(tags.split(",").map((t) => t.trim()).filter(Boolean)))
            } else {
                fd.append("tags", "[]")
            }

            if (reviewers.trim()) {
                fd.append("reviewers", JSON.stringify(reviewers.split(",").map((r) => r.trim()).filter(Boolean)))
            } else {
                fd.append("reviewers", "[]")
            }

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
                            placeholder="题目描述"
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
                        <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="命题人姓名" />
                    </Field.Root>

                    <Field.Root>
                        <Field.Label>审题人（逗号分隔）</Field.Label>
                        <Input value={reviewers} onChange={(e) => setReviewers(e.target.value)} placeholder="审题人1, 审题人2" />
                    </Field.Root>

                    <Field.Root>
                        <Field.Label>标签（逗号分隔）</Field.Label>
                        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="力学, 热学" />
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
                                placeholder="可选备注"
                                rows={1}
                            />
                        </Field.Root>
                    </HStack>

                    <Button type="submit" colorPalette="blue" loading={loading}>
                        创建题目
                    </Button>
                </Stack>
            </Box>
        </Stack>
    )
}
