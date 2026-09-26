import { z } from "zod";

// Only self-contained, bounded PNGs are allowed on customer documents.
export const documentImageSchema = z
  .string()
  .max(360_000)
  .regex(
    /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/,
    "Upload a valid PNG image.",
  );
