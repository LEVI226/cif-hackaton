import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginScreen } from "./screens/LoginScreen";
import { ClientSearchScreen } from "./screens/ClientSearchScreen";
import { ClientFicheScreen } from "./screens/ClientFicheScreen";
import { AlertQueueScreen } from "./screens/AlertQueueScreen";
import { AdminScreen } from "./screens/AdminScreen";
import type { Role } from "./types/api";

const CLIENT_ROLES: Role[] = ["AGENT_GUICHET", "AGENT_CONFORMITE", "SUPERVISEUR_SFD", "CONFORMITE_RESEAU", "AUDITEUR"];
const ALERT_ROLES: Role[] = ["AGENT_CONFORMITE", "SUPERVISEUR_SFD", "CONFORMITE_RESEAU", "AUDITEUR"];

function HomeRedirect() {
  const { role } = useAuth();
  // ADMIN_RESEAU n'a pas acces aux donnees client (separation des taches) -
  // l'envoyer sur /clients ne montrerait qu'un ecran d'erreur 403.
  return <Navigate to={role === "ADMIN_RESEAU" ? "/admin" : "/clients"} replace />;
}

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
            <Route path="/" element={<HomeRedirect />} />
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
