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
import QuestionEditPage from "@/pages/QuestionEditPage"
import PapersListPage from "@/pages/PapersListPage"
import PaperDetailPage from "@/pages/PaperDetailPage"
import PaperCreatePage from "@/pages/PaperCreatePage"
import PaperEditPage from "@/pages/PaperEditPage"
import OpsPage from "@/pages/OpsPage"

import AdminLayout from "@/pages/admin/AdminLayout"
import AdminQuestionsPage from "@/pages/admin/AdminQuestionsPage"
import AdminPapersPage from "@/pages/admin/AdminPapersPage"
import GCPage from "@/pages/admin/GCPage"
import UsersPage from "@/pages/admin/UsersPage"

export default function App() {
  return (
    <BrowserRouter>
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
              <RequireAuth roles={["editor", "admin"]}><QuestionCreatePage /></RequireAuth>
            } />
            <Route path="/questions/:id" element={<QuestionDetailPage />} />
            <Route path="/questions/:id/edit" element={
              <RequireAuth roles={["editor", "admin"]}><QuestionEditPage /></RequireAuth>
            } />

            {/* Papers */}
            <Route path="/papers" element={<PapersListPage />} />
            <Route path="/papers/new" element={
              <RequireAuth roles={["editor", "admin"]}><PaperCreatePage /></RequireAuth>
            } />
            <Route path="/papers/:id" element={<PaperDetailPage />} />
            <Route path="/papers/:id/edit" element={
              <RequireAuth roles={["editor", "admin"]}><PaperEditPage /></RequireAuth>
            } />

            {/* Ops */}
            <Route path="/ops" element={
              <RequireAuth roles={["editor", "admin"]}><OpsPage /></RequireAuth>
            } />

            {/* Admin */}
            <Route path="/admin" element={
              <RequireAuth roles={["admin"]}><AdminLayout /></RequireAuth>
            }>
              <Route index element={<Navigate to="/admin/questions" replace />} />
              <Route path="questions" element={<AdminQuestionsPage />} />
              <Route path="papers" element={<AdminPapersPage />} />
              <Route path="gc" element={<GCPage />} />
              <Route path="users" element={<UsersPage />} />
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
