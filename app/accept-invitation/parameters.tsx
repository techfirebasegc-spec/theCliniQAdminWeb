"use client";
import { useSearchParams } from "next/navigation";
import { TenantOwnerInvitationAcceptance } from "../../src/components/tenant-owner-onboarding";
export function InvitationParameters() { const params = useSearchParams(); return <TenantOwnerInvitationAcceptance invitationId={params.get("invitationId") ?? ""} secret={params.get("secret") ?? ""} type={params.get("type") === "doctor" ? "doctor" : "owner"} />; }
