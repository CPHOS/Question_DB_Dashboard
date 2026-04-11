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
import { toaster } from "@/components/ui/toaster-instance"
import { LuArrowLeft } from "react-icons/lu"
import FileDropzone from "@/components/FileDropzone"
import TagInput from "@/components/TagInput"

const categoryOptions = createListCollection({
    items: [
        { label: "未分类", value: "none" },
        { label: "理论 (T)", value: "T" },
        { label: "实验 (E)", value: "E" },
    ],
})

export default function QuestionCreatePage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [description, setDescription] = useState("")
    const [category, setCategory] = useState("none")
    const [tags, setTags] = useState<string[]>([])
    const [file, setFile] = useState<File | null>(null)
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([])

    useEffect(() => {
        api.getQuestionTags().then((r) => setTagSuggestions(r.tags)).catch(() => {})
    }, [])

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
                        <Field.Label>标签</Field.Label>
                        <TagInput value={tags} onChange={setTags} placeholder="输入标签后按回车添加" suggestions={tagSuggestions} />
                    </Field.Root>

                    <Button type="submit" colorPalette="blue" loading={loading}>
                        创建题目
                    </Button>
                </Stack>
            </Box>
        </Stack>
    )
}
