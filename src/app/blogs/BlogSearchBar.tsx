"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function BlogSearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function navigate(q: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) {
      params.set("q", q.trim());
    } else {
      params.delete("q");
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className={`search-input${isPending ? " search-input--pending" : ""}`}>
      <span>⌕</span>
      <input
        defaultValue={defaultValue}
        placeholder="Tìm bài viết, chủ đề..."
        onChange={(e) => {
          const val = e.target.value;
          if (val === "" || val.length >= 2) navigate(val);
        }}
      />
    </div>
  );
}
