import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomerAvatar } from "@/components/CustomerAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { notify } from "@/lib/notify";
import { ACCEPTED_AVATAR_TYPES, removeCustomerAvatar, uploadCustomerAvatar } from "@/lib/customer-avatar";
import type { DbCustomer } from "@/hooks/useData";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer: DbCustomer | null;
  onSaved?: () => void;
}

export function EditCustomerDialog({ open, onOpenChange, customer, onSaved }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone || "");
      setEmail(customer.email || "");
      setAvatarPath((customer as DbCustomer & { avatar_url?: string | null }).avatar_url ?? null);
    }
  }, [customer]);

  const pickPhoto = async (file: File | undefined) => {
    if (!file || !customer || !user) return;
    setUploading(true);
    try {
      const path = await uploadCustomerAvatar(user.id, customer.id, file);
      const { error } = await supabase.from("customers").update({ avatar_url: path }).eq("id", customer.id);
      if (error) throw new Error(error.message);
      if (avatarPath) await removeCustomerAvatar(avatarPath);
      setAvatarPath(path);
      onSaved?.();
      toast({ title: "Photo updated" });
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const deletePhoto = async () => {
    if (!customer || !avatarPath) return;
    setUploading(true);
    await supabase.from("customers").update({ avatar_url: null }).eq("id", customer.id);
    await removeCustomerAvatar(avatarPath);
    setAvatarPath(null);
    setUploading(false);
    onSaved?.();
    toast({ title: "Photo removed" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setBusy(true);
    const { error } = await supabase.from("customers")
      .update({ name, phone: phone || null, email: email || null })
      .eq("id", customer.id);
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Customer updated" });
    notify({ title: "Customer updated", body: name, category: "customer", link: `/customers/${customer.id}` });
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-4">
            <CustomerAvatar name={name || "?"} avatarPath={avatarPath} className="h-16 w-16 text-base" />
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_AVATAR_TYPES.join(",")}
                className="hidden"
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
              <Button type="button" variant="outline" size="sm" className="gap-2 rounded-xl"
                disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {avatarPath ? "Replace photo" : "Upload photo"}
              </Button>
              {avatarPath && (
                <Button type="button" variant="ghost" size="sm" className="gap-2 rounded-xl text-destructive"
                  disabled={uploading} onClick={deletePhoto}>
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </Button>
              )}
              <p className="w-full text-[11px] text-muted-foreground">JPG, PNG or WEBP · max 5 MB</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-xl">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
