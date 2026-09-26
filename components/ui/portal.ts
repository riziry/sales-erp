"use client";
import { useCallback, useState } from "react";
// Native dialogs live in the top layer. Nested custom popovers must stay inside
// that dialog instead of being portaled behind its inert backdrop.
export function usePortalContainer() {
  const [container, setContainer] = useState<HTMLElement>();
  const anchorRef = useCallback((element: HTMLElement | null) => {
    if (element) setContainer(element.closest("dialog") || document.body);
  }, []);
  return { container, anchorRef };
}
