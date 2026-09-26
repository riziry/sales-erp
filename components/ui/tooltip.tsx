"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactElement } from "react";
import { usePortalContainer } from "./portal";
export default function Hint({
  text,
  children,
}: {
  text: string;
  children: ReactElement;
}) {
  const { container, anchorRef } = usePortalContainer();
  return (
    <Tooltip.Provider delayDuration={350}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild ref={anchorRef}>
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal container={container}>
          <Tooltip.Content className="tooltip-content" sideOffset={7}>
            {text}
            <Tooltip.Arrow className="tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
