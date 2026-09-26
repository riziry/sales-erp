import { expect, type Page } from "@playwright/test";
export function watchRenderingWarnings(page: Page) {
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (
      /either width or height modified|Detected.*scroll-behavior/i.test(
        message.text(),
      )
    )
      warnings.push(message.text().slice(0, 120));
  });
  return async () => {
    await expect(page.locator("html")).toHaveAttribute(
      "data-scroll-behavior",
      "smooth",
    );
    expect(warnings).toEqual([]);
  };
}
