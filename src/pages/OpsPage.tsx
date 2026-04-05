import { useState, type FormEvent } from "react"
import {
    Box,
    Button,
    Card,
    Heading,
    Input,
    NativeSelect,
    Stack,
    Text,
    Field,
    HStack,
    Stat,
    Code,
    Checkbox,
} from "@chakra-ui/react"
import type { ExportResult, QualityCheckResult } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster"
import { LuDownload, LuClipboardCheck } from "react-icons/lu"

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

    return (
        <Stack gap="6">
            <Heading size="xl">运维操作</Heading>

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
                                    <NativeSelect.Root>
                                        <NativeSelect.Field
                                            value={exportFormat}
                                            onChange={(e) => setExportFormat(e.target.value as "jsonl" | "csv")}
                                        >
                                            <option value="jsonl">JSONL</option>
                                            <option value="csv">CSV</option>
                                        </NativeSelect.Field>
                                    </NativeSelect.Root>
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
        </Stack>
    )
}
