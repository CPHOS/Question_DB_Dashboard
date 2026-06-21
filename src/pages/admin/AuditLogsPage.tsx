import { useEffect, useState, useCallback } from "react"
import {
    Box,
    Button,
    HStack,
    Table,
    Text,
    Badge,
    IconButton,
    Stack,
    Input,
    Field,
    Select,
    Portal,
    createListCollection,
} from "@chakra-ui/react"
import type { AuditLogEntry, AuditLogsQuery, Paginated } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"
import { LuChevronLeft, LuChevronRight, LuDownload, LuSearch } from "react-icons/lu"

const LIMIT = 50

const methodOptions = createListCollection({
    items: [
        { label: "全部方法", value: "" },
        { label: "GET", value: "GET" },
        { label: "POST", value: "POST" },
        { label: "PATCH", value: "PATCH" },
        { label: "PUT", value: "PUT" },
        { label: "DELETE", value: "DELETE" },
    ],
})

function statusColor(code: number): string {
    if (code >= 500) return "red"
    if (code >= 400) return "orange"
    if (code >= 300) return "blue"
    return "green"
}

export default function AuditLogsPage() {
    const [data, setData] = useState<Paginated<AuditLogEntry> | null>(null)
    const [offset, setOffset] = useState(0)
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)

    // Filter inputs (form state)
    const [method, setMethod] = useState("")
    const [path, setPath] = useState("")
    const [username, setUsername] = useState("")
    const [statusMin, setStatusMin] = useState("")
    const [statusMax, setStatusMax] = useState("")
    const [createdAfter, setCreatedAfter] = useState("")
    const [createdBefore, setCreatedBefore] = useState("")

    // Applied filters (what we actually query with)
    const [applied, setApplied] = useState<AuditLogsQuery>({})

    const buildQuery = useCallback(
        (extra: AuditLogsQuery = {}): AuditLogsQuery => ({
            limit: LIMIT,
            offset,
            ...applied,
            ...extra,
        }),
        [offset, applied],
    )

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.adminGetAuditLogs(buildQuery())
            setData(res)
        } catch (e) {
            toaster.error({ title: "加载失败", description: String(e) })
        } finally {
            setLoading(false)
        }
    }, [buildQuery])

    useEffect(() => { load() }, [load])

    const page = Math.floor(offset / LIMIT)
    const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1

    const applyFilters = () => {
        const q: AuditLogsQuery = {}
        if (method) q.method = method
        if (path.trim()) q.path = path.trim()
        if (username.trim()) q.username = username.trim()
        if (statusMin) q.status_min = Number(statusMin)
        if (statusMax) q.status_max = Number(statusMax)
        if (createdAfter) q.created_after = createdAfter
        if (createdBefore) q.created_before = createdBefore
        setOffset(0)
        setApplied(q)
    }

    const resetFilters = () => {
        setMethod(""); setPath(""); setUsername("")
        setStatusMin(""); setStatusMax("")
        setCreatedAfter(""); setCreatedBefore("")
        setOffset(0)
        setApplied({})
    }

    const handleExport = async () => {
        setExporting(true)
        try {
            // Export up to a large bound of the currently-filtered set.
            const blob = await api.adminExportAuditLogs({ ...applied, limit: 50000 })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
            toaster.success({ title: "导出已开始" })
        } catch (e) {
            toaster.error({ title: "导出失败", description: String(e) })
        } finally {
            setExporting(false)
        }
    }

    const fmtTime = (s: string) => {
        try {
            return new Date(s).toLocaleString()
        } catch {
            return s
        }
    }

    return (
        <Stack gap="3">
            <HStack justify="space-between">
                <Text fontWeight="medium">API 调用审计日志</Text>
                <Button size="sm" colorPalette="green" onClick={handleExport} loading={exporting}>
                    <LuDownload /> 导出 CSV
                </Button>
            </HStack>

            {/* Filter bar */}
            <Field.Root>
                <HStack gap="2" wrap="wrap" align="flex-end">
                    <Box minW="120px">
                        <Field.Label fontSize="xs">方法</Field.Label>
                        <Select.Root
                            collection={methodOptions}
                            size="sm"
                            value={[method]}
                            onValueChange={(e) => setMethod(e.value[0] ?? "")}
                        >
                            <Select.HiddenSelect />
                            <Select.Control>
                                <Select.Trigger><Select.ValueText /></Select.Trigger>
                                <Select.IndicatorGroup><Select.Indicator /></Select.IndicatorGroup>
                            </Select.Control>
                            <Portal>
                                <Select.Positioner>
                                    <Select.Content>
                                        {methodOptions.items.map((item) => (
                                            <Select.Item item={item} key={item.value}>
                                                {item.label}
                                                <Select.ItemIndicator />
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Positioner>
                            </Portal>
                        </Select.Root>
                    </Box>
                    <Box>
                        <Field.Label fontSize="xs">路径 (包含)</Field.Label>
                        <Input size="sm" w="180px" placeholder="/questions" value={path} onChange={(e) => setPath(e.target.value)} />
                    </Box>
                    <Box>
                        <Field.Label fontSize="xs">用户名 (包含)</Field.Label>
                        <Input size="sm" w="140px" placeholder="admin" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </Box>
                    <Box>
                        <Field.Label fontSize="xs">状态码区间</Field.Label>
                        <HStack>
                            <Input size="sm" w="70px" type="number" placeholder="200" value={statusMin} onChange={(e) => setStatusMin(e.target.value)} />
                            <Text>–</Text>
                            <Input size="sm" w="70px" type="number" placeholder="599" value={statusMax} onChange={(e) => setStatusMax(e.target.value)} />
                        </HStack>
                    </Box>
                    <Box>
                        <Field.Label fontSize="xs">时间起止</Field.Label>
                        <HStack>
                            <Input size="sm" w="150px" type="date" value={createdAfter} onChange={(e) => setCreatedAfter(e.target.value)} />
                            <Text>–</Text>
                            <Input size="sm" w="150px" type="date" value={createdBefore} onChange={(e) => setCreatedBefore(e.target.value)} />
                        </HStack>
                    </Box>
                    <Button size="sm" colorPalette="blue" onClick={applyFilters}><LuSearch /> 查询</Button>
                    <Button size="sm" variant="ghost" onClick={resetFilters}>重置</Button>
                </HStack>
            </Field.Root>

            <Box overflowX="auto">
                <Table.Root size="sm" striped>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>时间</Table.ColumnHeader>
                            <Table.ColumnHeader>方法</Table.ColumnHeader>
                            <Table.ColumnHeader>路径</Table.ColumnHeader>
                            <Table.ColumnHeader>状态</Table.ColumnHeader>
                            <Table.ColumnHeader>耗时</Table.ColumnHeader>
                            <Table.ColumnHeader>调用者</Table.ColumnHeader>
                            <Table.ColumnHeader>来源 IP</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {loading && (
                            <Table.Row>
                                <Table.Cell colSpan={7}><Text textAlign="center">加载中...</Text></Table.Cell>
                            </Table.Row>
                        )}
                        {!loading && data?.items.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={7}><Text textAlign="center" color="fg.muted">无记录</Text></Table.Cell>
                            </Table.Row>
                        )}
                        {data?.items.map((row) => (
                            <Table.Row key={row.id}>
                                <Table.Cell fontSize="xs" color="fg.muted" whiteSpace="nowrap">{fmtTime(row.created_at)}</Table.Cell>
                                <Table.Cell fontSize="xs"><Badge>{row.method}</Badge></Table.Cell>
                                <Table.Cell fontSize="xs" fontFamily="mono">
                                    {row.path}{row.query ? <Text as="span" color="fg.muted">?{row.query}</Text> : null}
                                </Table.Cell>
                                <Table.Cell fontSize="xs">
                                    <Badge colorPalette={statusColor(row.status_code)}>{row.status_code}</Badge>
                                </Table.Cell>
                                <Table.Cell fontSize="xs" color="fg.muted">{row.duration_ms} ms</Table.Cell>
                                <Table.Cell fontSize="xs">
                                    {row.username
                                        ? <HStack gap="1"><Text>{row.username}</Text>{row.role && <Badge size="sm" variant="subtle">{row.role}</Badge>}</HStack>
                                        : <Text color="fg.muted">匿名</Text>}
                                </Table.Cell>
                                <Table.Cell fontSize="xs" color="fg.muted" fontFamily="mono">{row.client_ip ?? "—"}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>

            <HStack justify="space-between">
                <Text fontSize="sm" color="fg.muted">共 {data?.total ?? 0} 条</Text>
                <HStack>
                    <IconButton aria-label="prev" size="xs" variant="outline" disabled={page === 0}
                        onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
                        <LuChevronLeft />
                    </IconButton>
                    <Text fontSize="sm">{page + 1} / {totalPages}</Text>
                    <IconButton aria-label="next" size="xs" variant="outline" disabled={page + 1 >= totalPages}
                        onClick={() => setOffset(offset + LIMIT)}>
                        <LuChevronRight />
                    </IconButton>
                </HStack>
            </HStack>
        </Stack>
    )
}
