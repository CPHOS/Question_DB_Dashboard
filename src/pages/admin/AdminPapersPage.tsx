import { useEffect, useState, useCallback, useMemo } from "react"
import {
    Button,
    HStack,
    Input,
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
import { LuSearch, LuRotateCcw, LuEye } from "react-icons/lu"
import AdminPaperDetailDrawer from "./AdminPaperDetailDrawer"
import PaperTable from "@/components/PaperTable"
import Pagination from "@/components/Pagination"

const LIMIT_DEFAULT = 20

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
    const [createdAfter, setCreatedAfter] = useState("")
    const [createdBefore, setCreatedBefore] = useState("")
    const [updatedAfter, setUpdatedAfter] = useState("")
    const [updatedBefore, setUpdatedBefore] = useState("")

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

    // Load tags
    useEffect(() => {
        api.getQuestionTags().then((r) => setAllTags(r.tags)).catch(() => {})
    }, [])

    const handleSearch = () =>
        setQuery((prev) => ({
            ...prev,
            q: search || undefined,
            created_after: createdAfter || undefined,
            created_before: createdBefore || undefined,
            updated_after: updatedAfter || undefined,
            updated_before: updatedBefore || undefined,
            offset: 0,
        }))

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

            {/* Date range filters */}
            <HStack wrap="wrap" gap="2" align="center">
                <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">创建时间</Text>
                <Input value={createdAfter} onChange={(e) => { setCreatedAfter(e.target.value); setQuery((p) => ({ ...p, created_after: e.target.value || undefined, offset: 0 })) }}
                    maxW="160px" size="sm" type="date" />
                <Text fontSize="sm" color="fg.muted">~</Text>
                <Input value={createdBefore} onChange={(e) => { setCreatedBefore(e.target.value); setQuery((p) => ({ ...p, created_before: e.target.value || undefined, offset: 0 })) }}
                    maxW="160px" size="sm" type="date" />
                <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">更新时间</Text>
                <Input value={updatedAfter} onChange={(e) => { setUpdatedAfter(e.target.value); setQuery((p) => ({ ...p, updated_after: e.target.value || undefined, offset: 0 })) }}
                    maxW="160px" size="sm" type="date" />
                <Text fontSize="sm" color="fg.muted">~</Text>
                <Input value={updatedBefore} onChange={(e) => { setUpdatedBefore(e.target.value); setQuery((p) => ({ ...p, updated_before: e.target.value || undefined, offset: 0 })) }}
                    maxW="160px" size="sm" type="date" />
            </HStack>

            <PaperTable
                papers={data?.items ?? []}
                loading={loading}
                columns={["title", "description"]}
                titleRender="button"
                onTitleClick={openDetail}
                extraColumns={[
                    {
                        header: "已删除",
                        render: (p) => {
                            const ap = p as AdminPaperSummary
                            return ap.is_deleted
                                ? <Badge colorPalette="red">已删除</Badge>
                                : <Badge colorPalette="green">活跃</Badge>
                        },
                    },
                    {
                        header: "删除时间",
                        render: (p) => {
                            const ap = p as AdminPaperSummary
                            return (
                                <Text fontSize="xs" color="fg.muted">
                                    {ap.deleted_at ? new Date(ap.deleted_at).toLocaleString() : "—"}
                                </Text>
                            )
                        },
                    },
                    {
                        header: "操作",
                        render: (p) => {
                            const ap = p as AdminPaperSummary
                            return (
                                <HStack gap="1">
                                    <IconButton aria-label="查看详情" size="xs" variant="ghost" onClick={() => openDetail(p.paper_id)}>
                                        <LuEye />
                                    </IconButton>
                                    {ap.is_deleted && (
                                        <Button size="xs" variant="outline" onClick={() => handleRestore(p.paper_id)}>
                                            <LuRotateCcw /> 恢复
                                        </Button>
                                    )}
                                </HStack>
                            )
                        },
                    },
                ]}
            />

            <Pagination
                page={page}
                totalPages={totalPages}
                total={data?.total ?? 0}
                pageSize={pageSize}
                onPrev={() => setQuery((p) => ({ ...p, offset: (p.offset ?? 0) - pageSize }))}
                onNext={() => setQuery((p) => ({ ...p, offset: (p.offset ?? 0) + pageSize }))}
                onPageSizeChange={(v) => {
                    setPageSize(v)
                    setQuery((p) => ({ ...p, limit: v, offset: 0 }))
                }}
            />

            <AdminPaperDetailDrawer
                paperId={detailId}
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
            />
        </Stack>
    )
}
