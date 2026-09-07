import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginScreen } from "./screens/LoginScreen";
import { ClientSearchScreen } from "./screens/ClientSearchScreen";
import { ClientFicheScreen } from "./screens/ClientFicheScreen";
import { AlertQueueScreen } from "./screens/AlertQueueScreen";
import { AdminScreen } from "./screens/AdminScreen";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/clients" replace />} />
            <Route path="/clients" element={<ClientSearchScreen />} />
            <Route path="/clients/:fid" element={<ClientFicheScreen />} />
            <Route
              path="/alertes"
              element={
                <ProtectedRoute allow={["AGENT_CONFORMITE", "SUPERVISEUR_SFD"]}>
                  <AlertQueueScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allow={["ADMIN_RESEAU"]}>
                  <AdminScreen />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
