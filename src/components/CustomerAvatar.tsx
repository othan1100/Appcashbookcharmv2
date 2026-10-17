import { useEffect, useState } from "react";
import { signedAvatarUrl } from "@/lib/customer-avatar";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

interface Props {
  name: string;
  avatarPath?: string | null;
  className?: string;
}

/** Avatar for a customer. Resolves the private storage path to a signed URL. */
export function CustomerAvatar({ name, avatarPath, className }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    signedAvatarUrl(avatarPath).then((u) => { if (active) setUrl(u); });
    return () => { active = false; };
  }, [avatarPath]);

  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={`${name} profile photo`} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
