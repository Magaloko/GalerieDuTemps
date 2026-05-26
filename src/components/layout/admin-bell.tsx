import Link from "next/link";
import { Bell } from "lucide-react";
import { ungeleseneCount } from "@/lib/notifications/lead-notify";

/**
 * Server-Component im Admin-Header. Zeigt Counter ungelesener Leads.
 * Wird bei jedem Render frisch geholt (dynamic). Counter ist auch
 * sichtbar im Sidebar-Inbox-Link.
 */
export async function AdminBell() {
  const count = await ungeleseneCount().catch(() => 0);

  return (
    <Link
      href="/admin/leads?status=neu"
      className="relative inline-flex items-center justify-center p-2 text-vintage-dust hover:text-vintage-brown hover:bg-vintage-parchment transition-colors"
      style={{ borderRadius: "var(--radius-vintage)" }}
      title={`${count} ungelesene Leads`}
    >
      <Bell className="w-4 h-4" />
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-vintage-burgundy text-vintage-cream text-[10px] font-sans font-semibold flex items-center justify-center"
          style={{ borderRadius: "999px" }}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
