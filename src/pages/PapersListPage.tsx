import { useEffect, useState, useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import {
    Button,
    Heading,
    HStack,
    Input,
    Text,
    IconButton,
    Stack,
    Flex,
    Select,
    Portal,
    createListCollection,
} from "@chakra-ui/react"
import type { PapersQuery, PaperSummary, Paginated } from "@/types"
import * as api from "@/lib/api"
import { useAuth } from "@/contexts/useAuth"
import { LuSearch, LuPlus, LuDownload } from "react-icons/lu"
import { toaster } from "@/components/ui/toaster-instance"
import PaperTable from "@/components/PaperTable"
import Pagination from "@/components/Pagination"

const LIMIT_DEFAULT = 20

const categoryOptions = createListCollection({
    items: [
        { label: "全部分类", value: "" },
        { label: "理论 (T)", value: "T" },
        { label: "实验 (E)", value: "E" },
        { label: "未分类", value: "none" },
    ],
})

export default function PapersListPage() {
    const { user } = useAuth()
    const canCreate = user?.role === "leader" || user?.role === "admin"

    const [data, setData] = useState<Paginated<PaperSummary> | null>(null)
    const [query, setQuery] = useState<PapersQuery>({ limit: LIMIT_DEFAULT, offset: 0 })
    const [pageSize, setPageSize] = useState(LIMIT_DEFAULT)
    const [search, setSearch] = useState("")
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [bundling, setBundling] = useState(false)

    const [allTags, setAllTags] = useState<string[]>([])
    const [createdAfter, setCreatedAfter] = useState("")
    const [createdBefore, setCreatedBefore] = useState("")
    const [updatedAfter, setUpdatedAfter] = useState("")
    const [updatedBefore, setUpdatedBefore] = useState("")
    const tagOptions = useMemo(() => createListCollection({
        items: [
            { label: "全部标签", value: "" },
            ...allTags.map((t) => ({ label: t, value: t })),
        ],
    }), [allTags])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.getPapers(query)
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

    const handleSearch = () => {
        setQuery((prev) => ({
            ...prev,
            q: search || undefined,
            created_after: createdAfter || undefined,
            created_before: createdBefore || undefined,
            updated_after: updatedAfter || undefined,
            updated_before: updatedBefore || undefined,
            offset: 0,
        }))
    }

    const page = Math.floor((query.offset ?? 0) / pageSize)
    const totalPages = data ? Math.ceil(data.total / pageSize) : 0

    const handleBundle = async () => {
        if (selected.size === 0) return
        setBundling(true)
        try {
            const blob = await api.bundlePapers([...selected])
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = "papers_bundle.zip"
            a.click()
            URL.revokeObjectURL(url)
        } catch (e) {
            toaster.error({ title: "打包失败", description: String(e) })
        } finally {
            setBundling(false)
        }
    }

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const allOnPageSelected = data?.items.length
        ? data.items.every((p) => selected.has(p.paper_id))
        : false
    const someOnPageSelected = data?.items.some((p) => selected.has(p.paper_id)) ?? false

    const toggleAll = () => {
        if (!data) return
        setSelected((prev) => {
            const next = new Set(prev)
            if (allOnPageSelected) {
                data.items.forEach((p) => next.delete(p.paper_id))
            } else {
                data.items.forEach((p) => next.add(p.paper_id))
            }
            return next
        })
    }

    return (
        <Stack gap="4">
            <Flex justify="space-between" align="center" wrap="wrap" gap="3">
                <Heading size="xl">试卷管理</Heading>
                <HStack>
                    {canCreate && (
                        <Button asChild colorPalette="blue" size="sm">
                            <Link to="/papers/new"><LuPlus /> 新建试卷</Link>
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBundle}
                        disabled={selected.size === 0}
                        loading={bundling}
                    >
                        <LuDownload /> 打包下载{selected.size > 0 ? ` (${selected.size})` : ""}
                    </Button>
                </HStack>
            </Flex>

            <HStack wrap="wrap" gap="2">
                <Input
                    placeholder="搜索试卷..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    maxW="300px"
                    size="sm"
                />
                <IconButton aria-label="search" size="sm" onClick={handleSearch}>
                    <LuSearch />
                </IconButton>

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
                selectable
                selected={selected}
                onToggle={toggleSelect}
                allSelected={allOnPageSelected}
                someSelected={someOnPageSelected}
                onToggleAll={toggleAll}
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
        </Stack>
    )
}
