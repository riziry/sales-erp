import { watchRenderingWarnings } from "./rendering-warnings";
import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("existing quotation can adopt the company logo in a revision and print a translucent stamp behind the signature", async ({
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
  // Use a signature with an opaque white background to exercise the blending.
  const signature = await sharp(
    Buffer.from(
      '<svg width="400" height="140"><rect width="400" height="140" fill="white"/><path d="M20 100 Q80 10 130 75 T210 60 L270 25 L240 95 L375 70" fill="none" stroke="#101020" stroke-width="4"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  await page.goto("/account");
  await page.getByLabel("Username", { exact: true }).fill("brand.sales");
  await page.getByLabel("Full name", { exact: true }).fill("Brand Sales");
  await page.getByLabel("Phone number", { exact: true }).fill("081234567890");
  await page.getByLabel("Signature image", { exact: true }).setInputFiles({
    name: "signature.png",
    mimeType: "image/png",
    buffer: signature,
  });
  await page.getByRole("button", { name: "Save account", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save account", exact: true }),
  ).toBeDisabled();
  await page.goto("/profile");
  if (
    await page.getByRole("button", { name: "Remove logo", exact: true }).count()
  ) {
    await page
      .getByRole("button", { name: "Remove logo", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(
      page.getByText("Profile saved successfully.", { exact: true }),
    ).toBeVisible();
  }
  await page.goto("/quotation/new");
  await page
    .getByLabel("Customer / company name", { exact: true })
    .fill("Branding client");
  await page
    .getByLabel("Event / project", { exact: true })
    .fill("Branding recovery");
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
  const original = page.url();
  await page.getByRole("button", { name: "Mark as sent", exact: true }).click();
  await expect(page.locator(".heading-actions .badge")).toHaveText("Sent");
  const logo = await sharp(
    Buffer.from(
      '<svg width="400" height="180"><circle cx="90" cy="90" r="75" fill="none" stroke="#2558b2" stroke-width="8"/><path d="M45 50 L90 120 L135 50 M190 55 H370 M190 90 H330 M190 125 H355" fill="none" stroke="#2558b2" stroke-width="14"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  await page.goto("/profile");
  await page.getByLabel("Company logo image", { exact: true }).setInputFiles({
    name: "company.png",
    mimeType: "image/png",
    buffer: logo,
  });
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByText("Profile saved successfully.", { exact: true }),
  ).toBeVisible();
  const savedLogo = await page
    .getByAltText("Company logo preview")
    .getAttribute("src");
  await page.goto(original + "/print");
  await expect(page.locator(".document-company-logo")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Add company logo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Use company logo", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use company logo", exact: true })
    .click();
  await expect(page.getByAltText("Quotation company logo")).toHaveAttribute(
    "src",
    savedLogo!,
  );
  await expect(
    page.locator(".signature-document-preview .signature-company-stamp"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save new revision", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(
    (url) =>
      /\/quotation\/[a-f0-9-]{36}$/.test(url.pathname) &&
      url.pathname !== new URL(original).pathname &&
      !url.hash,
  );
  const revised = page.url();
  await page.reload();
  await expect(page.getByAltText("Quotation company logo")).toHaveAttribute(
    "src",
    savedLogo!,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".signature-document-preview")
    .screenshot({ path: "test-results/company-stamp-editor.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(revised + "/print");
  await expect(page.locator(".document-company-logo")).toHaveAttribute(
    "src",
    savedLogo!,
  );
  const stamp = page.locator(".signature-company-stamp");
  await expect(stamp).toHaveAttribute("src", savedLogo!);
  await expect(stamp).toHaveCSS("opacity", "0.28");
  await expect(page.locator(".sales-signature-image")).toHaveCSS(
    "mix-blend-mode",
    "multiply",
  );
  expect(await stamp.evaluate((el) => getComputedStyle(el).transform)).not.toBe(
    "none",
  );
  await expect(page.locator(".client-signature img")).toHaveCount(0);
  await page
    .locator(".document-signatures")
    .screenshot({ path: "test-results/company-stamp-quotation.png" });
  const pdf = await page.pdf({
    path: "test-results/company-stamp-quotation.pdf",
    format: "A4",
    printBackground: true,
  });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
  await page.goto(revised);
  await page.getByRole("link", { name: "Create invoice", exact: true }).click();
  await page
    .getByRole("button", { name: "Create invoice draft", exact: true })
    .click();
  await expect(page).toHaveURL(/\/invoice\/[a-f0-9-]{36}$/);
  await page.goto(page.url() + "/print");
  await expect(page.locator(".signature-company-stamp")).toHaveAttribute(
    "src",
    savedLogo!,
  );
  await expect(page.getByAltText("Signature of Brand Sales")).toBeVisible();
  await page.goto(original + "/print");
  await expect(page.locator(".document-company-logo")).toHaveCount(0);
  await expect(page.locator(".signature-company-stamp")).toHaveCount(0);
  await checkRenderingWarnings();
});
