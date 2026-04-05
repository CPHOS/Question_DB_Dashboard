import { useEffect, useState, useCallback } from "react"
import {
    Box,
    Button,
    HStack,
    Input,
    Table,
    Text,
    Badge,
    IconButton,
    Stack,
    Select,
    Portal,
    createListCollection,
} from "@chakra-ui/react"
import type { AdminQuestionsQuery, AdminQuestionSummary, Paginated } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"
import { LuSearch, LuChevronLeft, LuChevronRight, LuRotateCcw } from "react-icons/lu"

const LIMIT = 20

const stateOptions = createListCollection({
    items: [
        { label: "全部", value: "all" },
        { label: "活跃", value: "active" },
        { label: "已删除", value: "deleted" },
    ],
})

export default function AdminQuestionsPage() {
    const [data, setData] = useState<Paginated<AdminQuestionSummary> | null>(null)
    const [query, setQuery] = useState<AdminQuestionsQuery>({ state: "deleted", limit: LIMIT, offset: 0 })
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.adminGetQuestions(query)
            setData(res)
        } catch (e) {
            toaster.error({ title: "加载失败", description: String(e) })
        } finally {
            setLoading(false)
        }
    }, [query])

    useEffect(() => { load() }, [load])

    const handleSearch = () =>
        setQuery((prev) => ({ ...prev, q: search || undefined, offset: 0 }))

    const handleRestore = async (id: string) => {
        try {
            await api.adminRestoreQuestion(id)
            toaster.success({ title: "已恢复" })
            load()
        } catch (e) {
            toaster.error({ title: "恢复失败", description: String(e) })
        }
    }

    const page = Math.floor((query.offset ?? 0) / LIMIT)
    const totalPages = data ? Math.ceil(data.total / LIMIT) : 0

    return (
        <Stack gap="3">
            <HStack wrap="wrap" gap="2">
                <Input
                    placeholder="搜索..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    maxW="250px"
                    size="sm"
                />
                <IconButton aria-label="search" size="sm" onClick={handleSearch}>
                    <LuSearch />
                </IconButton>
                <Select.Root
                    collection={stateOptions}
                    size="sm"
                    width="130px"
                    value={[query.state ?? "deleted"]}
                    onValueChange={(e) =>
                        setQuery((prev) => ({
                            ...prev,
                            state: e.value[0] as "active" | "deleted" | "all",
                            offset: 0,
                        }))
                    }
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
                                {stateOptions.items.map((item) => (
                                    <Select.Item item={item} key={item.value}>
                                        {item.label}
                                        <Select.ItemIndicator />
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Positioner>
                    </Portal>
                </Select.Root>
            </HStack>

            <Box overflowX="auto">
                <Table.Root size="sm" striped>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>描述</Table.ColumnHeader>
                            <Table.ColumnHeader>分类</Table.ColumnHeader>
                            <Table.ColumnHeader>状态</Table.ColumnHeader>
                            <Table.ColumnHeader>已删除</Table.ColumnHeader>
                            <Table.ColumnHeader>删除时间</Table.ColumnHeader>
                            <Table.ColumnHeader>操作</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {loading && (
                            <Table.Row>
                                <Table.Cell colSpan={6}><Text textAlign="center">加载中...</Text></Table.Cell>
                            </Table.Row>
                        )}
                        {!loading && data?.items.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={6}><Text textAlign="center" color="fg.muted">暂无数据</Text></Table.Cell>
                            </Table.Row>
                        )}
                        {data?.items.map((q) => (
                            <Table.Row key={q.question_id}>
                                <Table.Cell fontWeight="medium">{q.description}</Table.Cell>
                                <Table.Cell>
                                    {q.category === "T" && <Badge colorPalette="blue">T</Badge>}
                                    {q.category === "E" && <Badge colorPalette="green">E</Badge>}
                                    {q.category === "none" && <Badge variant="outline">—</Badge>}
                                </Table.Cell>
                                <Table.Cell>{q.status}</Table.Cell>
                                <Table.Cell>
                                    {q.is_deleted ? (
                                        <Badge colorPalette="red">已删除</Badge>
                                    ) : (
                                        <Badge colorPalette="green">活跃</Badge>
                                    )}
                                </Table.Cell>
                                <Table.Cell fontSize="xs" color="fg.muted">
                                    {q.deleted_at ? new Date(q.deleted_at).toLocaleString() : "—"}
                                </Table.Cell>
                                <Table.Cell>
                                    {q.is_deleted && (
                                        <Button size="xs" variant="outline" onClick={() => handleRestore(q.question_id)}>
                                            <LuRotateCcw /> 恢复
                                        </Button>
                                    )}
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>

            <HStack justify="space-between">
                <Text fontSize="sm" color="fg.muted">共 {data?.total ?? 0} 条</Text>
                <HStack>
                    <IconButton aria-label="prev" size="xs" variant="outline" disabled={page === 0}
                        onClick={() => setQuery((p) => ({ ...p, offset: (p.offset ?? 0) - LIMIT }))}>
                        <LuChevronLeft />
                    </IconButton>
                    <Text fontSize="sm">{page + 1} / {totalPages || 1}</Text>
                    <IconButton aria-label="next" size="xs" variant="outline" disabled={page + 1 >= totalPages}
                        onClick={() => setQuery((p) => ({ ...p, offset: (p.offset ?? 0) + LIMIT }))}>
                        <LuChevronRight />
                    </IconButton>
                </HStack>
            </HStack>
        </Stack>
    )
}
