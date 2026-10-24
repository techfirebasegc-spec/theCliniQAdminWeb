"use client";
import { AdminShell } from '../../../src/components/admin-shell';
import { ClinicalCataloguePage } from '../../../src/components/clinical-catalogue';
import { ProtectedRoute } from '../../../src/components/protected-route';
export default function Page(){return <ProtectedRoute><AdminShell><ClinicalCataloguePage/></AdminShell></ProtectedRoute>}
