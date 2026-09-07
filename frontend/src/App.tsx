import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { ClientSearchScreen } from "./screens/ClientSearchScreen";
import { ClientFicheScreen } from "./screens/ClientFicheScreen";
import { AlertQueueScreen } from "./screens/AlertQueueScreen";
import { AdminScreen } from "./screens/AdminScreen";
import type { Role } from "./types/api";

const CLIENT_ROLES: Role[] = ["AGENT_GUICHET", "AGENT_CONFORMITE", "SUPERVISEUR_SFD", "CONFORMITE_RESEAU", "AUDITEUR"];
const ALERT_ROLES: Role[] = ["AGENT_CONFORMITE", "SUPERVISEUR_SFD", "CONFORMITE_RESEAU", "AUDITEUR"];

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
            {/* Accessible a tous les roles authentifies, ADMIN_RESEAU inclus :
                aucun nom de client n'y figure, uniquement des compteurs agreges -
                la separation des taches (cf. corpus RBAC) porte sur les DONNEES
                client, pas sur ces statistiques. */}
            <Route path="/" element={<DashboardScreen />} />
            <Route
              path="/clients"
              element={
                <ProtectedRoute allow={CLIENT_ROLES}>
                  <ClientSearchScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients/:fid"
              element={
                <ProtectedRoute allow={CLIENT_ROLES}>
                  <ClientFicheScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alertes"
              element={
                <ProtectedRoute allow={ALERT_ROLES}>
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
