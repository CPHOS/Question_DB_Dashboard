import { useEffect, useState, type FormEvent } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
    Box,
    Button,
    Heading,
    Input,
    Stack,
    Field,
    HStack,
    Spinner,
    Center,
} from "@chakra-ui/react"
import type { PaperDetail } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster"
import { LuArrowLeft } from "react-icons/lu"

export default function PaperEditPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [paper, setPaper] = useState<PaperDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [title, setTitle] = useState("")
    const [subtitle, setSubtitle] = useState("")
    const [description, setDescription] = useState("")
    const [file, setFile] = useState<File | null>(null)

    useEffect(() => {
        if (!id) return
        api
            .getPaper(id)
            .then((p) => {
                setPaper(p)
                setTitle(p.title)
                setSubtitle(p.subtitle)
                setDescription(p.description)
            })
            .catch((e) => toaster.error({ title: "加载失败", description: String(e) }))
            .finally(() => setLoading(false))
    }, [id])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!id) return
        setSaving(true)
        try {
            await api.patchPaper(id, {
                title: title.trim(),
                subtitle: subtitle.trim(),
                description: description.trim(),
            })

            if (file) {
                const fd = new FormData()
                fd.append("file", file)
                await api.replacePaperFile(id, fd)
            }

            toaster.success({ title: "保存成功" })
            navigate(`/papers/${id}`)
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

    if (!paper) return null

    return (
        <Stack gap="5" maxW="600px">
            <HStack>
                <Button asChild variant="ghost" size="sm">
                    <Link to={`/papers/${id}`}><LuArrowLeft /> 返回</Link>
                </Button>
                <Heading size="lg">编辑试卷</Heading>
            </HStack>

            <Box as="form" onSubmit={handleSubmit}>
                <Stack gap="4">
                    <Field.Root>
                        <Field.Label>替换附件 ZIP（可选）</Field.Label>
                        <Input type="file" accept=".zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
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

                    <Button type="submit" colorPalette="blue" loading={saving}>
                        保存修改
                    </Button>
                </Stack>
            </Box>
        </Stack>
    )
}
