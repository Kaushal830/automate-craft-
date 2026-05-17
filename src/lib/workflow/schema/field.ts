/**
 * SetupField schema — user-facing input contract for a workflow.
 *
 * Setup fields are the form the user fills in BEFORE running the
 * workflow. Field values become the source for `ParamRef` resolution
 * at execution time (the user-input layer of the credential graph).
 *
 * The schema is deliberately UI-aware (placeholder, helpText, options)
 * because these are part of the AI's job — generating a friendly form
 * from a plain-English prompt.
 */

import { z } from "zod";
import { integrationSchema } from "./integration";

/**
 * Field input types. Frontend renders the matching UI control.
 *
 * secret  — masked input. Stored encrypted (Phase 2 vault).
 * number  — numeric input.
 * url     — URL with browser-native validation.
 */
export const FIELD_TYPES = [
  "text",
  "textarea",
  "select",
  "phone",
  "email",
  "number",
  "url",
  "secret",
] as const;

export const fieldTypeSchema = z.enum(FIELD_TYPES);
export type FieldType = z.infer<typeof fieldTypeSchema>;

export const setupFieldSchema = z
  .object({
    /**
     * Stable field identifier. Referenced by ParamRefs at runtime to
     * resolve user input.
     */
    key: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(
        /^[a-z][a-z0-9_]*$/,
        "Field keys must start with a lowercase letter and use snake_case.",
      ),

    /** Display label. */
    label: z.string().trim().min(2).max(80),

    type: fieldTypeSchema,

    /** Placeholder shown in empty input. */
    placeholder: z.string().trim().min(1).max(160),

    /** One-line helper text rendered under the input. */
    helpText: z.string().trim().min(2).max(280),

    /** Whether the field must be filled to save the workflow. */
    required: z.boolean().default(true),

    /**
     * Choice list for type="select". Ignored for other types.
     * Frontend treats first option as the default placeholder.
     */
    options: z
      .array(z.string().trim().min(1).max(120))
      .max(20)
      .optional(),

    /**
     * Optional integration binding. Frontend uses this to render the
     * "connect <integration>" CTA next to the field if not yet
     * connected.
     */
    integration: integrationSchema.optional(),
  })
  .strict();

export type SetupField = z.infer<typeof setupFieldSchema>;

export const setupFieldsSchema = z
  .array(setupFieldSchema)
  .max(20)
  .default([]);

export type SetupFields = z.infer<typeof setupFieldsSchema>;
