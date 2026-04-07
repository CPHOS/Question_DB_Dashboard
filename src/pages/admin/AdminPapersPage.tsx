import { useEffect, useState, useCallback, useMemo } from "react"
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
import type { AdminPapersQuery, AdminPaperSummary, Paginated } from "@/types"
import * as api from "@/lib/api"
import { toaster } from "@/components/ui/toaster-instance"
import { LuSearch, LuChevronLeft, LuChevronRight, LuRotateCcw, LuEye } from "react-icons/lu"
import AdminPaperDetailDrawer from "./AdminPaperDetailDrawer"

const LIMIT_DEFAULT = 20

const PAGE_SIZE_OPTIONS = createListCollection({
    items: [
        { label: "10 条/页", value: "10" },
        { label: "20 条/页", value: "20" },
        { label: "50 条/页", value: "50" },
        { label: "100 条/页", value: "100" },
    ],
})

const stateOptions = createListCollection({
    items: [
        { label: "全部", value: "all" },
        { label: "活跃", value: "active" },
        { label: "已删除", value: "deleted" },
    ],
})

const categoryOptions = createListCollection({
    items: [
        { label: "全部分类", value: "" },
        { label: "理论 (T)", value: "T" },
        { label: "实验 (E)", value: "E" },
        { label: "未分类", value: "none" },
    ],
})

export default function AdminPapersPage() {
    const [data, setData] = useState<Paginated<AdminPaperSummary> | null>(null)
    const [query, setQuery] = useState<AdminPapersQuery>({ state: "deleted", limit: LIMIT_DEFAULT, offset: 0 })
    const [pageSize, setPageSize] = useState(LIMIT_DEFAULT)
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(false)

    // Detail drawer
    const [detailId, setDetailId] = useState<string | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)

    // Collect tags
    const [allTags, setAllTags] = useState<string[]>([])
    const tagOptions = useMemo(() => createListCollection({
        items: [
            { label: "全部标签", value: "" },
            ...allTags.map((t) => ({ label: t, value: t })),
        ],
    }), [allTags])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.adminGetPapers(query)
            setData(res)
        } catch (e) {
            toaster.error({ title: "加载失败", description: String(e) })
        } finally {
            setLoading(false)
        }
    }, [query])

    useEffect(() => { load() }, [load])

    // Load tags from questions
    useEffect(() => {
        api.getQuestions({ limit: 100 }).then((res) => {
            const tags = new Set<string>()
            res.items.forEach((q) => q.tags.forEach((t) => tags.add(t)))
            setAllTags([...tags].sort())
        }).catch(() => {})
    }, [])

    const handleSearch = () =>
        setQuery((prev) => ({ ...prev, q: search || undefined, offset: 0 }))

    const handleRestore = async (id: string) => {
        try {
            await api.adminRestorePaper(id)
            toaster.success({ title: "已恢复" })
            load()
        } catch (e) {
            toaster.error({ title: "恢复失败", description: String(e) })
        }
    }

    const openDetail = (id: string) => {
        setDetailId(id)
        setDetailOpen(true)
    }

    const page = Math.floor((query.offset ?? 0) / pageSize)
    const totalPages = data ? Math.ceil(data.total / pageSize) : 0

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

                <Select.Root
                    collection={categoryOptions}
                    size="sm"
                    width="140px"
                    value={query.category ? [query.category] : [""]}
                    onValueChange={(e) =>
                        setQuery((prev) => ({
                            ...prev,
                            category: e.value[0] || undefined,
                            offset: 0,
                        }))
                    }
                >
                    <Select.HiddenSelect />
                    <Select.Control>
                        <Select.Trigger>
                            <Select.ValueText placeholder="全部分类" />
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

                <Select.Root
                    collection={tagOptions}
                    size="sm"
                    width="140px"
                    value={query.tag ? [query.tag] : [""]}
                    onValueChange={(e) =>
                        setQuery((prev) => ({
                            ...prev,
                            tag: e.value[0] || undefined,
                            offset: 0,
                        }))
                    }
                >
                    <Select.HiddenSelect />
                    <Select.Control>
                        <Select.Trigger>
                            <Select.ValueText placeholder="全部标签" />
                        </Select.Trigger>
                        <Select.IndicatorGroup>
                            <Select.Indicator />
                        </Select.IndicatorGroup>
                    </Select.Control>
                    <Portal>
                        <Select.Positioner>
                            <Select.Content>
                                {tagOptions.items.map((item) => (
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
                            <Table.ColumnHeader>标题</Table.ColumnHeader>
                            <Table.ColumnHeader>描述</Table.ColumnHeader>
                            <Table.ColumnHeader>已删除</Table.ColumnHeader>
                            <Table.ColumnHeader>删除时间</Table.ColumnHeader>
                            <Table.ColumnHeader>操作</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {loading && (
                            <Table.Row>
                                <Table.Cell colSpan={5}><Text textAlign="center">加载中...</Text></Table.Cell>
                            </Table.Row>
                        )}
                        {!loading && data?.items.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={5}><Text textAlign="center" color="fg.muted">暂无数据</Text></Table.Cell>
                            </Table.Row>
                        )}
                        {data?.items.map((p) => (
                            <Table.Row key={p.paper_id}>
                                <Table.Cell fontWeight="medium">
                                    <Text
                                        as="button"
                                        color="blue.fg"
                                        _hover={{ textDecoration: "underline" }}
                                        onClick={() => openDetail(p.paper_id)}
                                        textAlign="left"
                                    >
                                        {p.title}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell>{p.description}</Table.Cell>
                                <Table.Cell>
                                    {p.is_deleted ? (
                                        <Badge colorPalette="red">已删除</Badge>
                                    ) : (
                                        <Badge colorPalette="green">活跃</Badge>
                                    )}
                                </Table.Cell>
                                <Table.Cell fontSize="xs" color="fg.muted">
                                    {p.deleted_at ? new Date(p.deleted_at).toLocaleString() : "—"}
                                </Table.Cell>
                                <Table.Cell>
                                    <HStack gap="1">
                                        <IconButton aria-label="查看详情" size="xs" variant="ghost" onClick={() => openDetail(p.paper_id)}>
                                            <LuEye />
                                        </IconButton>
                                        {p.is_deleted && (
                                            <Button size="xs" variant="outline" onClick={() => handleRestore(p.paper_id)}>
                                                <LuRotateCcw /> 恢复
                                            </Button>
                                        )}
                                    </HStack>
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
                        onClick={() => setQuery((p) => ({ ...p, offset: (p.offset ?? 0) - pageSize }))}>
                        <LuChevronLeft />
                    </IconButton>
                    <Text fontSize="sm">{page + 1} / {totalPages || 1}</Text>
                    <IconButton aria-label="next" size="xs" variant="outline" disabled={page + 1 >= totalPages}
                        onClick={() => setQuery((p) => ({ ...p, offset: (p.offset ?? 0) + pageSize }))}>
                        <LuChevronRight />
                    </IconButton>

                    <Select.Root
                        collection={PAGE_SIZE_OPTIONS}
                        size="xs"
                        width="120px"
                        value={[String(pageSize)]}
                        onValueChange={(e) => {
                            const v = Number(e.value[0]) || LIMIT_DEFAULT
                            setPageSize(v)
                            setQuery((p) => ({ ...p, limit: v, offset: 0 }))
                        }}
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
                                    {PAGE_SIZE_OPTIONS.items.map((item) => (
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
            </HStack>

            <AdminPaperDetailDrawer
                paperId={detailId}
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
            />
        </Stack>
    )
}
