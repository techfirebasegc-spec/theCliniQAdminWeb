"use client";
import { AdminShell } from "../../../src/components/admin-shell";
import { ProfessionalClassificationsPage } from "../../../src/components/professional-classifications";
import { ProtectedRoute } from "../../../src/components/protected-route";
export default function Page(){return <ProtectedRoute><AdminShell><ProfessionalClassificationsPage/></AdminShell></ProtectedRoute>;}
