import { useEffect, useState, useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import {
    Button,
    Heading,
    HStack,
    Input,
    Stack,
    Flex,
    Select,
    Portal,
    Text,
    Textarea,
    createListCollection,
} from "@chakra-ui/react"
import type { QuestionsQuery, QuestionSummary, Paginated, TagFilter } from "@/types"
import * as api from "@/lib/api"
import { useAuth } from "@/contexts/useAuth"
import { LuSearch, LuPlus, LuDownload } from "react-icons/lu"
import { toaster } from "@/components/ui/toaster-instance"
import QuestionTable from "@/components/QuestionTable"
import Pagination from "@/components/Pagination"
import TagInput from "@/components/TagInput"

const LIMIT_DEFAULT = 20

type Token =
    | { type: "lparen" | "rparen" }
    | { type: "and" | "or" | "not" }
    | { type: "tag"; value: string }

function tokenizeTagFilterExpression(input: string): Token[] {
    const tokens: Token[] = []
    let i = 0

    while (i < input.length) {
        const ch = input[i]
        if (/\s/.test(ch)) {
            i += 1
            continue
        }
        if (ch === "(") {
            tokens.push({ type: "lparen" })
            i += 1
            continue
        }
        if (ch === ")") {
            tokens.push({ type: "rparen" })
            i += 1
            continue
        }
        if (ch === "!") {
            tokens.push({ type: "not" })
            i += 1
            continue
        }
        if (input.startsWith("&&", i)) {
            tokens.push({ type: "and" })
            i += 2
            continue
        }
        if (input.startsWith("||", i)) {
            tokens.push({ type: "or" })
            i += 2
            continue
        }
        if (ch === '"' || ch === "'") {
            const quote = ch
            i += 1
            let value = ""
            while (i < input.length) {
                const current = input[i]
                if (current === "\\") {
                    if (i + 1 >= input.length) break
                    value += input[i + 1]
                    i += 2
                    continue
                }
                if (current === quote) break
                value += current
                i += 1
            }
            if (i >= input.length || input[i] !== quote) {
                throw new Error("标签字符串缺少结束引号")
            }
            if (!value.trim()) {
                throw new Error("标签不能为空")
            }
            tokens.push({ type: "tag", value: value.trim() })
            i += 1
            continue
        }

        let value = ""
        while (i < input.length) {
            const current = input[i]
            if (/\s/.test(current) || current === "(" || current === ")" || current === "!" || input.startsWith("&&", i) || input.startsWith("||", i)) {
                break
            }
            value += current
            i += 1
        }
        const keyword = value.toLowerCase()
        if (keyword === "and") tokens.push({ type: "and" })
        else if (keyword === "or") tokens.push({ type: "or" })
        else if (keyword === "not") tokens.push({ type: "not" })
        else if (value.trim()) tokens.push({ type: "tag", value: value.trim() })
        else throw new Error("无法解析高级标签过滤表达式")
    }

    return tokens
}

function parseTagFilterExpression(input: string): TagFilter {
    const tokens = tokenizeTagFilterExpression(input)
    if (tokens.length === 0) {
        throw new Error("表达式不能为空")
    }

    let index = 0

    const current = () => tokens[index]
    const match = (type: Token["type"]) => current()?.type === type

    const collapse = (type: "and" | "or", children: TagFilter[]): TagFilter => {
        const flattened = children.flatMap((child) => child.type === type ? child.children : [child])
        return flattened.length === 1 ? flattened[0] : { type, children: flattened }
    }

    const parsePrimary = (): TagFilter => {
        const token = current()
        if (!token) throw new Error("表达式意外结束")
        if (token.type === "tag") {
            index += 1
            return { type: "tag", tag: token.value }
        }
        if (token.type === "lparen") {
            index += 1
            const expr = parseOr()
            if (!match("rparen")) throw new Error("缺少右括号 )")
            index += 1
            return expr
        }
        throw new Error("这里应为标签或左括号")
    }

    const parseUnary = (): TagFilter => {
        if (match("not")) {
            index += 1
            return { type: "not", child: parseUnary() }
        }
        return parsePrimary()
    }

    const parseAnd = (): TagFilter => {
        const children = [parseUnary()]
        while (match("and")) {
            index += 1
            children.push(parseUnary())
        }
        return collapse("and", children)
    }

    const parseOr = (): TagFilter => {
        const children = [parseAnd()]
        while (match("or")) {
            index += 1
            children.push(parseAnd())
        }
        return collapse("or", children)
    }

    const result = parseOr()
    if (index < tokens.length) {
        throw new Error("存在未消费的多余内容")
    }
    return result
}

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
    const canCreate = user?.role === "user" || user?.role === "leader" || user?.role === "admin"
    const isAssignedReviewer = user?.role === "user" || user?.role === "leader"

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
    const [authorFilter, setAuthorFilter] = useState("")
    const [reviewerFilter, setReviewerFilter] = useState<string[]>([])
    const [createdAfter, setCreatedAfter] = useState("")
    const [createdBefore, setCreatedBefore] = useState("")
    const [updatedAfter, setUpdatedAfter] = useState("")
    const [updatedBefore, setUpdatedBefore] = useState("")
    const [showAdvancedTagFilter, setShowAdvancedTagFilter] = useState(false)
    const [advancedTagFilter, setAdvancedTagFilter] = useState("")
    const [appliedAdvancedTagFilter, setAppliedAdvancedTagFilter] = useState("")

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
            const parsedTagFilter = appliedAdvancedTagFilter.trim()
                ? parseTagFilterExpression(appliedAdvancedTagFilter)
                : undefined
            const res = parsedTagFilter
                ? await api.searchQuestions({ ...query, tag_filter: parsedTagFilter })
                : await api.getQuestions(query)
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
    }, [appliedAdvancedTagFilter, query])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        api.getQuestionDifficultyTags().then((r) => {
            if (r.difficulty_tags.length > 0) setAllDiffTags(r.difficulty_tags)
        }).catch(() => {})
    }, [])

    const handleSearch = () => {
        if (advancedTagFilter.trim()) {
            try {
                parseTagFilterExpression(advancedTagFilter)
            } catch (e) {
                toaster.error({
                    title: "高级标签过滤表达式错误",
                    description: e instanceof Error ? e.message : "请输入合法的高级标签过滤表达式",
                })
                return
            }
        }
        setAppliedAdvancedTagFilter(advancedTagFilter)
        setQuery((prev) => ({
            ...prev,
            q: search || undefined,
            paper_id: paperIdFilter.trim() || undefined,
            author: authorFilter.trim() || undefined,
            reviewer: reviewerFilter.length > 0 ? reviewerFilter.join(",") : undefined,
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
                    {isAssignedReviewer && (
                        <Button
                            size="sm"
                            variant={query.assigned_reviewer_id ? "solid" : "outline"}
                            colorPalette="purple"
                            onClick={() =>
                                setQuery((prev) => ({
                                    ...prev,
                                    assigned_reviewer_id: prev.assigned_reviewer_id ? undefined : user!.user_id,
                                    offset: 0,
                                }))
                            }
                        >
                            我的审阅
                        </Button>
                    )}
                    {canCreate && (
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
            <Stack gap="3" p="3" borderWidth="1px" borderRadius="md">
                {/* Row 1: Search + Category + Tag + Search button */}
                <HStack wrap="wrap" gap="2" align="center">
                    <Input
                        placeholder="搜索题目描述..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        maxW="260px"
                        size="sm"
                    />

                    <Select.Root
                        collection={categoryOptions}
                        size="sm"
                        width="130px"
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
                        width="130px"
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

                    <Button size="sm" onClick={handleSearch} colorPalette="blue" variant="solid">
                        <LuSearch /> 搜索
                    </Button>
                    <Button
                        size="sm"
                        variant={showAdvancedTagFilter ? "solid" : "outline"}
                        onClick={() => setShowAdvancedTagFilter((v) => !v)}
                    >
                        高级 Tag Filter
                    </Button>
                </HStack>

                {showAdvancedTagFilter && (
                    <Stack gap="2">
                        <Textarea
                            value={advancedTagFilter}
                            onChange={(e) => setAdvancedTagFilter(e.target.value)}
                            placeholder={'例如：mechanics or (contest and not deprecated)\n也支持：optics && (final || review) && !deprecated\n带空格标签可写成："tag with spaces"'}
                            size="sm"
                            minH="120px"
                            fontFamily="mono"
                            onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSearch()
                            }}
                        />
                        <Text fontSize="sm" color="fg.muted">
                            支持 `and` / `or` / `not`、`&&` / `||` / `!` 与括号嵌套。留空时不启用高级筛选。
                        </Text>
                    </Stack>
                )}

                {/* Row 2: Author + Reviewer (inline tags) + Paper ID */}
                <HStack wrap="wrap" gap="2" align="center">
                    <Input
                        placeholder="命题人"
                        value={authorFilter}
                        onChange={(e) => setAuthorFilter(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        maxW="140px"
                        size="sm"
                    />
                    <TagInput
                        value={reviewerFilter}
                        onChange={setReviewerFilter}
                        placeholder="审题人（回车添加）"
                        inline
                    />
                    <Input
                        placeholder="试卷 ID"
                        value={paperIdFilter}
                        onChange={(e) => setPaperIdFilter(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        maxW="260px"
                        size="sm"
                    />
                </HStack>

                {/* Row 3: Score + Difficulty */}
                <HStack wrap="wrap" gap="2" align="center">
                    <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">分数</Text>
                    <Input
                        placeholder="最低"
                        value={scoreMin}
                        onChange={(e) => setScoreMin(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        maxW="80px"
                        size="sm"
                        type="number"
                    />
                    <Text fontSize="sm" color="fg.muted">~</Text>
                    <Input
                        placeholder="最高"
                        value={scoreMax}
                        onChange={(e) => setScoreMax(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        maxW="80px"
                        size="sm"
                        type="number"
                    />
                    <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap" ml="2">难度</Text>
                    <Select.Root
                        collection={diffTagOptions}
                        size="sm"
                        width="120px"
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
                        placeholder="最低"
                        value={diffMin}
                        onChange={(e) => setDiffMin(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        maxW="80px"
                        size="sm"
                        type="number"
                    />
                    <Text fontSize="sm" color="fg.muted">~</Text>
                    <Input
                        placeholder="最高"
                        value={diffMax}
                        onChange={(e) => setDiffMax(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        maxW="80px"
                        size="sm"
                        type="number"
                    />
                </HStack>

                {/* Row 4: Date ranges */}
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
                    <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap" ml="2">更新时间</Text>
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
            </Stack>

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
