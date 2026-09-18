import { ReminderNotifier } from "@/components/dashboard/ReminderNotifier";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ReminderNotifier />
      {children}
    </>
  );
}
