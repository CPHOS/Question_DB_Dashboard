import { useEffect, useState, type FormEvent } from "react"
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
} from "@chakra-ui/react"
import type { PaperDetail } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"
import FileDropzone from "@/components/FileDropzone"

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

    useEffect(() => {
        if (!open || !paperId) return
        setLoading(true)
        api
            .getPaper(paperId)
            .then((p) => {
                setPaper(p)
                setTitle(p.title)
                setSubtitle(p.subtitle)
                setDescription(p.description)
            })
            .catch((e) => toaster.error({ title: "加载失败", description: String(e) }))
            .finally(() => setLoading(false))
    }, [paperId, open])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!paperId) return
        setSaving(true)
        try {
            await api.patchPaper(paperId, {
                title: title.trim(),
                subtitle: subtitle.trim(),
                description: description.trim(),
            })

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

    return (
        <Drawer.Root open={open} onOpenChange={(e) => { if (!e.open) onClose() }} size="lg" placement="end">
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
