import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/contexts/AuthContext"
import { Toaster } from "@/components/ui/toaster"
import RequireAuth from "@/components/RequireAuth"
import AppLayout from "@/components/AppLayout"

import LoginPage from "@/pages/LoginPage"
import ProfilePage from "@/pages/ProfilePage"
import QuestionsListPage from "@/pages/QuestionsListPage"
import QuestionDetailPage from "@/pages/QuestionDetailPage"
import QuestionCreatePage from "@/pages/QuestionCreatePage"
import PapersListPage from "@/pages/PapersListPage"
import PaperDetailPage from "@/pages/PaperDetailPage"
import PaperCreatePage from "@/pages/PaperCreatePage"
import OpsPage from "@/pages/OpsPage"

import AdminLayout from "@/pages/admin/AdminLayout"
import AdminQuestionsPage from "@/pages/admin/AdminQuestionsPage"
import AdminPapersPage from "@/pages/admin/AdminPapersPage"
import GCPage from "@/pages/admin/GCPage"
import UsersPage from "@/pages/admin/UsersPage"

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/+$/, "")

  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            {/* Questions */}
            <Route path="/questions" element={<QuestionsListPage />} />
            <Route path="/questions/new" element={
              <RequireAuth roles={["user", "leader", "admin"]}><QuestionCreatePage /></RequireAuth>
            } />
            <Route path="/questions/:id" element={<QuestionDetailPage />} />

            {/* Papers */}
            <Route path="/papers" element={<PapersListPage />} />
            <Route path="/papers/new" element={
              <RequireAuth roles={["leader", "admin"]}><PaperCreatePage /></RequireAuth>
            } />
            <Route path="/papers/:id" element={<PaperDetailPage />} />

            {/* Admin */}
            <Route path="/admin" element={
              <RequireAuth roles={["admin"]}><AdminLayout /></RequireAuth>
            }>
              <Route index element={<Navigate to="/admin/questions" replace />} />
              <Route path="questions" element={<AdminQuestionsPage />} />
              <Route path="papers" element={<AdminPapersPage />} />
              <Route path="gc" element={<GCPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="ops" element={<OpsPage />} />
            </Route>

            {/* Profile */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/questions" replace />} />
          </Route>
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
