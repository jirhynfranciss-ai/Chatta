import { supabase } from "@/lib/supabase";

export type AdminAction =
  | "LOGIN"
  | "LOGOUT"
  | "VIEW_RESPONSE"
  | "EDIT_RESPONSE"
  | "DELETE_RESPONSE"
  | "SEND_MESSAGE"
  | "DELETE_MESSAGE"
  | "CREATE_QUESTION"
  | "EDIT_QUESTION"
  | "DELETE_QUESTION"
  | "UPDATE_SETTINGS";

export async function logAdminActivity(adminId: string, action: AdminAction, resource?: string, resourceId?: string) {
  try {
    await supabase.from("admin_activity").insert({
      admin_id: adminId,
      action,
      resource: resource ?? null,
      resource_id: resourceId ?? null,
    });
  } catch {
    // Activity logging must never block the primary admin action.
  }
}
