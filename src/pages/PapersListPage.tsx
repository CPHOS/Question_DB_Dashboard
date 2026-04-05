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
    IconButton,
    Stack,
    Flex,
    Checkbox,
    Select,
    Portal,
    createListCollection,
} from "@chakra-ui/react"
import type { PapersQuery, PaperSummary, Paginated } from "@/types"
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

export default function PapersListPage() {
    const { user } = useAuth()
    const canEdit = user?.role === "editor" || user?.role === "admin"

    const [data, setData] = useState<Paginated<PaperSummary> | null>(null)
    const [query, setQuery] = useState<PapersQuery>({ limit: LIMIT_DEFAULT, offset: 0 })
    const [pageSize, setPageSize] = useState(LIMIT_DEFAULT)
    const [search, setSearch] = useState("")
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [bundling, setBundling] = useState(false)

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
            const res = await api.getPapers(query)
            setData(res)
        } catch (e) {
            toaster.error({ title: "加载失败", description: String(e) })
        } finally {
            setLoading(false)
        }
    }, [query])

    useEffect(() => { load() }, [load])

    // Load tags from questions for the tag filter
    useEffect(() => {
        api.getQuestions({ limit: 100 }).then((res) => {
            const tags = new Set<string>()
            res.items.forEach((q) => q.tags.forEach((t) => tags.add(t)))
            setAllTags([...tags].sort())
        }).catch(() => {})
    }, [])

    const handleSearch = () => {
        setQuery((prev) => ({ ...prev, q: search || undefined, offset: 0 }))
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
                    {canEdit && (
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
                            <Table.ColumnHeader>标题</Table.ColumnHeader>
                            <Table.ColumnHeader>副标题</Table.ColumnHeader>
                            <Table.ColumnHeader>描述</Table.ColumnHeader>
                            <Table.ColumnHeader>创建时间</Table.ColumnHeader>
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
                                <Table.Cell>
                                    <Checkbox.Root
                                        size="sm"
                                        checked={selected.has(p.paper_id)}
                                        onCheckedChange={() => toggleSelect(p.paper_id)}
                                    >
                                        <Checkbox.HiddenInput />
                                        <Checkbox.Control>
                                            <Checkbox.Indicator />
                                        </Checkbox.Control>
                                    </Checkbox.Root>
                                </Table.Cell>
                                <Table.Cell>
                                    <Link to={`/papers/${p.paper_id}`}>
                                        <Text _hover={{ textDecoration: "underline" }} color="blue.fg" fontWeight="medium">
                                            {p.title}
                                        </Text>
                                    </Link>
                                </Table.Cell>
                                <Table.Cell>{p.subtitle}</Table.Cell>
                                <Table.Cell>{p.description}</Table.Cell>
                                <Table.Cell fontSize="xs" color="fg.muted">
                                    {new Date(p.created_at).toLocaleDateString()}
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>

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
                    <Text fontSize="sm">{page + 1} / {totalPages || 1}</Text>
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
