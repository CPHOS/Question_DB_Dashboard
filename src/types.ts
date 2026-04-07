// ─── Pagination ──────────────────────────────────────────
export interface Paginated<T> {
    items: T[]
    total: number
    limit: number
    offset: number
}

// ─── Auth ────────────────────────────────────────────────
export interface LoginRequest {
    username: string
    password: string
}

export interface TokenResponse {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
}

export interface User {
    user_id: string
    username: string
    display_name: string
    role: "viewer" | "editor" | "admin"
    is_active: boolean
    created_at: string
    updated_at: string
}

// ─── Questions ───────────────────────────────────────────
export interface DifficultyValue {
    score: number
    notes?: string | null
}

export type Difficulty = Record<string, DifficultyValue>

export interface QuestionSummary {
    question_id: string
    description: string
    category: "none" | "T" | "E"
    tags: string[]
    status: "none" | "reviewed" | "used"
    score: number | null
    difficulty: Difficulty
    author: string
    reviewers: string[]
    created_at: string
    updated_at: string
}

export interface QuestionDetail extends QuestionSummary {
    source_tex_path: string
    papers: PaperSummary[]
}

export interface AdminQuestionSummary extends QuestionSummary {
    deleted_at: string | null
    deleted_by: string | null
    is_deleted: boolean
}

export interface AdminQuestionDetail extends QuestionDetail {
    deleted_at: string | null
    deleted_by: string | null
    is_deleted: boolean
}

export interface QuestionPatchRequest {
    category?: "none" | "T" | "E"
    description?: string
    tags?: string[]
    status?: "none" | "reviewed" | "used"
    difficulty?: Difficulty
    author?: string
    reviewers?: string[]
}

export interface QuestionsQuery {
    paper_id?: string
    category?: string
    tag?: string
    score_min?: number
    score_max?: number
    difficulty_tag?: string
    difficulty_min?: number
    difficulty_max?: number
    q?: string
    limit?: number
    offset?: number
}

// ─── Papers ──────────────────────────────────────────────
export interface PaperSummary {
    paper_id: string
    description: string
    title: string
    subtitle: string
    question_count?: number
    created_at: string
    updated_at: string
}

export interface PaperDetail extends PaperSummary {
    questions: QuestionSummary[]
}

export interface AdminPaperSummary extends PaperSummary {
    deleted_at: string | null
    deleted_by: string | null
    is_deleted: boolean
}

export interface AdminPaperDetail extends PaperDetail {
    deleted_at: string | null
    deleted_by: string | null
    is_deleted: boolean
}

export interface PaperPatchRequest {
    description?: string
    title?: string
    subtitle?: string
    question_ids?: string[]
}

export interface PapersQuery {
    question_id?: string
    category?: string
    tag?: string
    q?: string
    limit?: number
    offset?: number
}

// ─── Admin ───────────────────────────────────────────────
export interface AdminQuestionsQuery extends QuestionsQuery {
    state?: "active" | "deleted" | "all"
}

export interface AdminPapersQuery extends PapersQuery {
    state?: "active" | "deleted" | "all"
}

export interface GCResult {
    dry_run: boolean
    deleted_questions: number
    deleted_papers: number
    deleted_objects: number
    freed_bytes: number
}

export interface CreateUserRequest {
    username: string
    password: string
    display_name?: string
    role?: "viewer" | "editor" | "admin"
}

export interface UpdateUserRequest {
    display_name?: string
    role?: "viewer" | "editor" | "admin"
    is_active?: boolean
}

// ─── Ops ─────────────────────────────────────────────────
export interface ExportRequest {
    format: "jsonl" | "csv"
    public: boolean
    output_path?: string
}

export interface ExportResult {
    format: string
    public: boolean
    output_path: string
    exported_questions: number
}

export interface QualityCheckRequest {
    output_path?: string
}

export interface QualityCheckResult {
    output_path: string
    report: Record<string, unknown>
}

export interface DatabaseRestoreResult {
    file_name: string
    restored_bytes: number
    status: string
}
