import type { DashboardData } from "./types";

export const mockDashboard: DashboardData = {
  sourceLabel: "Development mock data — not connected to live Platform operations.",
  permissions: ["dashboard.view", "doctor.view", "service.view", "availability.view", "appointment.view", "patient.view", "order.view", "payment.view", "refund.view", "report.view", "content.view", "employee.view", "role.view", "audit.view", "settings.manage"],
  metrics: [
    { label: "Appointments", value: "128", change: "+12% this week", tone: "navy" }, { label: "Patients", value: "1,842", change: "+8% this month", tone: "teal" }, { label: "Doctors", value: "48", change: "4 pending review", tone: "violet" }, { label: "Revenue", value: "₹4.8L", change: "+6% this week", tone: "amber" }, { label: "Pending orders", value: "16", change: "Requires follow-up", tone: "navy" }, { label: "Open enquiries", value: "9", change: "3 new today", tone: "teal" },
  ],
  appointmentTrend: [32, 48, 41, 56, 49, 68, 63, 77, 70, 86, 81, 94], revenueTrend: [22, 31, 28, 44, 39, 52, 46, 62, 57, 72, 68, 82],
  appointments: [{ patient: "Aarav Shah", service: "General consultation", time: "09:30", status: "Confirmed" }, { patient: "Mira Nair", service: "Follow-up care", time: "10:15", status: "In progress" }, { patient: "Kabir Mehta", service: "Specialist consultation", time: "11:00", status: "Pending" }, { patient: "Ishita Rao", service: "General consultation", time: "11:45", status: "Confirmed" }],
  actions: [{ title: "Review 4 doctor profiles", detail: "Verification documents are awaiting review.", action: "Open doctors" }, { title: "Resolve 3 payment exceptions", detail: "Payment outcomes need operational review.", action: "Open payments" }, { title: "Confirm holiday coverage", detail: "Two availability schedules end this week.", action: "Open availability" }],
  availability: [{ name: "Dr. Priya Nair", detail: "14 slots · Today", status: "Available" }, { name: "Dr. Rohan Kapoor", detail: "6 slots · Today", status: "Limited" }, { name: "Dr. Meera Das", detail: "No slots · Today", status: "Unavailable" }],
  enquiries: [{ from: "Rhea Patel", subject: "Service availability", time: "12 min ago" }, { from: "Nikhil Gupta", subject: "Corporate care enquiry", time: "48 min ago" }, { from: "Aditi Menon", subject: "Follow-up request", time: "1 hr ago" }],
};
