import { Suspense } from "react";
import { InvitationParameters } from "./parameters";
export default function AcceptInvitationPage() { return <Suspense fallback={<main className="login-page">Loading invitation…</main>}><InvitationParameters /></Suspense>; }
