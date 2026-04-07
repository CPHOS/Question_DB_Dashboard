import { useState, useRef, type FormEvent } from "react"
import {
    Box,
    Button,
    Card,
    Heading,
    Input,
    Stack,
    Text,
    Field,
    HStack,
    Stat,
    Code,
    Checkbox,
    Select,
    Portal,
    createListCollection,
} from "@chakra-ui/react"
import type { ExportResult, QualityCheckResult, DatabaseRestoreResult } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"
import ConfirmDialog from "@/components/ConfirmDialog"
import { LuDownload, LuClipboardCheck, LuDatabase, LuUpload } from "react-icons/lu"

const formatOptions = createListCollection({
    items: [
        { label: "JSONL", value: "jsonl" },
        { label: "CSV", value: "csv" },
    ],
})

export default function OpsPage() {
    // Export
    const [exportFormat, setExportFormat] = useState<"jsonl" | "csv">("jsonl")
    const [exportPublic, setExportPublic] = useState(false)
    const [exportPath, setExportPath] = useState("")
    const [exportResult, setExportResult] = useState<ExportResult | null>(null)
    const [exporting, setExporting] = useState(false)

    // Quality check
    const [qcPath, setQcPath] = useState("")
    const [qcResult, setQcResult] = useState<QualityCheckResult | null>(null)
    const [checking, setChecking] = useState(false)

    // Database backup / restore
    const [backingUp, setBackingUp] = useState(false)
    const [restoring, setRestoring] = useState(false)
    const [restoreResult, setRestoreResult] = useState<DatabaseRestoreResult | null>(null)
    const [confirmRestore, setConfirmRestore] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const pendingFileRef = useRef<File | null>(null)

    const handleExport = async (e: FormEvent) => {
        e.preventDefault()
        setExporting(true)
        try {
            const res = await api.runExport({
                format: exportFormat,
                public: exportPublic,
                output_path: exportPath.trim() || undefined,
            })
            setExportResult(res)
            toaster.success({ title: "导出成功" })
        } catch (err) {
            toaster.error({ title: "导出失败", description: String(err) })
        } finally {
            setExporting(false)
        }
    }

    const handleQualityCheck = async (e: FormEvent) => {
        e.preventDefault()
        setChecking(true)
        try {
            const res = await api.runQualityCheck({
                output_path: qcPath.trim() || undefined,
            })
            setQcResult(res)
            toaster.success({ title: "质量检查完成" })
        } catch (err) {
            toaster.error({ title: "检查失败", description: String(err) })
        } finally {
            setChecking(false)
        }
    }

    const handleBackup = async () => {
        setBackingUp(true)
        try {
            const blob = await api.databaseBackup()
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `qb_backup_${new Date().toISOString().slice(0, 10)}.sql`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
            toaster.success({ title: "备份下载已开始" })
        } catch (err) {
            toaster.error({ title: "备份失败", description: String(err) })
        } finally {
            setBackingUp(false)
        }
    }

    const handleRestoreSelect = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        pendingFileRef.current = file
        setConfirmRestore(true)
        // reset so same file can be selected again
        e.target.value = ""
    }

    const handleRestoreConfirm = async () => {
        setConfirmRestore(false)
        const file = pendingFileRef.current
        if (!file) return
        pendingFileRef.current = null
        setRestoring(true)
        try {
            const form = new FormData()
            form.append("file", file)
            const res = await api.databaseRestore(form)
            setRestoreResult(res)
            toaster.success({ title: "数据库恢复成功" })
        } catch (err) {
            toaster.error({ title: "恢复失败", description: String(err) })
        } finally {
            setRestoring(false)
        }
    }

    const handleRestoreCancel = () => {
        setConfirmRestore(false)
        pendingFileRef.current = null
    }

    return (
        <Stack gap="6">
            <Heading size="xl">运维操作</Heading>

            {/* Database Backup / Restore */}
            <Card.Root>
                <Card.Header>
                    <Heading size="md"><LuDatabase /> 数据库备份与恢复</Heading>
                </Card.Header>
                <Card.Body>
                    <Stack gap="4">
                        <HStack gap="4" wrap="wrap">
                            <Button
                                colorPalette="blue"
                                loading={backingUp}
                                onClick={handleBackup}
                            >
                                <LuDownload /> 导出数据库备份
                            </Button>
                            <Button
                                colorPalette="red"
                                variant="outline"
                                loading={restoring}
                                onClick={handleRestoreSelect}
                            >
                                <LuUpload /> 上传并恢复数据库
                            </Button>
                            <input
                                type="file"
                                accept=".sql"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: "none" }}
                            />
                        </HStack>
                        <Text fontSize="sm" color="fg.muted">
                            备份将下载完整的 SQL 文件。恢复操作会覆盖当前数据库全部内容，请谨慎操作。
                        </Text>
                        {restoreResult && (
                            <Box>
                                <HStack gap="6">
                                    <Stat.Root>
                                        <Stat.Label>恢复文件</Stat.Label>
                                        <Stat.ValueText fontSize="sm">{restoreResult.file_name}</Stat.ValueText>
                                    </Stat.Root>
                                    <Stat.Root>
                                        <Stat.Label>恢复字节数</Stat.Label>
                                        <Stat.ValueText>{restoreResult.restored_bytes.toLocaleString()}</Stat.ValueText>
                                    </Stat.Root>
                                </HStack>
                            </Box>
                        )}
                    </Stack>
                </Card.Body>
            </Card.Root>

            {/* Export */}
            <Card.Root>
                <Card.Header>
                    <Heading size="md"><LuDownload /> 数据导出</Heading>
                </Card.Header>
                <Card.Body>
                    <Box as="form" onSubmit={handleExport}>
                        <Stack gap="3">
                            <HStack gap="4" wrap="wrap">
                                <Field.Root>
                                    <Field.Label>格式</Field.Label>
                                    <Select.Root
                                        collection={formatOptions}
                                        size="sm"
                                        width="140px"
                                        value={[exportFormat]}
                                        onValueChange={(e) => setExportFormat(e.value[0] as "jsonl" | "csv")}
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
                                                    {formatOptions.items.map((item) => (
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
                                    <Field.Label>输出路径（可选）</Field.Label>
                                    <Input
                                        value={exportPath}
                                        onChange={(e) => setExportPath(e.target.value)}
                                        placeholder="exports/output.jsonl"
                                        size="sm"
                                    />
                                </Field.Root>
                            </HStack>
                            <Checkbox.Root
                                checked={exportPublic}
                                onCheckedChange={(e) => setExportPublic(!!e.checked)}
                            >
                                <Checkbox.HiddenInput />
                                <Checkbox.Control />
                                <Checkbox.Label>公开导出（不含 TeX 源码）</Checkbox.Label>
                            </Checkbox.Root>
                            <Button type="submit" colorPalette="blue" loading={exporting} alignSelf="flex-start">
                                执行导出
                            </Button>
                        </Stack>
                    </Box>
                    {exportResult && (
                        <Box mt="4">
                            <HStack gap="6">
                                <Stat.Root>
                                    <Stat.Label>导出题数</Stat.Label>
                                    <Stat.ValueText>{exportResult.exported_questions}</Stat.ValueText>
                                </Stat.Root>
                            </HStack>
                            <Text fontSize="sm" color="fg.muted" mt="2">
                                输出路径: <Code>{exportResult.output_path}</Code>
                            </Text>
                        </Box>
                    )}
                </Card.Body>
            </Card.Root>

            {/* Quality Check */}
            <Card.Root>
                <Card.Header>
                    <Heading size="md"><LuClipboardCheck /> 质量检查</Heading>
                </Card.Header>
                <Card.Body>
                    <Box as="form" onSubmit={handleQualityCheck}>
                        <Stack gap="3">
                            <Field.Root>
                                <Field.Label>报告输出路径（可选）</Field.Label>
                                <Input
                                    value={qcPath}
                                    onChange={(e) => setQcPath(e.target.value)}
                                    placeholder="exports/quality_report.json"
                                    size="sm"
                                    maxW="400px"
                                />
                            </Field.Root>
                            <Button type="submit" colorPalette="green" loading={checking} alignSelf="flex-start">
                                运行检查
                            </Button>
                        </Stack>
                    </Box>
                    {qcResult && (
                        <Box mt="4">
                            <Text fontSize="sm" color="fg.muted">
                                报告已写入: <Code>{qcResult.output_path}</Code>
                            </Text>
                            <Box mt="2" maxH="300px" overflow="auto" bg="bg.subtle" p="3" rounded="md">
                                <Code whiteSpace="pre-wrap" display="block" fontSize="xs">
                                    {JSON.stringify(qcResult.report, null, 2)}
                                </Code>
                            </Box>
                        </Box>
                    )}
                </Card.Body>
            </Card.Root>

            <ConfirmDialog
                open={confirmRestore}
                title="确认恢复数据库"
                description="此操作将清空当前数据库并用上传的备份文件覆盖恢复。此操作不可逆，确定要继续吗？"
                confirmLabel="确认恢复"
                cancelLabel="取消"
                onConfirm={handleRestoreConfirm}
                onCancel={handleRestoreCancel}
            />
        </Stack>
    )
}
