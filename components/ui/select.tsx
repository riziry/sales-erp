"use client";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Children, isValidElement, type ReactNode } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { usePortalContainer } from "./portal";
export type SelectChoice = { value: string; label: string; disabled?: boolean };
const EMPTY = "__sales_erp_empty__";
function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? text(child.props.children)
        : String(child),
    )
    .join("");
}
export function selectChoices(children: ReactNode): SelectChoice[] {
  const choices: SelectChoice[] = [];
  Children.forEach(children, (child) => {
    if (
      !isValidElement<{
        value?: string;
        children?: ReactNode;
        disabled?: boolean;
      }>(child)
    )
      return;
    if (child.type === "option")
      choices.push({
        value: String(child.props.value ?? text(child.props.children)),
        label: text(child.props.children),
        disabled: child.props.disabled,
      });
    else choices.push(...selectChoices(child.props.children));
  });
  return choices;
}
export function SelectControl({
  label,
  value,
  onChange,
  choices,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  choices: SelectChoice[];
  disabled?: boolean;
}) {
  const { container, anchorRef } = usePortalContainer();
  return (
    <SelectPrimitive.Root
      value={value || EMPTY}
      onValueChange={(value) => onChange(value === EMPTY ? "" : value)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        ref={anchorRef}
        className="select-trigger"
        aria-label={label}
      >
        <SelectPrimitive.Value placeholder="Choose an option" />
        <SelectPrimitive.Icon>
          <ChevronDown size={16} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={container}>
        <SelectPrimitive.Content
          className="select-content"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          onEscapeKeyDown={(event) => event.stopPropagation()}
        >
          <SelectPrimitive.ScrollUpButton className="select-scroll">
            <ChevronUp size={16} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="select-viewport">
            {choices.map((choice) => (
              <SelectPrimitive.Item
                className="select-item"
                key={choice.value}
                value={choice.value || EMPTY}
                disabled={choice.disabled}
              >
                <SelectPrimitive.ItemText>
                  {choice.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check size={16} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="select-scroll">
            <ChevronDown size={16} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
