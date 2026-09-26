import { watchRenderingWarnings } from "./rendering-warnings";
import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
import AxeBuilder from "@axe-core/playwright";

async function saveProfile(page: Page) {
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByText("Profile saved successfully.", { exact: true }),
  ).toBeVisible();
}
async function createQuotation(page: Page, event: string) {
  await page.goto("/quotation/new");
  await page
    .getByLabel("Customer / company name", { exact: true })
    .fill("Logo Client");
  await page.getByLabel("Event / project", { exact: true }).fill(event);
  await page.getByRole("button", { name: "Custom item", exact: false }).click();
  await page
    .getByLabel("Item name", { exact: true })
    .fill("Production service");
  await page
    .getByLabel("Selling price per unit", { exact: true })
    .fill("1000000");
  await page.getByLabel("Cost per unit", { exact: true }).fill("500000");
  await page
    .getByRole("button", { name: "Save draft", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/quotation\/[a-f0-9-]{36}$/);
  return page.url();
}
test("company logo upload, replacement, removal, protected save and quotation PDF snapshots", async ({
  page,
}) => {
  const checkRenderingWarnings = watchRenderingWarnings(page);
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("test@yw.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-internal-password");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/quotation$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profile");
  const input = page.getByLabel("Company logo image", { exact: true });
  await input.setInputFiles({
    name: "unsafe.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(
    page.getByText("Choose a PNG, JPG, or WebP image smaller than 5 MB."),
  ).toBeVisible();
  const first = await sharp(
    Buffer.from(
      '<svg width="400" height="160"><rect x="5" y="5" width="140" height="140" rx="30" fill="#315bd2"/><path d="M35 40 L75 110 L115 40" fill="none" stroke="white" stroke-width="16"/><path d="M180 50 H390 M180 80 H345 M180 110 H375" stroke="#203050" stroke-width="12"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  await input.setInputFiles({
    name: "company.png",
    mimeType: "image/png",
    buffer: first,
  });
  await expect(page.getByAltText("Company logo preview")).toBeVisible();
  await saveProfile(page);
  await page.reload();
  const originalLogo = await page
    .getByAltText("Company logo preview")
    .getAttribute("src");
  expect(originalLogo).toMatch(/^data:image\/png;base64,/);
  await page
    .getByLabel("Contact", { exact: true })
    .fill("Company logo contact");
  await saveProfile(page);
  await expect(page.getByAltText("Company logo preview")).toHaveAttribute(
    "src",
    originalLogo!,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/company-logo-phone.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const quotation = await createQuotation(page, "Company logo test");
  await page.goto(quotation + "/print");
  await expect(page.locator(".document-company-logo")).toHaveAttribute(
    "src",
    originalLogo!,
  );
  await expect(page.locator(".document-company-logo")).toBeVisible();
  await page.screenshot({
    path: "test-results/quotation-logo.png",
    fullPage: true,
    animations: "disabled",
  });
  const pdf = await page.pdf({
    path: "test-results/quotation-logo.pdf",
    format: "A4",
    printBackground: true,
  });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
  await page.goto("/profile");
  const second = await sharp({
    create: { width: 200, height: 200, channels: 3, background: "red" },
  })
    .webp()
    .toBuffer();
  await input.setInputFiles({
    name: "replacement.webp",
    mimeType: "image/webp",
    buffer: second,
  });
  await saveProfile(page);
  const replacementLogo = await page
    .getByAltText("Company logo preview")
    .getAttribute("src");
  expect(replacementLogo).not.toBe(originalLogo);
  await page.goto(quotation + "/print");
  await expect(page.locator(".document-company-logo")).toHaveAttribute(
    "src",
    originalLogo!,
  );
  const secondQuotation = await createQuotation(page, "Replacement logo test");
  await page.goto(secondQuotation + "/print");
  await expect(page.locator(".document-company-logo")).toHaveAttribute(
    "src",
    replacementLogo!,
  );
  await page.goto("/profile");
  await page.getByRole("button", { name: "Remove logo", exact: true }).click();
  await saveProfile(page);
  await page.reload();
  await expect(page.getByAltText("Company logo preview")).toHaveCount(0);
  const thirdQuotation = await createQuotation(page, "No logo test");
  await page.goto(thirdQuotation + "/print");
  await expect(page.locator(".document-company-logo")).toHaveCount(0);
  await page.goto(quotation + "/print");
  await expect(page.locator(".document-company-logo")).toHaveAttribute(
    "src",
    originalLogo!,
  );
  await page.goto("/profile");
  await input.setInputFiles({
    name: "company.png",
    mimeType: "image/png",
    buffer: first,
  });
  await page.context().clearCookies();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await checkRenderingWarnings();
});
