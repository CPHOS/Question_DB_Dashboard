import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
    Box,
    Button,
    Heading,
    HStack,
    Text,
    Badge,
    Stack,
    Separator,
    VStack,
    Flex,
    Card,
    Spinner,
    Center,
    Portal,
    IconButton,
    Input,
    Textarea,
    Select,
    createListCollection,
    Dialog,
    Tabs,
} from "@chakra-ui/react"
import type { QuestionDetail, ReviewerInfo, User } from "@/types"
import * as api from "@/lib/api"
import { useAuth } from "@/contexts/useAuth"
import { toaster } from "@/components/ui/toaster-instance"
import { LuArrowLeft, LuPencil, LuTrash2, LuX, LuCheck, LuPlus, LuEye } from "react-icons/lu"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import ConfirmDialog from "@/components/ConfirmDialog"
import UserSearchPicker from "@/components/UserSearchPicker"
import TagInput from "@/components/TagInput"
import FileDropzone from "@/components/FileDropzone"

const categoryOptions = createListCollection({
    items: [
        { label: "未分类", value: "none" },
        { label: "理论 (T)", value: "T" },
        { label: "实验 (E)", value: "E" },
    ],
})

const statusOptions = createListCollection({
    items: [
        { label: "无", value: "none" },
        { label: "已审", value: "reviewed" },
        { label: "已用", value: "used" },
    ],
})

// ─── Permission helpers ──────────────────────────────────
function canEditDescription(role: string, isOwner: boolean, status: string) {
    if (role === "admin" || role === "bot") return true
    if (role === "leader" && status !== "used") return true
    if (role === "user" && isOwner) return true
    return false
}

function canEditCategory(role: string, isOwner: boolean, status: string) {
    return canEditDescription(role, isOwner, status)
}

function canEditTags(role: string, isOwner: boolean, isAssignedReviewer: boolean, status: string) {
    if (role === "admin" || role === "bot") return true
    if (role === "leader" && status !== "used") return true
    if (role === "user" && isOwner) return true
    if (isAssignedReviewer) return true
    return false
}

function canEditStatus(role: string) {
    if (role === "admin" || role === "bot") return true
    if (role === "leader") return true
    return false
}

function canReplaceFile(role: string, isOwner: boolean, status: string) {
    return canEditDescription(role, isOwner, status)
}

function canManageDifficulty(role: string, isAssignedReviewer: boolean, status: string) {
    if (role === "admin" || role === "bot") return true
    if (role === "leader" && status !== "used") return true
    if (isAssignedReviewer) return true
    return false
}

function canDeleteQuestion(role: string, status: string) {
    if (role === "admin" || role === "bot") return true
    if (role === "leader" && status !== "used") return true
    return false
}

function canManageReviewersFn(role: string) {
    return role === "leader" || role === "bot" || role === "admin"
}

// ─── Inline editable field component ─────────────────────
function InlineEdit({
    value,
    onSave,
    canEdit,
    renderView,
    renderEdit,
}: {
    value: unknown
    onSave: (v: unknown) => Promise<void>
    canEdit: boolean
    renderView: (v: unknown) => React.ReactNode
    renderEdit: (v: unknown, onChange: (v: unknown) => void) => React.ReactNode
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value)
    const [saving, setSaving] = useState(false)

    useEffect(() => { setDraft(value) }, [value])

    const handleSave = async () => {
        setSaving(true)
        try {
            await onSave(draft)
            setEditing(false)
        } catch (e) {
            toaster.error({ title: "保存失败", description: String(e) })
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        setDraft(value)
        setEditing(false)
    }

    if (!editing) {
        return (
            <HStack gap="1" align="center">
                {renderView(value)}
                {canEdit && (
                    <IconButton
                        aria-label="编辑"
                        size="2xs"
                        variant="ghost"
                        onClick={() => setEditing(true)}
                    >
                        <LuPencil />
                    </IconButton>
                )}
            </HStack>
        )
    }

    return (
        <HStack gap="1" align="start" flexWrap="wrap">
            {renderEdit(draft, setDraft)}
            <IconButton
                aria-label="保存"
                size="xs"
                colorPalette="green"
                variant="outline"
                onClick={handleSave}
                loading={saving}
            >
                <LuCheck />
            </IconButton>
            <IconButton
                aria-label="取消"
                size="xs"
                variant="ghost"
                onClick={handleCancel}
                disabled={saving}
            >
                <LuX />
            </IconButton>
        </HStack>
    )
}

export default function QuestionDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [question, setQuestion] = useState<QuestionDetail | null>(null)
    const [failedId, setFailedId] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [reloading, setReloading] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    // Reviewers management
    const [reviewers, setReviewers] = useState<ReviewerInfo[]>([])
    const [reviewersLoaded, setReviewersLoaded] = useState(false)
    const [addingReviewer, setAddingReviewer] = useState(false)

    // File replace
    const [showFileReplace, setShowFileReplace] = useState(false)
    const [replacingFile, setReplacingFile] = useState(false)

    // Tag suggestions
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([])

    // Unified difficulty dialog (add & edit)
    const [diffDialogOpen, setDiffDialogOpen] = useState(false)
    const [diffDialogMode, setDiffDialogMode] = useState<"add" | "edit">("add")
    const [diffDialogTag, setDiffDialogTag] = useState("")
    const [diffDialogScore, setDiffDialogScore] = useState(5)
    const [diffDialogNotes, setDiffDialogNotes] = useState("")
    const [diffDialogSaving, setDiffDialogSaving] = useState(false)

    // Markdown notes preview dialog
    const [notesPreviewOpen, setNotesPreviewOpen] = useState(false)
    const [notesPreviewTag, setNotesPreviewTag] = useState("")
    const [notesPreviewContent, setNotesPreviewContent] = useState("")

    const openDiffDialog = (mode: "add" | "edit", tag = "", score = 5, notes = "") => {
        setDiffDialogMode(mode)
        setDiffDialogTag(tag)
        setDiffDialogScore(score)
        setDiffDialogNotes(notes)
        setDiffDialogOpen(true)
    }

    const closeDiffDialog = () => {
        setDiffDialogOpen(false)
        setDiffDialogTag("")
        setDiffDialogScore(5)
        setDiffDialogNotes("")
    }

    const openNotesPreview = (tag: string, notes: string) => {
        setNotesPreviewTag(tag)
        setNotesPreviewContent(notes)
        setNotesPreviewOpen(true)
    }

    // Difficulty delete confirmation
    const [deleteDiffTag, setDeleteDiffTag] = useState<string | null>(null)
    const confirmDeleteDifficulty = (tag: string) => setDeleteDiffTag(tag)
    const handleConfirmDeleteDifficulty = async () => {
        if (deleteDiffTag) await handleDeleteDifficulty(deleteDiffTag)
        setDeleteDiffTag(null)
    }

    const currentQuestion = question?.question_id === id ? question : null
    const isLoading = Boolean(id) && failedId !== id && (reloading || !currentQuestion)

    const loadQuestion = useCallback(() => {
        setFailedId(null)
        setReloading(true)
        setReloadKey((value) => value + 1)
    }, [])

    useEffect(() => {
        if (!id) return
        let cancelled = false
        void api.getQuestion(id)
            .then((data) => {
                if (cancelled) return
                setQuestion(data)
                setFailedId(null)
            })
            .catch((e) => {
                if (cancelled) return
                setFailedId(id)
                toaster.error({ title: "加载失败", description: String(e) })
            })
            .finally(() => {
                if (cancelled) return
                setReloading(false)
            })
        return () => { cancelled = true }
    }, [id, reloadKey])

    useEffect(() => {
        if (!id) return
        setReviewersLoaded(false)
        api.getQuestionReviewers(id)
            .then((res) => { setReviewers(res.reviewers); setReviewersLoaded(true) })
            .catch(() => setReviewersLoaded(true))
    }, [id, reloadKey])

    useEffect(() => {
        api.getQuestionTags().then((r) => setTagSuggestions(r.tags)).catch(() => {})
    }, [])

    const handleAddReviewer = async (selectedUser: User) => {
        if (!id) return
        setAddingReviewer(true)
        try {
            const res = await api.addQuestionReviewer(id, selectedUser.user_id)
            setReviewers(res.reviewers)
            toaster.success({ title: `已添加审阅人 ${selectedUser.display_name || selectedUser.username}` })
        } catch (e) {
            toaster.error({ title: "添加失败", description: String(e) })
        } finally {
            setAddingReviewer(false)
        }
    }

    const handleRemoveReviewer = async (reviewerId: string) => {
        if (!id) return
        try {
            const res = await api.removeQuestionReviewer(id, reviewerId)
            setReviewers(res.reviewers)
            toaster.success({ title: "已移除审阅人" })
        } catch (e) {
            toaster.error({ title: "移除失败", description: String(e) })
        }
    }

    const handleDelete = async () => {
        if (!id) return
        setConfirmOpen(false)
        try {
            await api.deleteQuestion(id)
            toaster.success({ title: "已删除" })
            navigate("/questions")
        } catch (e) {
            toaster.error({ title: "删除失败", description: String(e) })
        }
    }

    const handleFileReplace = async (file: File | null) => {
        if (!id || !file) return
        setReplacingFile(true)
        try {
            const fd = new FormData()
            fd.append("file", file)
            await api.replaceQuestionFile(id, fd)
            toaster.success({ title: "文件已替换" })
            setShowFileReplace(false)
            loadQuestion()
        } catch (e) {
            toaster.error({ title: "替换失败", description: String(e) })
        } finally {
            setReplacingFile(false)
        }
    }

    const handleDiffDialogSave = async () => {
        if (!id || !diffDialogTag.trim()) return
        setDiffDialogSaving(true)
        try {
            let detail: QuestionDetail
            if (diffDialogMode === "add") {
                detail = await api.createDifficulty(id, {
                    algorithm_tag: diffDialogTag.trim(),
                    score: diffDialogScore,
                    notes: diffDialogNotes.trim() || undefined,
                })
                toaster.success({ title: "难度已添加" })
            } else {
                detail = await api.updateDifficulty(id, diffDialogTag.trim(), {
                    score: diffDialogScore,
                    notes: diffDialogNotes.trim() || undefined,
                })
                toaster.success({ title: "难度已更新" })
            }
            setQuestion(detail)
            closeDiffDialog()
        } catch (e) {
            toaster.error({ title: diffDialogMode === "add" ? "添加失败" : "更新失败", description: String(e) })
        } finally {
            setDiffDialogSaving(false)
        }
    }

    const handleDeleteDifficulty = async (tag: string) => {
        if (!id) return
        try {
            const detail = await api.deleteDifficulty(id, tag)
            setQuestion(detail)
            toaster.success({ title: "难度已删除" })
        } catch (e) {
            toaster.error({ title: "删除失败", description: String(e) })
        }
    }

    if (!id) return <Text>题目不存在</Text>

    if (isLoading) {
        return (
            <Center h="200px">
                <Spinner size="lg" />
            </Center>
        )
    }

    if (!currentQuestion) return <Text>题目不存在</Text>

    const q = currentQuestion
    const role = user?.role ?? "viewer"
    const isOwner = !!(user && q.created_by && q.created_by === user.user_id)
    const isAssignedReviewer = !!(user && reviewersLoaded && reviewers.some((r) => r.reviewer_id === user.user_id))

    const showDeleteBtn = canDeleteQuestion(role, q.status)

    return (
        <Stack gap="5">
            <Flex justify="space-between" align="center" wrap="wrap" gap="3">
                <HStack>
                    <Button asChild variant="ghost" size="sm">
                        <Link to="/questions"><LuArrowLeft /> 返回</Link>
                    </Button>
                    <Heading size="lg">{q.description}</Heading>
                </HStack>
                <HStack>
                    {canReplaceFile(role, isOwner, q.status) && (
                        <Button size="sm" variant="outline" onClick={() => setShowFileReplace(!showFileReplace)}>
                            {showFileReplace ? "取消替换" : "替换文件"}
                        </Button>
                    )}
                    {showDeleteBtn && (
                        <Button size="sm" colorPalette="red" variant="outline" onClick={() => setConfirmOpen(true)}>
                            <LuTrash2 /> 删除
                        </Button>
                    )}
                </HStack>
            </Flex>

            {/* File replace zone */}
            {showFileReplace && (
                <Card.Root>
                    <Card.Body>
                        <Stack gap="3">
                            <Text fontSize="sm" color="orange.fg">替换文件将重置难度、状态、命题人和审题人</Text>
                            <FileDropzone
                                onFileChange={(file) => { if (file) handleFileReplace(file) }}
                                label={replacingFile ? "上传中..." : "拖放 ZIP 文件到此处替换"}
                            />
                        </Stack>
                    </Card.Body>
                </Card.Root>
            )}

            <Card.Root>
                <Card.Body>
                    <Stack gap="4">
                        {/* Description */}
                        <Box>
                            <Text fontSize="xs" color="fg.muted" mb="1">描述</Text>
                            <InlineEdit
                                value={q.description}
                                canEdit={canEditDescription(role, isOwner, q.status)}
                                onSave={async (v) => {
                                    const detail = await api.patchQuestionDescription(id, v as string)
                                    setQuestion(detail)
                                }}
                                renderView={(v) => <Text fontWeight="medium">{v as string}</Text>}
                                renderEdit={(v, onChange) => (
                                    <Input
                                        size="sm"
                                        value={v as string}
                                        onChange={(e) => onChange(e.target.value)}
                                        autoFocus
                                    />
                                )}
                            />
                        </Box>

                        <Separator />

                        <HStack wrap="wrap" gap="6">
                            {/* Category */}
                            <Box>
                                <Text fontSize="xs" color="fg.muted" mb="1">分类</Text>
                                <InlineEdit
                                    value={q.category}
                                    canEdit={canEditCategory(role, isOwner, q.status)}
                                    onSave={async (v) => {
                                        const detail = await api.patchQuestionCategory(id, v as "none" | "T" | "E")
                                        setQuestion(detail)
                                    }}
                                    renderView={(v) => (
                                        <>
                                            {v === "T" && <Badge colorPalette="blue">理论</Badge>}
                                            {v === "E" && <Badge colorPalette="green">实验</Badge>}
                                            {v === "none" && <Badge variant="outline">未分类</Badge>}
                                        </>
                                    )}
                                    renderEdit={(v, onChange) => (
                                        <Select.Root
                                            collection={categoryOptions}
                                            size="sm"
                                            width="140px"
                                            value={[v as string]}
                                            onValueChange={(e) => onChange(e.value[0] || "none")}
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
                                        </Select.Root>
                                    )}
                                />
                            </Box>

                            {/* Status */}
                            <Box>
                                <Text fontSize="xs" color="fg.muted" mb="1">状态</Text>
                                <InlineEdit
                                    value={q.status}
                                    canEdit={canEditStatus(role)}
                                    onSave={async (v) => {
                                        const detail = await api.patchQuestionStatus(id, v as "none" | "reviewed" | "used")
                                        setQuestion(detail)
                                    }}
                                    renderView={(v) => (
                                        <>
                                            {v === "reviewed" && <Badge colorPalette="purple">已审</Badge>}
                                            {v === "used" && <Badge colorPalette="orange">已用</Badge>}
                                            {v === "none" && <Badge variant="outline">无</Badge>}
                                        </>
                                    )}
                                    renderEdit={(v, onChange) => (
                                        <Select.Root
                                            collection={statusOptions}
                                            size="sm"
                                            width="140px"
                                            value={[v as string]}
                                            onValueChange={(e) => onChange(e.value[0] || "none")}
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
                                            <Select.Positioner>
                                                <Select.Content>
                                                    {statusOptions.items.map((item) => (
                                                        <Select.Item item={item} key={item.value}>
                                                            {item.label}
                                                            <Select.ItemIndicator />
                                                        </Select.Item>
                                                    ))}
                                                </Select.Content>
                                            </Select.Positioner>
                                        </Select.Root>
                                    )}
                                />
                            </Box>

                            {/* Score (read-only, extracted from tex) */}
                            <Box>
                                <Text fontSize="xs" color="fg.muted" mb="1">分数</Text>
                                <Text fontWeight="medium">{q.score ?? "—"}</Text>
                            </Box>

                            {/* Author (admin can edit) */}
                            <Box>
                                <Text fontSize="xs" color="fg.muted" mb="1">命题人</Text>
                                <InlineEdit
                                    value={q.author}
                                    canEdit={role === "admin"}
                                    onSave={async (v) => {
                                        const detail = await api.patchQuestionAuthor(id, v as string)
                                        setQuestion(detail)
                                    }}
                                    renderView={(v) => <Text fontWeight="medium">{(v as string) || "—"}</Text>}
                                    renderEdit={(v, onChange) => (
                                        <Input
                                            size="sm"
                                            value={v as string}
                                            onChange={(e) => onChange(e.target.value)}
                                            autoFocus
                                        />
                                    )}
                                />
                            </Box>

                            {/* Reviewers display (admin can edit) */}
                            <Box>
                                <Text fontSize="xs" color="fg.muted" mb="1">审题人</Text>
                                <InlineEdit
                                    value={q.reviewers}
                                    canEdit={role === "admin"}
                                    onSave={async (v) => {
                                        const detail = await api.patchQuestionReviewerNames(id, v as string[])
                                        setQuestion(detail)
                                    }}
                                    renderView={(v) => <Text fontWeight="medium">{(v as string[]).length > 0 ? (v as string[]).join(", ") : "—"}</Text>}
                                    renderEdit={(v, onChange) => (
                                        <Box minW="200px">
                                            <TagInput
                                                value={v as string[]}
                                                onChange={(tags) => onChange(tags)}
                                                placeholder="输入审题人名称后按回车添加"
                                            />
                                        </Box>
                                    )}
                                />
                            </Box>
                        </HStack>

                        <Separator />

                        {/* Tags & Difficulty side by side */}
                        <HStack align="start" gap="6" wrap="wrap">
                            {/* Tags */}
                            <Box flex="1" minW="240px">
                                <Text fontSize="xs" color="fg.muted" mb="1">标签</Text>
                                <InlineEdit
                                    value={q.tags}
                                    canEdit={canEditTags(role, isOwner, isAssignedReviewer, q.status)}
                                    onSave={async (v) => {
                                        const detail = await api.patchQuestionTags(id, v as string[])
                                        setQuestion(detail)
                                    }}
                                    renderView={(v) => (
                                        <HStack wrap="wrap" gap="1">
                                            {(v as string[]).length > 0
                                                ? (v as string[]).map((t) => (
                                                    <Badge key={t} variant="subtle">{t}</Badge>
                                                ))
                                                : <Text color="fg.muted">无标签</Text>}
                                        </HStack>
                                    )}
                                    renderEdit={(v, onChange) => (
                                        <Box minW="200px">
                                            <TagInput
                                                value={v as string[]}
                                                onChange={(tags) => onChange(tags)}
                                                placeholder="输入标签后按回车添加"
                                                suggestions={tagSuggestions}
                                            />
                                        </Box>
                                    )}
                                />
                            </Box>

                            {/* Difficulty */}
                            <Box flex="1" minW="240px">
                                <HStack mb="2" justify="space-between">
                                    <Text fontSize="xs" color="fg.muted">难度</Text>
                                    {canManageDifficulty(role, isAssignedReviewer, q.status) && (
                                        <Button size="2xs" variant="ghost" onClick={() => openDiffDialog("add")}>
                                            <LuPlus /> 添加难度
                                        </Button>
                                    )}
                                </HStack>

                                <HStack wrap="wrap" gap="3">
                                    {Object.keys(q.difficulty).length === 0 && (
                                        <Text color="fg.muted" fontSize="sm">无难度评估</Text>
                                    )}
                                    {Object.entries(q.difficulty).map(([tag, val]) => {
                                        const editor = val.updated_by
                                        const editorLabel = editor
                                            ? ` · ${editor.display_name || editor.username}`
                                            : ""
                                        const label = tag === "human" ? "人工难度" : tag

                                        // Reviewer can only edit/delete their own entries
                                        const isOwnEntry = !!(editor && user && editor.user_id === user.user_id)
                                        const canModify = role === "admin" || role === "bot" ||
                                            (role === "leader" && q.status !== "used") ||
                                            (isAssignedReviewer && isOwnEntry)

                                        return (
                                            <DifficultyBadge
                                                key={tag}
                                                tag={tag}
                                                label={label}
                                                score={val.score}
                                                notes={val.notes}
                                                editorLabel={editorLabel}
                                                hasEditor={!!editor}
                                                canEdit={canModify}
                                                canDelete={canModify}
                                                onEdit={() => openDiffDialog("edit", tag, val.score, val.notes ?? "")}
                                                onDelete={() => confirmDeleteDifficulty(tag)}
                                                onNotesClick={() => val.notes && openNotesPreview(label, val.notes)}
                                            />
                                        )
                                    })}
                                </HStack>
                            </Box>
                        </HStack>

                        <Separator />

                        {/* Papers */}
                        <Box>
                            <Text fontSize="xs" color="fg.muted" mb="1">所属试卷</Text>
                            {q.papers.length > 0 ? (
                                <VStack align="start" gap="1">
                                    {q.papers.map((p) => (
                                        <Link key={p.paper_id} to={`/papers/${p.paper_id}`}>
                                            <Text _hover={{ textDecoration: "underline" }} color="blue.fg">
                                                {p.title} — {p.description}
                                            </Text>
                                        </Link>
                                    ))}
                                </VStack>
                            ) : (
                                <Text color="fg.muted">未被组卷</Text>
                            )}
                        </Box>

                        <Separator />

                        <HStack fontSize="xs" color="fg.muted" gap="4">
                            <Text>创建: {new Date(q.created_at).toLocaleString()}</Text>
                            <Text>更新: {new Date(q.updated_at).toLocaleString()}</Text>
                        </HStack>
                    </Stack>
                </Card.Body>
            </Card.Root>

            {/* Reviewer management */}
            {canManageReviewersFn(role) && (
                <Card.Root>
                    <Card.Header>
                        <Heading size="md">审阅人管理</Heading>
                    </Card.Header>
                    <Card.Body>
                        <Stack gap="3">
                            {reviewers.length > 0 ? (
                                <VStack align="stretch" gap="1">
                                    {reviewers.map((r) => (
                                        <HStack key={r.reviewer_id} justify="space-between">
                                            <Text fontSize="sm">
                                                {r.display_name || r.username}
                                                <Text as="span" color="fg.muted" ml="1">(@{r.username})</Text>
                                            </Text>
                                            <IconButton
                                                aria-label="remove"
                                                size="xs"
                                                variant="ghost"
                                                colorPalette="red"
                                                onClick={() => handleRemoveReviewer(r.reviewer_id)}
                                            >
                                                <LuX />
                                            </IconButton>
                                        </HStack>
                                    ))}
                                </VStack>
                            ) : (
                                <Text fontSize="sm" color="fg.muted">暂无审阅人</Text>
                            )}
                            <Separator />
                            <UserSearchPicker
                                placeholder="搜索用户名或显示名添加审阅人…"
                                excludeIds={reviewers.map((r) => r.reviewer_id)}
                                filterRoles={["user", "leader"]}
                                onSelect={handleAddReviewer}
                                disabled={addingReviewer}
                            />
                        </Stack>
                    </Card.Body>
                </Card.Root>
            )}

            <ConfirmDialog
                open={confirmOpen}
                title="删除确认"
                description="确定要删除此题目吗？"
                onConfirm={handleDelete}
                onCancel={() => setConfirmOpen(false)}
            />

            <ConfirmDialog
                open={deleteDiffTag !== null}
                title="删除确认"
                description={`确定要删除难度「${deleteDiffTag}」吗？`}
                onConfirm={handleConfirmDeleteDifficulty}
                onCancel={() => setDeleteDiffTag(null)}
            />

            {/* Unified difficulty dialog (add & edit) */}
            <Dialog.Root
                open={diffDialogOpen}
                onOpenChange={(d) => { if (!d.open) closeDiffDialog() }}
                placement="center"
                size="lg"
            >
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title>{diffDialogMode === "add" ? "添加难度" : "编辑难度"}</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body>
                                <Stack gap="3">
                                    <HStack gap="2">
                                        <Input
                                            size="sm"
                                            placeholder="难度标签名 (如 human)"
                                            value={diffDialogTag}
                                            onChange={(e) => setDiffDialogTag(e.target.value)}
                                            disabled={diffDialogMode === "edit"}
                                        />
                                        <Input
                                            size="sm"
                                            type="number"
                                            min={1}
                                            max={10}
                                            value={diffDialogScore}
                                            onChange={(e) => setDiffDialogScore(Number(e.target.value) || 1)}
                                            maxW="80px"
                                            placeholder="1-10"
                                        />
                                    </HStack>
                                    <Tabs.Root defaultValue="edit" variant="line" size="sm">
                                        <Tabs.List>
                                            <Tabs.Trigger value="edit">编辑备注</Tabs.Trigger>
                                            <Tabs.Trigger value="preview"><LuEye /> 预览</Tabs.Trigger>
                                        </Tabs.List>
                                        <Tabs.Content value="edit">
                                            <Textarea
                                                size="sm"
                                                placeholder="备注（可选，支持 Markdown 和 LaTeX）"
                                                value={diffDialogNotes}
                                                onChange={(e) => setDiffDialogNotes(e.target.value)}
                                                rows={4}
                                            />
                                        </Tabs.Content>
                                        <Tabs.Content value="preview">
                                            <Box
                                                minH="100px"
                                                p="2"
                                                borderWidth="1px"
                                                borderRadius="md"
                                                fontSize="sm"
                                            >
                                                {diffDialogNotes.trim() ? (
                                                    <MarkdownRenderer>{diffDialogNotes}</MarkdownRenderer>
                                                ) : (
                                                    <Text color="fg.muted">无内容</Text>
                                                )}
                                            </Box>
                                        </Tabs.Content>
                                    </Tabs.Root>
                                </Stack>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button variant="outline" onClick={closeDiffDialog}>
                                    取消
                                </Button>
                                <Button
                                    colorPalette="blue"
                                    onClick={handleDiffDialogSave}
                                    loading={diffDialogSaving}
                                    disabled={!diffDialogTag.trim()}
                                >
                                    {diffDialogMode === "add" ? "添加" : "保存"}
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* Notes markdown preview dialog */}
            <Dialog.Root
                open={notesPreviewOpen}
                onOpenChange={(d) => { if (!d.open) setNotesPreviewOpen(false) }}
                placement="center"
                size="lg"
            >
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title>{notesPreviewTag} — 备注</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body>
                                <Box fontSize="sm">
                                    <MarkdownRenderer>{notesPreviewContent}</MarkdownRenderer>
                                </Box>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button variant="outline" onClick={() => setNotesPreviewOpen(false)}>关闭</Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </Stack>
    )
}

// ─── Difficulty Badge (view only, delegates edit to dialog) ──
function DifficultyBadge({
    label,
    score,
    notes,
    editorLabel,
    hasEditor,
    canEdit,
    canDelete,
    onEdit,
    onDelete,
    onNotesClick,
}: {
    tag: string
    label: string
    score: number
    notes?: string | null
    editorLabel: string
    hasEditor: boolean
    canEdit: boolean
    canDelete: boolean
    onEdit: () => void
    onDelete: () => void
    onNotesClick: () => void
}) {
    return (
        <HStack gap="1">
            <Badge
                colorPalette={hasEditor ? "purple" : "cyan"}
                variant="subtle"
                cursor={notes ? "pointer" : "default"}
                onClick={() => { if (notes) onNotesClick() }}
            >
                {label}: {score}/10{editorLabel}{notes ? " 💬" : ""}
            </Badge>
            {canEdit && (
                <IconButton
                    aria-label="编辑难度"
                    size="2xs"
                    variant="ghost"
                    onClick={onEdit}
                >
                    <LuPencil />
                </IconButton>
            )}
            {canDelete && (
                <IconButton
                    aria-label="删除难度"
                    size="2xs"
                    variant="ghost"
                    colorPalette="red"
                    onClick={onDelete}
                >
                    <LuX />
                </IconButton>
            )}
        </HStack>
    )
}
