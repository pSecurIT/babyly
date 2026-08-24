"use server";

import { redirect } from "next/navigation";
import { clearSession, readAdminSession } from "@/lib/session";

export async function logoutAction() {
  const adminSession = await readAdminSession();
  await clearSession();
  redirect(adminSession ? "/admin/login" : "/");
}
