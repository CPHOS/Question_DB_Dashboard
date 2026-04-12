import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./token"
import type {
    TokenResponse,
    LoginRequest,
    User,
    Paginated,
    QuestionSummary,
    QuestionDetail,
    CreateDifficultyRequest,
    UpdateDifficultyRequest,
    QuestionsQuery,
    PaperSummary,
    PaperDetail,
    PaperPatchRequest,
    PapersQuery,
    AdminQuestionSummary,
    AdminQuestionDetail,
    AdminQuestionsQuery,
    AdminPaperSummary,
    AdminPaperDetail,
    AdminPapersQuery,
    GCResult,
    CreateUserRequest,
    UpdateUserRequest,
    ExportRequest,
    ExportResult,
    QualityCheckRequest,
    QualityCheckResult,
    ReviewerInfo,
} from "@/types"

const BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8080"

// ─── helpers ─────────────────────────────────────────────

async function refreshAccessToken(): Promise<boolean> {
    const rt = getRefreshToken()
    if (!rt) return false
    try {
        const res = await fetch(`${BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: rt }),
        })
        if (!res.ok) return false
        const data: TokenResponse = await res.json()
        setTokens(data.access_token, data.refresh_token)
        return true
    } catch {
        return false
    }
}

async function request<T>(
    path: string,
    init: RequestInit = {},
): Promise<T> {
    const headers = new Headers(init.headers)
    const token = getAccessToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)
    if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
        headers.set("Content-Type", "application/json")
    }

    let res = await fetch(`${BASE}${path}`, { ...init, headers })

    if (res.status === 401) {
        const ok = await refreshAccessToken()
        if (ok) {
            const h2 = new Headers(init.headers)
            h2.set("Authorization", `Bearer ${getAccessToken()!}`)
            if (!h2.has("Content-Type") && !(init.body instanceof FormData)) {
                h2.set("Content-Type", "application/json")
            }
            res = await fetch(`${BASE}${path}`, { ...init, headers: h2 })
        } else {
            clearTokens()
            const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "")
            window.location.href = `${base}/login`
            throw new ApiError(401, "session expired")
        }
    }

    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new ApiError(res.status, (body as Record<string, string>).error ?? res.statusText)
    }
    if (res.headers.get("content-type")?.includes("application/json")) {
        return res.json() as Promise<T>
    }
    return res.blob() as unknown as T
}

export class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
        super(message)
        this.status = status
    }
}

function qs(params: { [key: string]: unknown }): string {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") sp.set(k, String(v))
    }
    const s = sp.toString()
    return s ? `?${s}` : ""
}

// ─── System ──────────────────────────────────────────────

export async function getVersion(): Promise<{ version: string }> {
    const res = await fetch(`${BASE}/version`)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
}

// ─── Auth ────────────────────────────────────────────────

export async function login(body: LoginRequest): Promise<TokenResponse> {
    const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new ApiError(res.status, (b as Record<string, string>).error ?? "login failed")
    }
    const data: TokenResponse = await res.json()
    setTokens(data.access_token, data.refresh_token)
    return data
}

export async function logout(): Promise<void> {
    const rt = getRefreshToken()
    if (rt) {
        await request("/auth/logout", {
            method: "POST",
            body: JSON.stringify({ refresh_token: rt }),
        }).catch(() => { })
    }
    clearTokens()
}

export async function getMe(): Promise<User> {
    return request<User>("/auth/me")
}

export async function changePassword(old_password: string, new_password: string) {
    return request<{ message: string }>("/auth/me/password", {
        method: "PATCH",
        body: JSON.stringify({ old_password, new_password }),
    })
}

// ─── Questions ───────────────────────────────────────────

export async function getQuestions(q: QuestionsQuery = {}) {
    return request<Paginated<QuestionSummary>>(`/questions${qs({ ...q })}`)
}

export async function getQuestionTags() {
    return request<{ tags: string[] }>("/questions/tags")
}

export async function getQuestionDifficultyTags() {
    return request<{ difficulty_tags: string[] }>("/questions/difficulty-tags")
}

export async function getQuestion(id: string) {
    return request<QuestionDetail>(`/questions/${id}`)
}

export async function createQuestion(form: FormData) {
    return request<{ question_id: string; status: string }>("/questions", {
        method: "POST",
        body: form,
    })
}

export async function patchQuestionDescription(id: string, description: string) {
    return request<QuestionDetail>(`/questions/${id}/description`, {
        method: "PATCH",
        body: JSON.stringify({ description }),
    })
}

export async function patchQuestionCategory(id: string, category: "none" | "T" | "E") {
    return request<QuestionDetail>(`/questions/${id}/category`, {
        method: "PATCH",
        body: JSON.stringify({ category }),
    })
}

export async function patchQuestionTags(id: string, tags: string[]) {
    return request<QuestionDetail>(`/questions/${id}/tags`, {
        method: "PATCH",
        body: JSON.stringify({ tags }),
    })
}

export async function patchQuestionStatus(id: string, status: "none" | "reviewed" | "used") {
    return request<QuestionDetail>(`/questions/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    })
}

export async function createDifficulty(id: string, body: CreateDifficultyRequest) {
    return request<QuestionDetail>(`/questions/${id}/difficulties`, {
        method: "POST",
        body: JSON.stringify(body),
    })
}

export async function updateDifficulty(id: string, algorithmTag: string, body: UpdateDifficultyRequest) {
    return request<QuestionDetail>(`/questions/${id}/difficulties/${encodeURIComponent(algorithmTag)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
    })
}

export async function deleteDifficulty(id: string, algorithmTag: string) {
    return request<QuestionDetail>(`/questions/${id}/difficulties/${encodeURIComponent(algorithmTag)}`, {
        method: "DELETE",
    })
}

export async function patchQuestionAuthor(id: string, author: string) {
    return request<QuestionDetail>(`/questions/${id}/author`, {
        method: "PATCH",
        body: JSON.stringify({ author }),
    })
}

export async function patchQuestionReviewerNames(id: string, reviewers: string[]) {
    return request<QuestionDetail>(`/questions/${id}/reviewer-names`, {
        method: "PATCH",
        body: JSON.stringify({ reviewers }),
    })
}

export async function replaceQuestionFile(id: string, form: FormData) {
    return request(`/questions/${id}/file`, { method: "PUT", body: form })
}

export async function deleteQuestion(id: string) {
    return request<{ question_id: string; status: string }>(`/questions/${id}`, { method: "DELETE" })
}

export async function getQuestionReviewers(id: string) {
    return request<{ reviewers: ReviewerInfo[] }>(`/questions/${id}/reviewers`)
}

export async function addQuestionReviewer(questionId: string, reviewerId: string) {
    return request<{ reviewers: ReviewerInfo[] }>(`/questions/${questionId}/reviewers`, {
        method: "POST",
        body: JSON.stringify({ reviewer_id: reviewerId }),
    })
}

export async function removeQuestionReviewer(questionId: string, reviewerId: string) {
    return request<{ reviewers: ReviewerInfo[] }>(`/questions/${questionId}/reviewers/${reviewerId}`, {
        method: "DELETE",
    })
}

export async function bundleQuestions(ids: string[]) {
    return request<Blob>("/questions/bundles", {
        method: "POST",
        body: JSON.stringify({ question_ids: ids }),
    })
}

// ─── Papers ──────────────────────────────────────────────

export async function getPapers(q: PapersQuery = {}) {
    return request<Paginated<PaperSummary>>(`/papers${qs({ ...q })}`)
}

export async function getPaper(id: string) {
    return request<PaperDetail>(`/papers/${id}`)
}

export async function createPaper(form: FormData) {
    return request<{ paper_id: string; status: string }>("/papers", {
        method: "POST",
        body: form,
    })
}

export async function patchPaper(id: string, body: PaperPatchRequest) {
    return request<PaperDetail>(`/papers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
    })
}

export async function replacePaperFile(id: string, form: FormData) {
    return request(`/papers/${id}/file`, { method: "PUT", body: form })
}

export async function deletePaper(id: string) {
    return request<{ paper_id: string; status: string }>(`/papers/${id}`, { method: "DELETE" })
}

export async function bundlePapers(ids: string[]) {
    return request<Blob>("/papers/bundles", {
        method: "POST",
        body: JSON.stringify({ paper_ids: ids }),
    })
}

// ─── Admin ───────────────────────────────────────────────

export async function adminGetQuestions(q: AdminQuestionsQuery = {}) {
    return request<Paginated<AdminQuestionSummary>>(`/admin/questions${qs({ ...q })}`)
}

export async function adminGetQuestion(id: string) {
    return request<AdminQuestionDetail>(`/admin/questions/${id}`)
}

export async function adminRestoreQuestion(id: string) {
    return request(`/admin/questions/${id}/restore`, { method: "POST" })
}

export async function adminGetPapers(q: AdminPapersQuery = {}) {
    return request<Paginated<AdminPaperSummary>>(`/admin/papers${qs({ ...q })}`)
}

export async function adminGetPaper(id: string) {
    return request<AdminPaperDetail>(`/admin/papers/${id}`)
}

export async function adminRestorePaper(id: string) {
    return request(`/admin/papers/${id}/restore`, { method: "POST" })
}

export async function gcPreview() {
    return request<GCResult>("/admin/garbage-collections/preview", {
        method: "POST",
        body: JSON.stringify({}),
    })
}

export async function gcRun() {
    return request<GCResult>("/admin/garbage-collections/run", {
        method: "POST",
        body: JSON.stringify({}),
    })
}

export async function adminGetUsers(limit = 20, offset = 0) {
    return request<Paginated<User>>(`/admin/users${qs({ limit, offset } as { [key: string]: unknown })}`)
}

export async function searchUsers(q: string, limit = 10) {
    return request<Paginated<User>>(`/users/search${qs({ q, limit } as { [key: string]: unknown })}`)
}

export async function adminCreateUser(body: CreateUserRequest) {
    return request<User>("/admin/users", {
        method: "POST",
        body: JSON.stringify(body),
    })
}

export async function adminUpdateUser(id: string, body: UpdateUserRequest) {
    return request<User>(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
    })
}

export async function adminDeleteUser(id: string) {
    return request<{ message: string }>(`/admin/users/${id}`, { method: "DELETE" })
}

export async function adminResetPassword(id: string, new_password: string) {
    return request<{ message: string }>(`/admin/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ new_password }),
    })
}

// ─── Ops ─────────────────────────────────────────────────

export async function runExport(body: ExportRequest) {
    return request<ExportResult>("/exports/run", {
        method: "POST",
        body: JSON.stringify(body),
    })
}

export async function runQualityCheck(body: QualityCheckRequest) {
    return request<QualityCheckResult>("/quality-checks/run", {
        method: "POST",
        body: JSON.stringify(body),
    })
}

// ─── Database ────────────────────────────────────────────

export async function databaseBackup() {
    return request<Blob>("/database/backup")
}

export async function databaseRestore(form: FormData) {
    return request<import("@/types").DatabaseRestoreResult>("/database/restore", {
        method: "POST",
        body: form,
    })
}

// ─── System ──────────────────────────────────────────────

export async function healthCheck() {
    return request<{ status: string; service: string }>("/health")
}
