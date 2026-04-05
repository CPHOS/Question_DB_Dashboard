import { useEffect, useState, useCallback } from "react"
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
    NativeSelect,
} from "@chakra-ui/react"
import type { QuestionsQuery, QuestionSummary, Paginated } from "@/types"
import * as api from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { LuSearch, LuPlus, LuChevronLeft, LuChevronRight, LuDownload } from "react-icons/lu"
import { toaster } from "@/components/ui/toaster"

const LIMIT = 20

export default function QuestionsListPage() {
    const { user } = useAuth()
    const canEdit = user?.role === "editor" || user?.role === "admin"

    const [data, setData] = useState<Paginated<QuestionSummary> | null>(null)
    const [query, setQuery] = useState<QuestionsQuery>({ limit: LIMIT, offset: 0 })
    const [search, setSearch] = useState("")
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.getQuestions(query)
            setData(res)
        } catch (e) {
            toaster.error({ title: "加载失败", description: String(e) })
        } finally {
            setLoading(false)
        }
    }, [query])

    useEffect(() => { load() }, [load])

    const handleSearch = () => {
        setQuery((prev) => ({ ...prev, q: search || undefined, offset: 0 }))
    }

    const page = Math.floor((query.offset ?? 0) / LIMIT)
    const totalPages = data ? Math.ceil(data.total / LIMIT) : 0

    const handleBundle = async () => {
        if (selected.size === 0) return
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
                    {selected.size > 0 && (
                        <Button size="sm" variant="outline" onClick={handleBundle}>
                            <LuDownload /> 打包下载 ({selected.size})
                        </Button>
                    )}
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

                <NativeSelect.Root size="sm" width="120px">
                    <NativeSelect.Field
                        value={query.category ?? ""}
                        onChange={(e) =>
                            setQuery((prev) => ({
                                ...prev,
                                category: e.target.value || undefined,
                                offset: 0,
                            }))
                        }
                    >
                        <option value="">全部分类</option>
                        <option value="T">理论 (T)</option>
                        <option value="E">实验 (E)</option>
                        <option value="none">未分类</option>
                    </NativeSelect.Field>
                </NativeSelect.Root>

                <NativeSelect.Root size="sm" width="120px">
                    <NativeSelect.Field
                        value={query.tag ?? ""}
                        onChange={(e) =>
                            setQuery((prev) => ({
                                ...prev,
                                tag: e.target.value || undefined,
                                offset: 0,
                            }))
                        }
                    >
                        <option value="">全部标签</option>
                    </NativeSelect.Field>
                </NativeSelect.Root>
            </HStack>

            {/* Table */}
            <Box overflowX="auto">
                <Table.Root size="sm" striped>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader w="40px" />
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
                                    <input
                                        type="checkbox"
                                        checked={selected.has(q.question_id)}
                                        onChange={() => toggleSelect(q.question_id)}
                                    />
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
                        onClick={() => setQuery((p) => ({ ...p, offset: (p.offset ?? 0) - LIMIT }))}
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
                        onClick={() => setQuery((p) => ({ ...p, offset: (p.offset ?? 0) + LIMIT }))}
                    >
                        <LuChevronRight />
                    </IconButton>
                </HStack>
            </HStack>
        </Stack>
    )
}
