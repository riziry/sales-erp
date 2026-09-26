import type { Locator, Page } from "@playwright/test";
export async function selectOption(
  scope: Page | Locator,
  label: string,
  option: string,
) {
  const trigger = scope.getByRole("combobox", { name: label, exact: true });
  await trigger.click();
  // Options use a portal; resolve from the owning page, even for nested forms.
  const page = "page" in scope ? scope.page() : scope;
  await page.getByRole("option", { name: option, exact: true }).click();
}
