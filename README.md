# sales-erp — Sales workspace

An internal workspace for commercial master data, vendor pricing, production packages, quotations, invoices, and customer follow-ups. Built with Next.js App Router, TypeScript, PostgreSQL, Drizzle, and Tailwind CSS. All application copy and customer document labels are in English. Currency remains IDR and dates use the Asia/Jakarta time zone.

## Supabase Auth setup

Create the internal account in **Supabase Dashboard → Authentication → Users**. Sign in with that account's email and password; there is no need to create another account with `db:bootstrap`. Public registration is not available. `SUPABASE_ALLOWED_USER_ID` restricts access to one internal account rather than every user in the project.

Configure `.env.local` with:

- `AUTH_PROVIDER=supabase`
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported.
- `SUPABASE_ALLOWED_USER_ID`: the internal account's UUID from Supabase Auth.
- `DATABASE_URL`: the PostgreSQL connection for commercial data in the same project. The HTTP project URL and API keys do not replace PostgreSQL credentials.

For a new, linked Supabase project with no application tables:

```sh
npm ci
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
# Set the project URL and publishable key in .env.local, then run:
npm run db:setup-supabase
npm run dev
```

`db:setup-supabase` uses the authenticated CLI to create a dedicated database role, `yw_quotation_app`, run migrations, and select the single confirmed Auth account. If several accounts exist, set `SUPABASE_ALLOWED_USER_ID` first. The connection is saved in `.env.local` with mode 0600. Existing Auth passwords are not changed. Setup does not overwrite existing connections, tables, or roles. If interrupted after the connection is saved, resume with `npm run db:migrate`.

For an existing database, configure a PostgreSQL connection with migration privileges and run `npm run db:migrate`. The runtime role needs access to the application tables; the table-owner role created during setup already has that access. Application tables have row-level security enabled with no public access policies. The application accesses them through authenticated server code, not directly from the browser using the Data API.

Supabase database connections use `sslmode=verify-full` and `sslrootcert=certs/supabase-root-2021.crt`. The public CA certificate comes from [Supabase](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt); both the certificate authority and hostname are verified. Include `certs` in deployments. Configure the database URL and allowed Auth UUID in the deployed server environment as well. Secret/service-role keys are not required for application login and are never sent to the browser.

Supabase sessions use HttpOnly cookies. `proxy.ts` refreshes tokens before rendering, while every protected page and action verifies the user with the Auth server and checks the allowed account UUID. Email and password changes in My account use Supabase Auth. The implementation follows the [Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).

## Alternative: internal PostgreSQL account

Use this mode only for installations without Supabase Auth. Set `AUTH_PROVIDER=internal`. Requirements: Node.js 22+ and PostgreSQL. Docker Compose provides a local database; an existing PostgreSQL server is also supported.

```sh
npm ci
cp .env.example .env
# Set AUTH_PROVIDER=internal, a local DATABASE_URL, ADMIN_EMAIL, and ADMIN_PASSWORD.
docker compose up -d db
npm run db:migrate
npm run db:bootstrap
npm run dev
```

Open http://localhost:3000 and sign in with the configured account. Bootstrap creates one account and an initial profile. Running it again does not overwrite existing account details, passwords, or profile settings. The initial password must have at least 12 characters. No demo account or public registration is provided.

Next.js prioritizes `.env.local` over `.env`, so make sure existing settings do not override the selected mode. The application does not connect to the warehouse system.

## Production

Set the appropriate environment variables and database connection, then run:

```sh
npm run db:migrate
# Internal mode only, on first installation:
# npm run db:bootstrap
npm run build
npm start
```

Deploy behind HTTPS; production session cookies use `Secure`. Back up PostgreSQL regularly. `ADMIN_PASSWORD` is only used by internal-mode bootstrap and can be removed afterward. Password changes are available in My account. Business data is not stored in localStorage.

## Workflow

1. Configure company details, default tax rates, and tax/non-tax bank accounts in **Profile & bank accounts**.
2. Add customers, items/services, vendors, vendor prices, and package templates.
3. Create a quotation using catalog items, custom items, or packages. Edit names, descriptions, units, quantities, durations, selling prices, costs, and discounts.
4. Click **Save draft**. Unknown costs may remain blank; an explicitly entered zero is a valid cost and differs from an unknown cost.
5. With at least one item and all costs complete, **Mark as sent**, then **Mark as approved** or **Mark as rejected**. Status changes do not send emails.
6. Use **Save new revision** when editing a sent, approved, or rejected quotation. Previous versions remain viewable and printable. Only the latest revision can be edited or change status.
7. Use **Print / Save PDF** for an A4 customer document. Disable the browser's default headers and footers for a clean PDF.

Existing customer-entered text and stored document snapshots retain their original content. Changing the interface language does not rewrite historical documents.

### Event schedules and quotation editing

Quotation details are grouped into customer, event/location, and document dates. **Choose dates** selects an inclusive event date range; you can also type the start and end dates. Leave the end date blank for a single-day event, or clear both dates when they are not confirmed. Reversed ranges are rejected. Saved quotations, revisions, and invoice copies include both dates, while old single-day documents remain compatible. Duplicating a quotation clears both event dates.

Changing event dates does not change prices automatically. **Apply N days to daily items** updates daily selling/cost durations and daily package components after an in-app confirmation; one-time charges remain independent. Review the recalculated totals and save. The readiness indicator links to incomplete sections, and printing is disabled while edits are unsaved.

New quotations use the English payment, equipment-damage, acceptance, and validity wording. **Restore defaults** lets you explicitly replace notes and terms in an existing editor; custom and historical wording otherwise stays intact. The new range is stored in existing document JSON, so no database migration is needed.

### Company logo

In **Company & accounts**, use **Company logo → Upload logo**, then **Save profile**. You can preview, replace, or remove the logo. PNG, JPEG, and WebP files up to 5 MB are accepted; the server decodes and normalizes them to a bounded PNG, preserving transparency and proportions. Logos are stored in the existing company-profile JSON, so no additional database migration or public storage bucket is needed.

New quotations copy the saved logo into their company snapshot and display it in the print/PDF header. Invoices inherit that logo from their quotation. Replacing or removing the company logo does not change existing quotations, revisions, or invoices. Documents created before this feature continue to print without a logo.

To add the logo to an existing quotation, open **Company logo & stamp → Use company logo**, then save. For a sent, approved, or rejected quotation, save a new revision; previous versions keep their original branding. The editor previews the chosen logo and sales signature. A saved logo appears behind an uploaded sales signature as a translucent stamp tilted 12 degrees, in both quotations and invoices. Signature images with white backgrounds blend over the stamp so the signature stays legible. No stamp is shown when the sales signature is missing, and the client's signature area remains blank.

### Pricing, costs, and packages

- Selling prices and costs have independent bases: `DAILY` = quantity × duration × price; `ONE_TIME` = quantity × price.
- `INTERNAL` costs use an item's reference cost; `VENDOR` costs use a selected recorded vendor price; `CUSTOM` costs are entered manually. Editing a reference cost's amount or basis switches its source to Custom.
- Vendor prices are offered only when their unit matches the quotation item. Use a custom cost to perform explicit unit conversions.
- A package has one bundle selling price. Its components contribute costs only. Effective component quantity = package quantity × quantity per package. Each component's cost duration can be edited independently.
- Customer documents always show component names, descriptions, and effective quantities, without component prices or costs. Nested packages are not supported.
- Item discounts apply first, followed by the overall discount. Fixed amounts apply to the entire line/subtotal, not per unit. Percentage discounts range from 0–100%; fixed discounts cannot exceed their base.
- `decimal.js` provides decimal arithmetic. Line revenue, costs, discounts, and each tax are rounded half-up to whole rupiah. The server recalculates totals before saving.

### Taxes and bank accounts

VAT (PPN) and income tax (PPh) are independently optional and disabled by default. Initial profile rates are 11% and 2%, respectively. Rates can be changed in the profile or on an individual quotation. The selected commercial calculation adds both taxes:

```text
Net subtotal = total after item discounts − overall discount
VAT = net subtotal × VAT rate, when enabled
Income tax = net subtotal × income tax rate, when enabled
Quotation total = net subtotal + VAT + income tax
Gross profit = net subtotal − total cost
```

Enabling VAT selects the tax bank account. Without VAT, the non-tax bank account is selected, including when only income tax is enabled. Editing the bank account in a quotation switches it to Manual mode, so changing VAT does not overwrite it. **Reset to default bank account** restores the defaults copied when the quotation was created, not the latest profile values.

## Invoices

Open **Invoices → Create invoice**, or choose **Create invoice** from a saved quotation. Save any quotation edits first. Select **Full payment**, **Down payment (50%)**, or **Final installment (50%)**. A final installment requires an existing down payment invoice. Invoice numbers use `INV/YYYY/NNNN` and are allocated transactionally; repeated creation requests return the existing invoice.

- Full and split billing cannot coexist for a quotation series. Both installments use the first invoice's saved quotation snapshot, including after subsequent quotation changes or revisions. Deposit and final amounts add up to the inclusive project total; tax allocations round half-up and the net amount absorbs any rounding remainder.
- A draft invoice allows edits to its date, due date, bank account, notes, and payment terms. Commercial line details are copied from the saved quotation. **Issue invoice** locks the document. **Void invoice** preserves the record and releases its billing slot; void the final installment before its deposit when switching billing plans.
- **Print / PDF** opens a protected A4 document with its invoice number, source quotation/revision, due date, line details, discounts, taxes, installment amount, bank details, and terms. Split invoices clearly distinguish the full project breakdown from the amount billed by that invoice. Internal costs, vendor sourcing, and profit are never stored in the invoice snapshot or sent to its print page.
- Issued is a document status, not confirmation of payment. Creating, issuing, or printing an invoice does not send email or record payment receipt.
- Apply the invoice migration with `npm run db:migrate`. The new `invoices` and `invoice_counters` tables have row-level security enabled, with access through the authenticated application server.

## Account and signatures

Open **My account** to set your username, full name, phone number, and signature. **Change email** requires your current password and updates the actual login identity. Supabase changes show an awaiting-confirmation state until the required inbox confirmations are complete; the allowed account UUID stays unchanged. Internal-auth email changes revoke sessions and require signing in with the new address. Password management is available only in My account, and verifies the current password before invalidating sessions. Company settings contain only company, tax, and bank details.

For Supabase email confirmation, set **Authentication → URL Configuration → Site URL** to your application URL and add `https://YOUR_APP_DOMAIN/auth/email-change` to the redirect allowlist (plus your local development callback if needed). The callback handles the PKCE code, checks the allowed account UUID, and returns to My account. Open confirmation links in the browser that requested the change; otherwise complete the confirmations and sign in manually. Use **Check confirmation status** to refresh a pending change. Email confirmation/delivery uses the existing Supabase configuration; no service-role key or confirmation bypass is used. See [Supabase updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser).

**Draw signature** opens a canvas supporting mouse, touch, and pen, with Undo, Clear, and Cancel. Choose **Use signature**, then **Save account** to persist it. Rotating/resizing the screen keeps the drawing; canceling preserves the existing signature. Upload remains available as an alternative.

Signature uploads accept PNG, JPEG, or WebP up to 5 MB. The server verifies and decodes the image, removes metadata, resizes it to fit 800 × 320, and stores a bounded PNG in the private `account_profiles` table. No public storage bucket is required. Each profile is keyed to its authenticated identity; version checks prevent stale edits. Apply the migration with `npm run db:migrate`.

New quotations copy the sales name, phone, and signature from the account. **Use my current account details** in the quotation editor explicitly refreshes that snapshot on the next save. Existing documents retain their saved identity when the profile or signature changes. Invoices copy the quotation's sales snapshot; split invoices preserve the same original snapshot. Customer documents include the sales contact/signature; quotations also include blank client name, contact, and signature spaces. Usernames, login emails, and passwords are never added to the sales signature block.

## Sales workflow

Open **Sales overview** for latest-revision pipeline values (after discounts, excluding taxes), decision win rate, and sent offers expiring within seven days or already expired. Values cover all time and do not represent payment receipts.

- **Schedule follow-up** links an internal next step and date to a quotation series. Filter open/due/completed tasks, search by customer or note, complete a task, or reopen it. Tasks remain connected when a quotation is revised and never appear in customer documents. No notifications or emails are sent automatically.
- **Duplicate** on a saved quotation creates a separate draft with a new number, fresh quotation/validity dates, and an empty event date. Commercial snapshots are copied; the original, its invoices, and its reminders are preserved. Save edits before duplicating.
- Run `npm run db:migrate` for the `quotation_followups` table. Access remains authenticated server-side, with RLS enabled.

## Storage and boundaries

- Master tables: `items`, `customers`, `vendors`, `vendor_prices`, `packages`, and `profiles`. Zod validates typed payloads. IDs, SKUs, vendor-price references, and active flags also have relational columns.
- `quotation_series`, `quotation_counters`, and `quotations` store document numbers, revisions, and snapshots. Number/revision allocation uses transactions and row locks. A `version` field prevents stale browser tabs from overwriting newer draft edits.
- Snapshots contain pricing, cost sources, components, customer/company details, taxes, bank details, and bank defaults. Changing or deactivating a master record does not change saved quotations. Master deletion is not available; deactivate records instead.
- Numbers use `QTT/YYYY/NNNN`, based on the quotation date's year at initial save, with revisions R1, R2, and so on. Editing a draft's date does not change its existing number.
- In internal-account mode, sessions store token hashes and expire after eight hours. Five failed sign-in attempts temporarily lock the account for 15 minutes. All internal pages and Server Actions verify the session.
- The print page uses an explicit server-side customer-field allowlist. Costs, vendor sources, alternative bank accounts, and profit are excluded from its HTML/RSC payload.
- Inventory, availability, reservations, equipment movements, and warehouse operations are out of scope. An item's optional `external_inventory_item_id` is only an integration reference. Quotation quantities are not compared with YW's or vendors' equipment holdings.
- Payment tracking, advanced reporting, multiuser administration, and warehouse integration remain separate future work.

Domain logic and calculations live in `lib/domain`, schemas in `lib/db`, and transactions/authentication in `lib/server`. SQL migrations are stored in `drizzle`. After changing the schema, run `npm run db:generate`, review the migration, and apply it with `npm run db:migrate`.

## Interface and getting started

The workspace uses an English interface with light, dark, and system themes. Appearance preferences are stored in this browser and applied before rendering. Animations respect the operating system's reduced-motion setting. Customer print documents always retain a light, paper-friendly palette.

- **Quick tour** in the top bar opens a skippable five-step walkthrough. **Getting started** (`/help`) provides the full guide. The first-visit welcome card can be dismissed and the tour reopened at any time.
- Catalog search supports names, SKUs, categories, keyboard navigation, and selecting multiple items at once. Customers, packages, vendors, vendor prices, and package components use searchable dialogs instead of long native dropdowns. Results and master lists are paginated in groups of 20; search runs across the entire loaded catalog.
- Quotation sections link directly to details, items, taxes, notes, and review. Lines can be collapsed, removed lines can be restored with Undo, and a completion checklist explains what is needed before marking a draft as sent. Navigation links warn about unsaved edits; save with **Save draft**.
- Mobile navigation opens from **Menu**. Theme controls, help, and sign-out remain available on small screens. Dialogs trap focus, support Escape, and restore focus to their trigger.

Catalog data is currently loaded by authenticated Server Components and searched locally. The picker bounds the rendered result list, but database-backed search would be the next scaling step for catalogs too large to load comfortably in the browser.

### Custom controls and number entry

The application is branded **sales-erp**; company identities saved in profiles and documents remain business data. Dropdowns, numeric steppers, date calendars, checkboxes, password visibility, tooltips, and in-app confirmations use themed controls with keyboard support. Price inputs group rupiah automatically (`100000` → `100.000`); a decimal comma (`100.000,50`) preserves exact decimals in server calculations. Scrollbars, the operating system's print/PDF dialog, password-manager UI, and browser tab-close warnings remain browser-managed.

Press **Ctrl/Cmd + K** for quick actions. Page entry, popovers, cards, buttons, and save notifications use brief animations; reduced-motion preferences disable them.

### Phones and tablets

The compact navigation is used through 1100px and closes after navigation. Directory and document lists become labeled cards through 760px. Narrow phone forms use one column; tablets use wider grids. Search dialogs fill small screens, controls provide larger touch targets, and text inputs use 16px type to avoid mobile focus zoom. Quotation and invoice editors show a fixed total/review/save bar on phones and tablets. Screen layouts are separate from A4 print styling.

Responsive tests cover 320, 390, 768, 820, 844 (landscape), 1024, and 1180px widths, including navigation, long price inputs, packages, dialogs, and save actions. Browser emulation does not replace a check on a physical device with its on-screen keyboard.

## Tests

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit and integration tests use temporary PostgreSQL instances through `embedded-postgres`. E2E tests start a temporary database and the production build on port 3210, using isolated test accounts and data. Both suites leave the configured application database untouched and remove temporary databases afterward. Run as a non-root OS user because PostgreSQL binaries cannot run as root.

Coverage includes live price formatting and caret behavior, sales follow-ups, duplicate drafts, custom control keyboard behavior, invoice creation/issuance/voiding, full versus split billing conflicts, invoice snapshot privacy, installment rounding, and the PAR LED pricing example, quantity 50, discounts, rounding, tax combinations, bank overrides, package costs, cost sources, snapshots, edit conflicts, concurrent numbering/revisions, sign-in/out, unauthenticated Server Actions, customer-safe printing, mobile layout, theme persistence, reduced motion, tutorials, keyboard/focus behavior, multi-selection and pagination with 1,000+ catalog items, and automated WCAG accessibility scans. Browser screenshots/PDFs are written to the Git-ignored `test-results` directory.

### Explicit live Supabase verification

`npx tsx scripts/verify-supabase.ts` checks the configured Supabase project. Run it after `npm run build`, with the development server on port 3000. It requires a secret/service-role key in the server environment, creates its own temporary Auth account, tests sign-in/password changes/account restrictions and read-only page access, then deletes that account. It does not change existing user passwords or commercial documents. Standard test commands do not mutate the Supabase project.
