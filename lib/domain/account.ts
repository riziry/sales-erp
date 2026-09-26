import { z } from "zod";
export const signatureSchema = z
  .string()
  .max(360_000)
  .regex(
    /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/,
    "Upload a valid signature image.",
  )
  .nullable();
export const salesIdentitySchema = z.object({
  role: z.string().trim().max(100).optional(),
  name: z.string().trim().min(1).max(250),
  phone: z.string().trim().min(1).max(40),
  signature: signatureSchema,
});
export type SalesIdentity = z.infer<typeof salesIdentitySchema>;
export const accountSchema = z.object({
  role: z.string().trim().max(100).default(""),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(32)
    .regex(
      /^[a-z0-9][a-z0-9._-]*$/,
      "Use letters, numbers, dots, underscores, or hyphens.",
    ),
  name: z.string().trim().min(1, "Enter your name.").max(250),
  phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[+\d\s().-]+$/, "Enter a valid phone number.")
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 8 && digits.length <= 20;
    }, "Enter a phone number with 8–20 digits."),
});
export type AccountFields = z.infer<typeof accountSchema>;
export type AccountProfile = AccountFields & {
  signature: string | null;
  version: number;
};
export function salesIdentity(
  account: AccountProfile | null,
): SalesIdentity | null {
  return account
    ? {
        name: account.name,
        role: account.role,
        phone: account.phone,
        signature: account.signature,
      }
    : null;
}
