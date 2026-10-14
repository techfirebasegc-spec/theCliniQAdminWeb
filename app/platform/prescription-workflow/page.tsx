import { AdminShell } from '../../../src/components/admin-shell';
import { PrescriptionWorkflowPage } from '../../../src/components/prescription-workflow';
import { ProtectedRoute } from '../../../src/components/protected-route';
export default function Page(){return <ProtectedRoute><AdminShell><PrescriptionWorkflowPage/></AdminShell></ProtectedRoute>}
