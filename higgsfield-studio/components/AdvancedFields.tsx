"use client";

import { Collapse, Input, Label, Select } from "./ui";
import type { FormState, ToolsInfo } from "@/lib/client-types";

/**
 * Every argument the tool declares that the composer doesn't already cover,
 * rendered from the live schema. This is what keeps the app usable when
 * Higgsfield adds a parameter we've never heard of.
 */
export function AdvancedFields({
  tools,
  form,
  setForm,
}: {
  tools: ToolsInfo;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  if (!tools.advancedFields.length) return null;

  const setAdvanced = (name: string, value: string) =>
    setForm((f) => ({ ...f, advanced: { ...f.advanced, [name]: value } }));

  return (
    <Collapse
      title="Advanced — other fields this tool declares"
      count={tools.advancedFields.length}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.advancedFields.map((f) => (
          <div key={f.name}>
            <Label htmlFor={`adv-${f.name}`} hint={f.required ? "required" : undefined}>
              {f.name}
            </Label>
            {f.enumValues?.length ? (
              <Select
                id={`adv-${f.name}`}
                value={form.advanced[f.name] ?? ""}
                onChange={(e) => setAdvanced(f.name, e.target.value)}
              >
                <option value="">Default</option>
                {f.enumValues.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            ) : f.kind === "boolean" ? (
              <Select
                id={`adv-${f.name}`}
                value={form.advanced[f.name] ?? ""}
                onChange={(e) => setAdvanced(f.name, e.target.value)}
              >
                <option value="">Default</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </Select>
            ) : (
              <Input
                id={`adv-${f.name}`}
                type={f.kind === "number" || f.kind === "integer" ? "number" : "text"}
                value={form.advanced[f.name] ?? ""}
                placeholder={
                  f.default !== null && f.default !== undefined
                    ? String(f.default)
                    : f.kind === "array"
                      ? "comma separated"
                      : f.kind
                }
                onChange={(e) => setAdvanced(f.name, e.target.value)}
              />
            )}
            {f.description && (
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
                {f.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </Collapse>
  );
}
