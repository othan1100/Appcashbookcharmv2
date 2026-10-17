import { supabase } from "@/integrations/supabase/client";

const BUCKET = "avatars";
export const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/** Path layout must start with the owner's uid — storage RLS scopes on folder[1]. */
function pathFor(userId: string, customerId: string, ext: string) {
  return `${userId}/customers/${customerId}-${Date.now()}.${ext}`;
}

export async function uploadCustomerAvatar(userId: string, customerId: string, file: File) {
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG and WEBP images are supported.");
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be smaller than 5 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = pathFor(userId, customerId, ext);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

export async function removeCustomerAvatar(path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
}

/** Private bucket → short-lived signed URL for display. */
export async function signedAvatarUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
