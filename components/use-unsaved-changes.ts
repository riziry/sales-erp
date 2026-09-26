"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUI } from "./ui-provider";
export function useUnsavedChanges(dirty: boolean, documentName: string) {
  const router = useRouter();
  const { confirm } = useUI();
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !dirty ||
        !link ||
        link.getAttribute("aria-disabled") === "true" ||
        link.target === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        link.origin !== location.origin ||
        link.href === location.href ||
        (link.pathname === location.pathname && link.hash)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      void confirm({
        title: "Leave without saving?",
        description: `Your ${documentName} has unsaved changes. Save it to keep your work, or leave to discard these edits.`,
        confirmLabel: "Leave without saving",
        danger: true,
      }).then((leave) => {
        if (leave) router.push(link.pathname + link.search + link.hash);
      });
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, documentName, router, confirm]);
}
