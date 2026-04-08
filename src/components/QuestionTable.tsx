import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import {
    Box,
    Table,
    Text,
    Badge,
    Flex,
    Checkbox,
} from "@chakra-ui/react"
import type { QuestionSummary } from "@/types"
import CategoryBadge, { CategoryBadgeLabel } from "./CategoryBadge"
import StatusBadge from "./StatusBadge"

export interface QuestionTableProps {
    questions: QuestionSummary[]
    loading?: boolean
    /** Show row number starting from 1 */
    showIndex?: boolean
    /** Show checkbox column; requires selected + onToggle */
    selectable?: boolean
    selected?: Set<string>
    onToggle?: (id: string) => void
    allSelected?: boolean
    someSelected?: boolean
    onToggleAll?: () => void
    /** Use long category label (理论/实验/未分类) instead of short (T/E/—) */
    longCategory?: boolean
    /** Which difficulty tag to display in the difficulty column. Default: "human" */
    difficultyTag?: string
    /** Columns to show. Default: all standard columns */
    columns?: QuestionColumn[]
    /** How to render the description cell */
    descriptionRender?: "link" | "button"
    /** Callback when description is clicked (for "button" mode) */
    onDescriptionClick?: (id: string) => void
    /** Extra columns appended after standard ones */
    extraColumns?: { header: ReactNode; render: (q: QuestionSummary, i: number) => ReactNode }[]
}

export type QuestionColumn =
    | "description"
    | "category"
    | "status"
    | "score"
    | "difficulty"
    | "author"
    | "reviewers"
    | "tags"
    | "created_at"
    | "updated_at"

const ALL_COLUMNS: QuestionColumn[] = [
    "description", "category", "status", "score", "difficulty",
    "author", "reviewers", "tags", "created_at", "updated_at",
]

const COLUMN_HEADERS: Record<QuestionColumn, string> = {
    description: "描述",
    category: "分类",
    status: "状态",
    score: "分数",
    difficulty: "难度",
    author: "命题人",
    reviewers: "审题人",
    tags: "标签",
    created_at: "创建时间",
    updated_at: "修改时间",
}

export default function QuestionTable({
    questions,
    loading,
    showIndex,
    selectable,
    selected,
    onToggle,
    allSelected,
    someSelected,
    onToggleAll,
    longCategory = true,
    difficultyTag = "human",
    columns = ALL_COLUMNS,
    descriptionRender = "link",
    onDescriptionClick,
    extraColumns,
}: QuestionTableProps) {
    const colCount =
        (showIndex ? 1 : 0) +
        (selectable ? 1 : 0) +
        columns.length +
        (extraColumns?.length ?? 0)

    const renderCell = (q: QuestionSummary, col: QuestionColumn) => {
        switch (col) {
            case "description":
                if (descriptionRender === "button") {
                    return (
                        <Table.Cell fontWeight="medium" key={col}>
                            <Text
                                as="button"
                                color="blue.fg"
                                _hover={{ textDecoration: "underline" }}
                                onClick={() => onDescriptionClick?.(q.question_id)}
                                textAlign="left"
                            >
                                {q.description}
                            </Text>
                        </Table.Cell>
                    )
                }
                return (
                    <Table.Cell key={col}>
                        <Link to={`/questions/${q.question_id}`}>
                            <Text _hover={{ textDecoration: "underline" }} color="blue.fg" fontWeight="medium">
                                {q.description}
                            </Text>
                        </Link>
                    </Table.Cell>
                )
            case "category":
                return (
                    <Table.Cell key={col}>
                        {longCategory ? <CategoryBadgeLabel value={q.category} /> : <CategoryBadge value={q.category} />}
                    </Table.Cell>
                )
            case "status":
                return <Table.Cell key={col}><StatusBadge value={q.status} /></Table.Cell>
            case "score":
                return <Table.Cell key={col}>{q.score ?? "—"}</Table.Cell>
            case "difficulty":
                return (
                    <Table.Cell key={col}>
                        {q.difficulty?.[difficultyTag] ? `${q.difficulty[difficultyTag].score}/10` : "—"}
                    </Table.Cell>
                )
            case "author":
                return <Table.Cell fontSize="xs" key={col}>{q.author || "—"}</Table.Cell>
            case "reviewers":
                return (
                    <Table.Cell fontSize="xs" key={col}>
                        {q.reviewers?.length ? q.reviewers.join(", ") : "—"}
                    </Table.Cell>
                )
            case "tags":
                return (
                    <Table.Cell key={col}>
                        <Flex gap="1" wrap="wrap">
                            {q.tags?.length ? q.tags.map((t) => (
                                <Badge key={t} size="sm" variant="subtle" colorPalette="teal">{t}</Badge>
                            )) : <Text fontSize="xs" color="fg.muted">—</Text>}
                        </Flex>
                    </Table.Cell>
                )
            case "created_at":
                return (
                    <Table.Cell fontSize="xs" color="fg.muted" key={col}>
                        {new Date(q.created_at).toLocaleDateString()}
                    </Table.Cell>
                )
            case "updated_at":
                return (
                    <Table.Cell fontSize="xs" color="fg.muted" key={col}>
                        {new Date(q.updated_at).toLocaleDateString()}
                    </Table.Cell>
                )
        }
    }

    return (
        <Box overflowX="auto">
            <Table.Root size="sm" striped>
                <Table.Header>
                    <Table.Row>
                        {selectable && (
                            <Table.ColumnHeader w="40px">
                                <Checkbox.Root
                                    size="sm"
                                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                    onCheckedChange={() => onToggleAll?.()}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                                </Checkbox.Root>
                            </Table.ColumnHeader>
                        )}
                        {showIndex && <Table.ColumnHeader>#</Table.ColumnHeader>}
                        {columns.map((col) => (
                            <Table.ColumnHeader key={col}>{COLUMN_HEADERS[col]}</Table.ColumnHeader>
                        ))}
                        {extraColumns?.map((ec, i) => (
                            <Table.ColumnHeader key={`extra-${i}`}>{ec.header}</Table.ColumnHeader>
                        ))}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {loading && (
                        <Table.Row>
                            <Table.Cell colSpan={colCount}>
                                <Text textAlign="center">加载中...</Text>
                            </Table.Cell>
                        </Table.Row>
                    )}
                    {!loading && questions.length === 0 && (
                        <Table.Row>
                            <Table.Cell colSpan={colCount}>
                                <Text textAlign="center" color="fg.muted">暂无数据</Text>
                            </Table.Cell>
                        </Table.Row>
                    )}
                    {questions.map((q, i) => (
                        <Table.Row key={q.question_id}>
                            {selectable && (
                                <Table.Cell>
                                    <Checkbox.Root
                                        size="sm"
                                        checked={selected?.has(q.question_id) ?? false}
                                        onCheckedChange={() => onToggle?.(q.question_id)}
                                    >
                                        <Checkbox.HiddenInput />
                                        <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                                    </Checkbox.Root>
                                </Table.Cell>
                            )}
                            {showIndex && <Table.Cell>{i + 1}</Table.Cell>}
                            {columns.map((col) => renderCell(q, col))}
                            {extraColumns?.map((ec, j) => (
                                <Table.Cell key={`extra-${j}`}>{ec.render(q, i)}</Table.Cell>
                            ))}
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </Box>
    )
}
