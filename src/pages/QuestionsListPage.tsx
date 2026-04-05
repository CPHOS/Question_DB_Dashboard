import { useEffect, useState, useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import {
    Box,
    Button,
    Heading,
    HStack,
    Input,
    Table,
    Text,
    Badge,
    IconButton,
    Stack,
    Flex,
    Checkbox,
    Select,
    Portal,
    createListCollection,
} from "@chakra-ui/react"
import type { QuestionsQuery, QuestionSummary, Paginated } from "@/types"
import * as api from "@/lib/api"
import { useAuth } from "@/contexts/useAuth"
import { LuSearch, LuPlus, LuChevronLeft, LuChevronRight, LuDownload } from "react-icons/lu"
import { toaster } from "@/components/ui/toaster-instance"

const PAGE_SIZE_OPTIONS = createListCollection({
    items: [
        { label: "10 条/页", value: "10" },
        { label: "20 条/页", value: "20" },
        { label: "50 条/页", value: "50" },
        { label: "100 条/页", value: "100" },
    ],
})

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
    const [diffTag, setDiffTag] = useState("")
    const [diffMin, setDiffMin] = useState("")
    const [diffMax, setDiffMax] = useState("")

    // Collect unique tags from loaded data for the tag filter
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

    const handleSearch = () => {
        setQuery((prev) => ({
            ...prev,
            q: search || undefined,
            score_min: scoreMin ? Number(scoreMin) : undefined,
            score_max: scoreMax ? Number(scoreMax) : undefined,
            difficulty_tag: diffTag || undefined,
            difficulty_min: diffMin ? Number(diffMin) : undefined,
            difficulty_max: diffMax ? Number(diffMax) : undefined,
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

    const categoryLabel = (c: string) => {
        if (c === "T") return <Badge colorPalette="blue">理论</Badge>
        if (c === "E") return <Badge colorPalette="green">实验</Badge>
        return <Badge variant="outline">未分类</Badge>
    }

    const statusLabel = (s: string) => {
        if (s === "reviewed") return <Badge colorPalette="purple">已审</Badge>
        if (s === "used") return <Badge colorPalette="orange">已用</Badge>
        return <Badge variant="outline">无</Badge>
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
                <Input
                    placeholder="难度标签"
                    value={diffTag}
                    onChange={(e) => setDiffTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    maxW="120px"
                    size="sm"
                />
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

            {/* Table */}
            <Box overflowX="auto">
                <Table.Root size="sm" striped>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader w="40px">
                                <Checkbox.Root
                                    size="sm"
                                    checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                                    onCheckedChange={toggleAll}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control>
                                        <Checkbox.Indicator />
                                    </Checkbox.Control>
                                </Checkbox.Root>
                            </Table.ColumnHeader>
                            <Table.ColumnHeader>描述</Table.ColumnHeader>
                            <Table.ColumnHeader>分类</Table.ColumnHeader>
                            <Table.ColumnHeader>状态</Table.ColumnHeader>
                            <Table.ColumnHeader>分数</Table.ColumnHeader>
                            <Table.ColumnHeader>难度</Table.ColumnHeader>
                            <Table.ColumnHeader>命题人</Table.ColumnHeader>
                            <Table.ColumnHeader>创建时间</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {loading && (
                            <Table.Row>
                                <Table.Cell colSpan={8}><Text textAlign="center">加载中...</Text></Table.Cell>
                            </Table.Row>
                        )}
                        {!loading && data?.items.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={8}><Text textAlign="center" color="fg.muted">暂无数据</Text></Table.Cell>
                            </Table.Row>
                        )}
                        {data?.items.map((q) => (
                            <Table.Row key={q.question_id}>
                                <Table.Cell>
                                    <Checkbox.Root
                                        size="sm"
                                        checked={selected.has(q.question_id)}
                                        onCheckedChange={() => toggleSelect(q.question_id)}
                                    >
                                        <Checkbox.HiddenInput />
                                        <Checkbox.Control>
                                            <Checkbox.Indicator />
                                        </Checkbox.Control>
                                    </Checkbox.Root>
                                </Table.Cell>
                                <Table.Cell>
                                    <Link to={`/questions/${q.question_id}`}>
                                        <Text _hover={{ textDecoration: "underline" }} color="blue.fg" fontWeight="medium">
                                            {q.description}
                                        </Text>
                                    </Link>
                                </Table.Cell>
                                <Table.Cell>{categoryLabel(q.category)}</Table.Cell>
                                <Table.Cell>{statusLabel(q.status)}</Table.Cell>
                                <Table.Cell>{q.score ?? "—"}</Table.Cell>
                                <Table.Cell>
                                    {q.difficulty.human
                                        ? `${q.difficulty.human.score}/10`
                                        : "—"}
                                </Table.Cell>
                                <Table.Cell>{q.author || "—"}</Table.Cell>
                                <Table.Cell fontSize="xs" color="fg.muted">
                                    {new Date(q.created_at).toLocaleDateString()}
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>

            {/* Pagination */}
            <HStack justify="space-between">
                <Text fontSize="sm" color="fg.muted">
                    共 {data?.total ?? 0} 条
                </Text>
                <HStack>
                    <IconButton
                        aria-label="prev"
                        size="xs"
                        variant="outline"
                        disabled={page === 0}
                        onClick={() => setQuery((p) => ({ ...p, offset: (p.offset ?? 0) - pageSize }))}
                    >
                        <LuChevronLeft />
                    </IconButton>
                    <Text fontSize="sm">
                        {page + 1} / {totalPages || 1}
                    </Text>
                    <IconButton
                        aria-label="next"
                        size="xs"
                        variant="outline"
                        disabled={page + 1 >= totalPages}
                        onClick={() => setQuery((p) => ({ ...p, offset: (p.offset ?? 0) + pageSize }))}
                    >
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
        </Stack>
    )
}
