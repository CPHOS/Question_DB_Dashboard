import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
    Box,
    HStack,
    Input,
    Text,
    Badge,
    IconButton,
    Separator,
    Flex,
    Card,
    Stack,
    Heading,
    Select,
    Portal,
    createListCollection,
} from "@chakra-ui/react"
import type { QuestionSummary, Paginated } from "@/types"
import * as api from "@/lib/api"
import QuestionTable from "./QuestionTable"
import Pagination from "./Pagination"
import { LuSearch, LuGripVertical, LuX, LuArrowUp, LuArrowDown } from "react-icons/lu"
import { CategoryBadgeLabel } from "./CategoryBadge"

const categoryOptions = createListCollection({
    items: [
        { label: "全部分类", value: "" },
        { label: "理论 (T)", value: "T" },
        { label: "实验 (E)", value: "E" },
        { label: "未分类", value: "none" },
    ],
})

interface Props {
    selectedQuestions: QuestionSummary[]
    onSelectedChange: (questions: QuestionSummary[]) => void
    showAdvancedFilters?: boolean
    selectedLabel?: string
    pickerLabel?: string
}

const LIMIT = 10

export default function QuestionPicker({
    selectedQuestions,
    onSelectedChange,
    showAdvancedFilters = false,
    selectedLabel = "已选题目顺序",
    pickerLabel = "题库",
}: Props) {
    const [questions, setQuestions] = useState<Paginated<QuestionSummary> | null>(null)
    const [qSearch, setQSearch] = useState("")
    const [qOffset, setQOffset] = useState(0)
    const [qCategory, setQCategory] = useState("")
    const [qTag, setQTag] = useState("")
    const [qScoreMin, setQScoreMin] = useState("")
    const [qScoreMax, setQScoreMax] = useState("")
    const [qDiffTag, setQDiffTag] = useState("human")
    const [qDiffMin, setQDiffMin] = useState("")
    const [qDiffMax, setQDiffMax] = useState("")

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

    const dragItem = useRef<number | null>(null)
    const dragOverItem = useRef<number | null>(null)

    const loadQuestions = useCallback(async () => {
        try {
            const res = await api.getQuestions({
                q: qSearch || undefined,
                category: qCategory || undefined,
                tag: qTag || undefined,
                score_min: qScoreMin ? Number(qScoreMin) : undefined,
                score_max: qScoreMax ? Number(qScoreMax) : undefined,
                difficulty_tag: qDiffTag || undefined,
                difficulty_min: qDiffMin ? Number(qDiffMin) : undefined,
                difficulty_max: qDiffMax ? Number(qDiffMax) : undefined,
                limit: LIMIT,
                offset: qOffset,
            })
            setQuestions(res)
            const tags = new Set<string>()
            res.items.forEach((q) => q.tags.forEach((t) => tags.add(t)))
            setAllTags((prev) => {
                const merged = new Set([...prev, ...tags])
                return [...merged].sort()
            })
        } catch { /* ignore */ }
    }, [qSearch, qOffset, qCategory, qTag, qScoreMin, qScoreMax, qDiffTag, qDiffMin, qDiffMax])

    useEffect(() => { loadQuestions() }, [loadQuestions])

    useEffect(() => {
        api.getQuestionDifficultyTags().then((r) => {
            if (r.difficulty_tags.length > 0) setAllDiffTags(r.difficulty_tags)
        }).catch(() => {})
    }, [])

    const selectedIds = selectedQuestions.map((q) => q.question_id)

    const toggleQuestion = (q: QuestionSummary) => {
        if (selectedQuestions.some((s) => s.question_id === q.question_id)) {
            onSelectedChange(selectedQuestions.filter((s) => s.question_id !== q.question_id))
        } else {
            onSelectedChange([...selectedQuestions, q])
        }
    }

    const removeSelected = (id: string) => {
        onSelectedChange(selectedQuestions.filter((q) => q.question_id !== id))
    }

    const moveItem = (from: number, to: number) => {
        const next = [...selectedQuestions]
        const [item] = next.splice(from, 1)
        next.splice(to, 0, item)
        onSelectedChange(next)
    }

    const handleDragStart = (idx: number) => { dragItem.current = idx }
    const handleDragEnter = (idx: number) => { dragOverItem.current = idx }
    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            moveItem(dragItem.current, dragOverItem.current)
        }
        dragItem.current = null
        dragOverItem.current = null
    }

    const qPage = Math.floor(qOffset / LIMIT)
    const qTotalPages = questions ? Math.ceil(questions.total / LIMIT) : 0

    return (
        <>
            {/* Selected questions - sortable list */}
            <Box>
                <Heading size="sm" mb="2">{selectedLabel} ({selectedQuestions.length})</Heading>
                {selectedQuestions.length === 0 ? (
                    <Card.Root variant="outline">
                        <Card.Body py="6">
                            <Text textAlign="center" color="fg.muted" fontSize="sm">
                                从下方题库中选择题目，选中后可在此处拖拽排序
                            </Text>
                        </Card.Body>
                    </Card.Root>
                ) : (
                    <Stack gap="1">
                        {selectedQuestions.map((q, idx) => (
                            <Card.Root
                                key={q.question_id}
                                size="sm"
                                variant="outline"
                                draggable
                                onDragStart={() => handleDragStart(idx)}
                                onDragEnter={() => handleDragEnter(idx)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e: React.DragEvent) => e.preventDefault()}
                                cursor="grab"
                                _hover={{ borderColor: "blue.300", bg: "bg.subtle" }}
                            >
                                <Card.Body py="2" px="3">
                                    <Flex align="center" gap="2">
                                        <Box color="fg.muted" cursor="grab"><LuGripVertical /></Box>
                                        <Badge size="sm" variant="solid" colorPalette="blue" minW="24px" textAlign="center">
                                            {idx + 1}
                                        </Badge>
                                        <Text fontSize="sm" flex="1" truncate>{q.description}</Text>
                                        {q.category !== "none" && (
                                            <CategoryBadgeLabel value={q.category} />
                                        )}
                                        {q.score != null && (
                                            <Badge size="sm" variant="outline">{q.score}分</Badge>
                                        )}
                                        <HStack gap="0">
                                            <IconButton aria-label="上移" size="2xs" variant="ghost"
                                                disabled={idx === 0} onClick={() => moveItem(idx, idx - 1)}>
                                                <LuArrowUp />
                                            </IconButton>
                                            <IconButton aria-label="下移" size="2xs" variant="ghost"
                                                disabled={idx === selectedQuestions.length - 1}
                                                onClick={() => moveItem(idx, idx + 1)}>
                                                <LuArrowDown />
                                            </IconButton>
                                            <IconButton aria-label="移除" size="2xs" variant="ghost"
                                                colorPalette="red" onClick={() => removeSelected(q.question_id)}>
                                                <LuX />
                                            </IconButton>
                                        </HStack>
                                    </Flex>
                                </Card.Body>
                            </Card.Root>
                        ))}
                    </Stack>
                )}
            </Box>

            <Separator />

            {/* Question picker */}
            <Box>
                <Heading size="sm" mb="2">{pickerLabel}</Heading>
                <HStack mb="2" gap="2" wrap="wrap">
                    <Input
                        placeholder="搜索题目..."
                        value={qSearch}
                        onChange={(e) => setQSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQOffset(0) } }}
                        size="sm"
                        maxW="200px"
                    />
                    <IconButton aria-label="search" size="sm" onClick={() => setQOffset(0)}>
                        <LuSearch />
                    </IconButton>

                    {showAdvancedFilters && (
                        <>
                            <Select.Root collection={categoryOptions} size="sm" width="130px"
                                value={qCategory ? [qCategory] : [""]}
                                onValueChange={(e) => { setQCategory(e.value[0] || ""); setQOffset(0) }}>
                                <Select.HiddenSelect />
                                <Select.Control>
                                    <Select.Trigger><Select.ValueText placeholder="全部分类" /></Select.Trigger>
                                    <Select.IndicatorGroup><Select.Indicator /></Select.IndicatorGroup>
                                </Select.Control>
                                <Portal><Select.Positioner><Select.Content>
                                    {categoryOptions.items.map((item) => (
                                        <Select.Item item={item} key={item.value}>{item.label}<Select.ItemIndicator /></Select.Item>
                                    ))}
                                </Select.Content></Select.Positioner></Portal>
                            </Select.Root>

                            <Select.Root collection={tagOptions} size="sm" width="130px"
                                value={qTag ? [qTag] : [""]}
                                onValueChange={(e) => { setQTag(e.value[0] || ""); setQOffset(0) }}>
                                <Select.HiddenSelect />
                                <Select.Control>
                                    <Select.Trigger><Select.ValueText placeholder="全部标签" /></Select.Trigger>
                                    <Select.IndicatorGroup><Select.Indicator /></Select.IndicatorGroup>
                                </Select.Control>
                                <Portal><Select.Positioner><Select.Content>
                                    {tagOptions.items.map((item) => (
                                        <Select.Item item={item} key={item.value}>{item.label}<Select.ItemIndicator /></Select.Item>
                                    ))}
                                </Select.Content></Select.Positioner></Portal>
                            </Select.Root>
                        </>
                    )}
                </HStack>

                {showAdvancedFilters && (
                    <HStack mb="2" gap="2" wrap="wrap">
                        <Input placeholder="最低分数" value={qScoreMin} onChange={(e) => setQScoreMin(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQOffset(0) } }}
                            maxW="90px" size="sm" type="number" />
                        <Input placeholder="最高分数" value={qScoreMax} onChange={(e) => setQScoreMax(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQOffset(0) } }}
                            maxW="90px" size="sm" type="number" />
                        <Select.Root
                            collection={diffTagOptions}
                            size="sm"
                            width="130px"
                            value={[qDiffTag]}
                            onValueChange={(e) => { setQDiffTag(e.value[0] || "human"); setQOffset(0) }}
                        >
                            <Select.HiddenSelect />
                            <Select.Control>
                                <Select.Trigger><Select.ValueText placeholder="难度标签" /></Select.Trigger>
                                <Select.IndicatorGroup><Select.Indicator /></Select.IndicatorGroup>
                            </Select.Control>
                            <Portal><Select.Positioner><Select.Content>
                                {diffTagOptions.items.map((item) => (
                                    <Select.Item item={item} key={item.value}>{item.label}<Select.ItemIndicator /></Select.Item>
                                ))}
                            </Select.Content></Select.Positioner></Portal>
                        </Select.Root>
                        <Input placeholder="最低难度" value={qDiffMin} onChange={(e) => setQDiffMin(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQOffset(0) } }}
                            maxW="90px" size="sm" type="number" />
                        <Input placeholder="最高难度" value={qDiffMax} onChange={(e) => setQDiffMax(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setQOffset(0) } }}
                            maxW="90px" size="sm" type="number" />
                    </HStack>
                )}

                <QuestionTable
                    questions={questions?.items ?? []}
                    columns={["description", "category", "status", "score", "difficulty", "author", "tags"]}
                    selectable
                    selected={new Set(selectedIds)}
                    onToggle={(id) => {
                        const q = questions?.items.find((x) => x.question_id === id)
                        if (q) toggleQuestion(q)
                    }}
                />

                <Pagination
                    page={qPage}
                    totalPages={qTotalPages}
                    onPrev={() => setQOffset(qOffset - LIMIT)}
                    onNext={() => setQOffset(qOffset + LIMIT)}
                />
            </Box>
        </>
    )
}
