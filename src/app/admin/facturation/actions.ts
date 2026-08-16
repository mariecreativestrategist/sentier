"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addPayment(formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  const learnerId = String(formData.get("learnerId") ?? "");
  const formationId = String(formData.get("formationId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const dueDate = String(formData.get("dueDate") ?? "");
  if (!learnerId || !formationId || !amount || !dueDate) return;

  await supabase.from("payments").insert({ learner_id: learnerId, formation_id: formationId, amount, due_date: dueDate });
  revalidatePath("/admin/facturation");
}

export async function updatePaymentStatus(paymentId: string, formData: FormData) {
  await requireProfile("coach");
  const supabase = await createClient();
  await supabase.from("payments").update({ status: String(formData.get("status") ?? "en_attente") }).eq("id", paymentId);
  revalidatePath("/admin/facturation");
}
