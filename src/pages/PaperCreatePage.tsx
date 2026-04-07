import { useState, type FormEvent } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
    Box,
    Button,
    Heading,
    Input,
    Stack,
    Field,
    HStack,
    Separator,
} from "@chakra-ui/react"
import type { QuestionSummary } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"
import { LuArrowLeft } from "react-icons/lu"
import FileDropzone from "@/components/FileDropzone"
import QuestionPicker from "@/components/QuestionPicker"

export default function PaperCreatePage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState("")
    const [subtitle, setSubtitle] = useState("")
    const [description, setDescription] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [selectedQuestions, setSelectedQuestions] = useState<QuestionSummary[]>([])

    const selectedIds = selectedQuestions.map((q) => q.question_id)

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

                    <QuestionPicker
                        selectedQuestions={selectedQuestions}
                        onSelectedChange={setSelectedQuestions}
                        showAdvancedFilters
                    />

                    <Button type="submit" colorPalette="blue" loading={loading}>
                        创建试卷
                    </Button>
                </Stack>
            </Box>
        </Stack>
    )
}
