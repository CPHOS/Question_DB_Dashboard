import { useState } from "react"
import {
    Button,
    Card,
    Heading,
    HStack,
    Stack,
    Text,
    Stat,
} from "@chakra-ui/react"
import type { GCResult } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster"
import { LuEye, LuTrash2 } from "react-icons/lu"

function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export default function GCPage() {
    const [result, setResult] = useState<GCResult | null>(null)
    const [loading, setLoading] = useState(false)

    const handlePreview = async () => {
        setLoading(true)
        try {
            const res = await api.gcPreview()
            setResult(res)
        } catch (e) {
            toaster.error({ title: "预览失败", description: String(e) })
        } finally {
            setLoading(false)
        }
    }

    const handleRun = async () => {
        if (!window.confirm("确定要执行垃圾回收吗？此操作不可逆！")) return
        setLoading(true)
        try {
            const res = await api.gcRun()
            setResult(res)
            toaster.success({ title: "垃圾回收完成" })
        } catch (e) {
            toaster.error({ title: "执行失败", description: String(e) })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Stack gap="4">
            <Heading size="md">垃圾回收</Heading>
            <Text color="fg.muted">
                垃圾回收将永久删除已软删除的试卷、不再被引用的已软删除题目、以及无引用的文件对象。
            </Text>

            <HStack gap="3">
                <Button onClick={handlePreview} loading={loading} variant="outline">
                    <LuEye /> 预览
                </Button>
                <Button onClick={handleRun} loading={loading} colorPalette="red">
                    <LuTrash2 /> 执行回收
                </Button>
            </HStack>

            {result && (
                <Card.Root>
                    <Card.Body>
                        <Stack gap="4">
                            <Text fontWeight="medium">
                                {result.dry_run ? "预览结果（未实际执行）" : "执行结果"}
                            </Text>
                            <HStack wrap="wrap" gap="6">
                                <Stat.Root>
                                    <Stat.Label>删除题目</Stat.Label>
                                    <Stat.ValueText>{result.deleted_questions}</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>删除试卷</Stat.Label>
                                    <Stat.ValueText>{result.deleted_papers}</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>删除对象</Stat.Label>
                                    <Stat.ValueText>{result.deleted_objects}</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>释放空间</Stat.Label>
                                    <Stat.ValueText>{formatBytes(result.freed_bytes)}</Stat.ValueText>
                                </Stat.Root>
                            </HStack>
                        </Stack>
                    </Card.Body>
                </Card.Root>
            )}
        </Stack>
    )
}
