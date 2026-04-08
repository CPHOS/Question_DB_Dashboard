import { useEffect, useState, useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import {
    Button,
    Heading,
    HStack,
    Input,
    IconButton,
    Stack,
    Flex,
    Select,
    Portal,
    Text,
    createListCollection,
} from "@chakra-ui/react"
import type { QuestionsQuery, QuestionSummary, Paginated } from "@/types"
import * as api from "@/lib/api"
import { useAuth } from "@/contexts/useAuth"
import { LuSearch, LuPlus, LuDownload } from "react-icons/lu"
import { toaster } from "@/components/ui/toaster-instance"
import QuestionTable from "@/components/QuestionTable"
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

export default function QuestionsListPage() {
    const { user } = useAuth()
    const canEdit = user?.role === "editor" || user?.role === "admin"

    const [data, setData] = useState<Paginated<QuestionSummary> | null>(null)
    const [query, setQuery] = useState<QuestionsQuery>({ limit: LIMIT_DEFAULT, offset: 0 })
    const [pageSize, setPageSize] = useState(LIMIT_DEFAULT)
    const [search, setSearch] = useState("")
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [bundling, setBundling] = useState(false)

    // Additional filter states
    const [scoreMin, setScoreMin] = useState("")
    const [scoreMax, setScoreMax] = useState("")
    const [diffTag, setDiffTag] = useState("human")
    const [diffMin, setDiffMin] = useState("")
    const [diffMax, setDiffMax] = useState("")
    const [paperIdFilter, setPaperIdFilter] = useState("")
    const [createdAfter, setCreatedAfter] = useState("")
    const [createdBefore, setCreatedBefore] = useState("")
    const [updatedAfter, setUpdatedAfter] = useState("")
    const [updatedBefore, setUpdatedBefore] = useState("")

    // Collect unique tags from loaded data for the tag filter
    const [allTags, setAllTags] = useState<string[]>([])
    const [allDiffTags, setAllDiffTags] = useState<string[]>(["human"])

    const tagOptions = useMemo(() => createListCollection({
        items: [
            { label: "全部标签", value: "" },
            ...allTags.map((t) => ({ label: t, value: t })),
        ],
    }), [allTags])

    const diffTagOptions = useMemo(() => createListCollection({
        items: allDiffTags.map((t) => ({ label: t, value: t })),
    }), [allDiffTags])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.getQuestions(query)
            setData(res)
            // collect tags
            const tags = new Set<string>()
            res.items.forEach((q) => q.tags.forEach((t) => tags.add(t)))
            setAllTags((prev) => {
                const merged = new Set([...prev, ...tags])
                return [...merged].sort()
            })
        } catch (e) {
            toaster.error({ title: "加载失败", description: String(e) })
        } finally {
            setLoading(false)
        }
    }, [query])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        api.getQuestionDifficultyTags().then((r) => {
            if (r.difficulty_tags.length > 0) setAllDiffTags(r.difficulty_tags)
        }).catch(() => {})
    }, [])

    const handleSearch = () => {
        setQuery((prev) => ({
            ...prev,
            q: search || undefined,
            paper_id: paperIdFilter.trim() || undefined,
            score_min: scoreMin ? Number(scoreMin) : undefined,
            score_max: scoreMax ? Number(scoreMax) : undefined,
            difficulty_tag: (diffMin || diffMax) ? (diffTag || "human") : undefined,
            difficulty_min: diffMin ? Number(diffMin) : undefined,
            difficulty_max: diffMax ? Number(diffMax) : undefined,
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
            const blob = await api.bundleQuestions([...selected])
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = "questions_bundle.zip"
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
        ? data.items.every((q) => selected.has(q.question_id))
        : false
    const someOnPageSelected = data?.items.some((q) => selected.has(q.question_id)) ?? false

    const toggleAll = () => {
        if (!data) return
        setSelected((prev) => {
            const next = new Set(prev)
            if (allOnPageSelected) {
                data.items.forEach((q) => next.delete(q.question_id))
            } else {
                data.items.forEach((q) => next.add(q.question_id))
            }
            return next
        })
    }

    return (
        <Stack gap="4">
            <Flex justify="space-between" align="center" wrap="wrap" gap="3">
                <Heading size="xl">题目管理</Heading>
                <HStack>
                    {canEdit && (
                        <Button asChild colorPalette="blue" size="sm">
                            <Link to="/questions/new"><LuPlus /> 新建题目</Link>
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

            {/* Filters */}
            <HStack wrap="wrap" gap="2">
                <Input
                    placeholder="搜索题目描述..."
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

            {/* Advanced filters */}
            <HStack wrap="wrap" gap="2">
                <Input
                    placeholder="试卷 ID"
                    value={paperIdFilter}
                    onChange={(e) => setPaperIdFilter(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    maxW="280px"
                    size="sm"
                />
                <Input
                    placeholder="最低分数"
                    value={scoreMin}
                    onChange={(e) => setScoreMin(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    maxW="100px"
                    size="sm"
                    type="number"
                />
                <Input
                    placeholder="最高分数"
                    value={scoreMax}
                    onChange={(e) => setScoreMax(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    maxW="100px"
                    size="sm"
                    type="number"
                />
                <Select.Root
                    collection={diffTagOptions}
                    size="sm"
                    width="140px"
                    value={[diffTag]}
                    onValueChange={(e) => setDiffTag(e.value[0] || "human")}
                >
                    <Select.HiddenSelect />
                    <Select.Control>
                        <Select.Trigger>
                            <Select.ValueText placeholder="难度标签" />
                        </Select.Trigger>
                        <Select.IndicatorGroup>
                            <Select.Indicator />
                        </Select.IndicatorGroup>
                    </Select.Control>
                    <Portal>
                        <Select.Positioner>
                            <Select.Content>
                                {diffTagOptions.items.map((item) => (
                                    <Select.Item item={item} key={item.value}>
                                        {item.label}
                                        <Select.ItemIndicator />
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Positioner>
                    </Portal>
                </Select.Root>
                <Input
                    placeholder="最低难度"
                    value={diffMin}
                    onChange={(e) => setDiffMin(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    maxW="100px"
                    size="sm"
                    type="number"
                />
                <Input
                    placeholder="最高难度"
                    value={diffMax}
                    onChange={(e) => setDiffMax(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    maxW="100px"
                    size="sm"
                    type="number"
                />
            </HStack>

            {/* Date range filters */}
            <HStack wrap="wrap" gap="2" align="center">
                <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">创建时间</Text>
                <Input
                    value={createdAfter}
                    onChange={(e) => { setCreatedAfter(e.target.value); setQuery((p) => ({ ...p, created_after: e.target.value || undefined, offset: 0 })) }}
                    maxW="160px"
                    size="sm"
                    type="date"
                />
                <Text fontSize="sm" color="fg.muted">~</Text>
                <Input
                    value={createdBefore}
                    onChange={(e) => { setCreatedBefore(e.target.value); setQuery((p) => ({ ...p, created_before: e.target.value || undefined, offset: 0 })) }}
                    maxW="160px"
                    size="sm"
                    type="date"
                />
                <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">更新时间</Text>
                <Input
                    value={updatedAfter}
                    onChange={(e) => { setUpdatedAfter(e.target.value); setQuery((p) => ({ ...p, updated_after: e.target.value || undefined, offset: 0 })) }}
                    maxW="160px"
                    size="sm"
                    type="date"
                />
                <Text fontSize="sm" color="fg.muted">~</Text>
                <Input
                    value={updatedBefore}
                    onChange={(e) => { setUpdatedBefore(e.target.value); setQuery((p) => ({ ...p, updated_before: e.target.value || undefined, offset: 0 })) }}
                    maxW="160px"
                    size="sm"
                    type="date"
                />
            </HStack>

            {/* Table */}
            <QuestionTable
                questions={data?.items ?? []}
                loading={loading}
                selectable
                selected={selected}
                onToggle={toggleSelect}
                allSelected={allOnPageSelected}
                someSelected={someOnPageSelected}
                onToggleAll={toggleAll}
                difficultyTag={diffTag}
            />

            {/* Pagination */}
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
