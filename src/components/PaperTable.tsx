import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import {
    Box,
    Table,
    Text,
    Checkbox,
} from "@chakra-ui/react"
import type { PaperSummary } from "@/types"

export interface PaperTableProps {
    papers: PaperSummary[]
    loading?: boolean
    /** Show checkbox column */
    selectable?: boolean
    selected?: Set<string>
    onToggle?: (id: string) => void
    allSelected?: boolean
    someSelected?: boolean
    onToggleAll?: () => void
    /** Columns to show */
    columns?: PaperColumn[]
    /** How to render the title cell */
    titleRender?: "link" | "button"
    /** Callback when title is clicked (for "button" mode) */
    onTitleClick?: (id: string) => void
    /** Extra columns appended after standard ones */
    extraColumns?: { header: ReactNode; render: (p: PaperSummary, i: number) => ReactNode }[]
}

export type PaperColumn =
    | "title"
    | "subtitle"
    | "description"
    | "question_count"
    | "created_at"
    | "updated_at"

const ALL_COLUMNS: PaperColumn[] = [
    "title", "subtitle", "description", "created_at", "updated_at",
]

const COLUMN_HEADERS: Record<PaperColumn, string> = {
    title: "标题",
    subtitle: "副标题",
    description: "描述",
    question_count: "题数",
    created_at: "创建时间",
    updated_at: "修改时间",
}

export default function PaperTable({
    papers,
    loading,
    selectable,
    selected,
    onToggle,
    allSelected,
    someSelected,
    onToggleAll,
    columns = ALL_COLUMNS,
    titleRender = "link",
    onTitleClick,
    extraColumns,
}: PaperTableProps) {
    const colCount =
        (selectable ? 1 : 0) +
        columns.length +
        (extraColumns?.length ?? 0)

    const renderCell = (p: PaperSummary, col: PaperColumn) => {
        switch (col) {
            case "title":
                if (titleRender === "button") {
                    return (
                        <Table.Cell fontWeight="medium" key={col}>
                            <Text
                                as="button"
                                color="blue.fg"
                                _hover={{ textDecoration: "underline" }}
                                onClick={() => onTitleClick?.(p.paper_id)}
                                textAlign="left"
                            >
                                {p.title}
                            </Text>
                        </Table.Cell>
                    )
                }
                return (
                    <Table.Cell key={col}>
                        <Link to={`/papers/${p.paper_id}`}>
                            <Text _hover={{ textDecoration: "underline" }} color="blue.fg" fontWeight="medium">
                                {p.title}
                            </Text>
                        </Link>
                    </Table.Cell>
                )
            case "subtitle":
                return <Table.Cell key={col}>{p.subtitle}</Table.Cell>
            case "description":
                return <Table.Cell key={col}>{p.description}</Table.Cell>
            case "question_count":
                return <Table.Cell key={col}>{p.question_count ?? "—"}</Table.Cell>
            case "created_at":
                return (
                    <Table.Cell fontSize="xs" color="fg.muted" key={col}>
                        {new Date(p.created_at).toLocaleDateString()}
                    </Table.Cell>
                )
            case "updated_at":
                return (
                    <Table.Cell fontSize="xs" color="fg.muted" key={col}>
                        {new Date(p.updated_at).toLocaleDateString()}
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
                    {!loading && papers.length === 0 && (
                        <Table.Row>
                            <Table.Cell colSpan={colCount}>
                                <Text textAlign="center" color="fg.muted">暂无数据</Text>
                            </Table.Cell>
                        </Table.Row>
                    )}
                    {papers.map((p, i) => (
                        <Table.Row key={p.paper_id}>
                            {selectable && (
                                <Table.Cell>
                                    <Checkbox.Root
                                        size="sm"
                                        checked={selected?.has(p.paper_id) ?? false}
                                        onCheckedChange={() => onToggle?.(p.paper_id)}
                                    >
                                        <Checkbox.HiddenInput />
                                        <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                                    </Checkbox.Root>
                                </Table.Cell>
                            )}
                            {columns.map((col) => renderCell(p, col))}
                            {extraColumns?.map((ec, j) => (
                                <Table.Cell key={`extra-${j}`}>{ec.render(p, i)}</Table.Cell>
                            ))}
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </Box>
    )
}
