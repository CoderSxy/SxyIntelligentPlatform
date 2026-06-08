import { TaskStatus } from "@/lib/types";

const taskStyles: Record<TaskStatus, string> = {
  queued: "bg-slate-100 text-slate-700",
  running: "bg-blue-100 text-blue-700",
  succeeded: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-amber-100 text-amber-700"
};

export function StatusBadge({
  children,
  status
}: {
  children: React.ReactNode;
  status?: TaskStatus;
}) {
  const style = status ? taskStyles[status] : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium ${style}`}>
      {children}
    </span>
  );
}

