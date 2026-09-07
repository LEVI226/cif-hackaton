import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { Role } from "../types/api";
import type { ReactNode } from "react";

export function ProtectedRoute({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: Role[];
}) {
  const { token, role } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (allow && (!role || !allow.includes(role))) {
    return (
      <div className="error-banner">
        Ce role ({role}) n'a pas acces a cette page.
      </div>
    );
  }
  return <>{children}</>;
}
