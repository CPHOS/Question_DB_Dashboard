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
    IconButton,
    Stack,
    Flex,
} from "@chakra-ui/react"
import type { PapersQuery, PaperSummary, Paginated } from "@/types"
import * as api from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { LuSearch, LuPlus, LuChevronLeft, LuChevronRight, LuDownload } from "react-icons/lu"
import { toaster } from "@/components/ui/toaster"

const LIMIT = 20

export default function PapersListPage() {
    const { user } = useAuth()
    const canEdit = user?.role === "editor" || user?.role === "admin"

    const [data, setData] = useState<Paginated<PaperSummary> | null>(null)
    const [query, setQuery] = useState<PapersQuery>({ limit: LIMIT, offset: 0 })
    const [search, setSearch] = useState("")
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)

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

    const handleSearch = () => {
        setQuery((prev) => ({ ...prev, q: search || undefined, offset: 0 }))
    }

    const page = Math.floor((query.offset ?? 0) / LIMIT)
    const totalPages = data ? Math.ceil(data.total / LIMIT) : 0

    const handleBundle = async () => {
        if (selected.size === 0) return
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
                    {selected.size > 0 && (
                        <Button size="sm" variant="outline" onClick={handleBundle}>
                            <LuDownload /> 打包下载 ({selected.size})
                        </Button>
                    )}
                </HStack>
            </Flex>

            <HStack gap="2">
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
            </HStack>

            <Box overflowX="auto">
                <Table.Root size="sm" striped>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader w="40px" />
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
                                    <input
                                        type="checkbox"
                                        checked={selected.has(p.paper_id)}
                                        onChange={() => toggleSelect(p.paper_id)}
                                    />
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
                        onClick={() => setQuery((p) => ({ ...p, offset: (p.offset ?? 0) - LIMIT }))}
                    >
                        <LuChevronLeft />
                    </IconButton>
                    <Text fontSize="sm">{page + 1} / {totalPages || 1}</Text>
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
