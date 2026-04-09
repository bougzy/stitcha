"use client";

import { useState } from "react";
import { Edit2, Check, X } from "lucide-react";
import { cn, formatMeasurement, parseMeasurementInput } from "@/lib/utils";
import { MEASUREMENT_GROUPS, MEASUREMENT_TYPES } from "@/lib/constants";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { UnitToggle } from "@/components/common/unit-toggle";
import { ConfidenceBadge, ConfidenceDot } from "@/components/common/confidence-badge";
import type { Measurements } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface MeasurementDisplayProps {
  measurements: Measurements;
  editable?: boolean;
  onEdit?: (key: string, valueCm: number) => void;
  compact?: boolean;
  hideEmpty?: boolean;
  visibleFields?: string[];
}

/* -------------------------------------------------------------------------- */
/*  Extended type — adds the AI metadata fields onto the base Measurements    */
/* -------------------------------------------------------------------------- */

interface MeasurementsExtended extends Measurements {
  confidenceScores?: Record<string, number>;
  aiEstimatedFields?: string[];
  manualOverrides?: Record<string, number>;
}

/* -------------------------------------------------------------------------- */
/*  Label lookup                                                               */
/* -------------------------------------------------------------------------- */

const labelMap: Record<string, string> = Object.fromEntries(
  MEASUREMENT_TYPES.map((m) => [String(m.key), m.label])
);

/*
 * Explicitly typed as Set<string> — without this TypeScript infers
 * Set<"bust" | "underBust" | ...> and rejects .has(anyPlainString).
 */
const aiEstimatedKeys: Set<string> = new Set<string>(
  MEASUREMENT_TYPES
    .filter((m) => "aiEstimated" in m && Boolean((m as Record<string, unknown>).aiEstimated))
    .map((m) => String(m.key))
);

/* -------------------------------------------------------------------------- */
/*  Helper — accepts plain string, never touches the strict union type        */
/* -------------------------------------------------------------------------- */

function isKeyAiEstimated(key: string, aiEstimatedFields?: string[]): boolean {
  return (aiEstimatedFields ?? []).includes(key) || aiEstimatedKeys.has(key);
}

/* -------------------------------------------------------------------------- */
/*  Helper — safely read a numeric measurement field by plain string key      */
/*                                                                             */
/*  The double-cast (X as unknown as Record<string,unknown>) is required      */
/*  whenever TypeScript says the two types "don't sufficiently overlap".      */
/*  Going through `unknown` first tells the compiler we know what we're doing.*/
/* -------------------------------------------------------------------------- */

function getMeasurementValue(measurements: Measurements, key: string): number | undefined {
  const raw = (measurements as unknown as Record<string, unknown>)[key];
  return typeof raw === "number" && !isNaN(raw) ? raw : undefined;
}

/* -------------------------------------------------------------------------- */
/*  Single measurement row                                                     */
/* -------------------------------------------------------------------------- */

function MeasurementRow({
  fieldKey,
  valueCm,
  confidenceScores,
  aiEstimatedFields,
  manualOverrides,
  editable,
  onEdit,
}: {
  fieldKey: string;
  valueCm: number;
  confidenceScores?: Record<string, number>;
  aiEstimatedFields?: string[];
  manualOverrides?: Record<string, number>;
  editable?: boolean;
  onEdit?: (key: string, valueCm: number) => void;
}) {
  const { unit } = useUnitPreference();
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState("");

  const isAiEst: boolean               = isKeyAiEstimated(fieldKey, aiEstimatedFields);
  const confidence: number | undefined = confidenceScores?.[fieldKey];
  const isOverridden: boolean          = !!manualOverrides?.[fieldKey];
  const displayVal: number             = isOverridden
    ? (manualOverrides as Record<string, number>)[fieldKey]
    : valueCm;

  const handleSave = () => {
    const parsed = parseMeasurementInput(draftValue, unit);
    if (parsed !== null && parsed > 0 && onEdit) {
      onEdit(fieldKey, parsed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        "hover:bg-muted/40",
        isOverridden && "border-l-2 border-primary pl-2.5"
      )}
    >
      {/* Label */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {confidence !== undefined && !isAiEst && (
          <ConfidenceDot score={confidence} />
        )}
        <span className="truncate font-medium text-foreground">
          {labelMap[fieldKey] ?? fieldKey}
        </span>
        {isOverridden && (
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            Edited
          </span>
        )}
      </div>

      {/* Value / inline edit */}
      <div className="flex shrink-0 items-center gap-2">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="number"
              step="0.5"
              className="w-20 rounded border border-border bg-background px-2 py-0.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={unit === "in" ? "e.g. 38" : "e.g. 96.5"}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <span className="text-xs text-muted-foreground">{unit}</span>
            <button
              onClick={handleSave}
              className="text-emerald-500 hover:text-emerald-600"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="font-mono text-sm tabular-nums text-foreground">
              {formatMeasurement(displayVal, unit)}
            </span>
            {editable && onEdit && (
              <button
                onClick={() => {
                  setDraftValue("");
                  setEditing(true);
                }}
                className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                title="Override this measurement"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Confidence / AI-estimated badge — mobile only */}
      {(isAiEst || (confidence !== undefined && confidence < 0.85)) && !editing && (
        <div className="w-full pl-5 pt-0.5 text-xs sm:hidden">
          <ConfidenceBadge
            score={confidence ?? 0.6}
            isAiEstimated={isAiEst}
            compact
          />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export function MeasurementDisplay({
  measurements,
  editable = false,
  onEdit,
  compact = false,
  hideEmpty = true,
  visibleFields,
}: MeasurementDisplayProps) {
  const { unit, toggle } = useUnitPreference();

  /*
   * Cast through unknown first — required by TypeScript when the source
   * type (Measurements) has no index signature and the target type
   * (Record<string,unknown>) is a generic index type.
   * This is the ONLY safe way to do dynamic key lookups on a strict type.
   */
  const ext = measurements as unknown as MeasurementsExtended;

  const confidenceScores  = ext.confidenceScores;
  const aiEstimatedFields = ext.aiEstimatedFields;
  const manualOverrides   = ext.manualOverrides;

  /* ---- Build displayable fields for a group ---- */
  function getGroupFields(keys: readonly string[]): Array<{ key: string; value: number }> {
    const result: Array<{ key: string; value: number }> = [];
    for (const k of keys as string[]) {
      const val   = getMeasurementValue(measurements, k);
      const visOk = !visibleFields || visibleFields.includes(k);
      const hasVal = val !== undefined && val > 0;
      if (visOk && (!hideEmpty || hasVal)) {
        result.push({ key: k, value: val as number });
      }
    }
    return result;
  }

  /* ---------------------------------------------------------------- */
  /*  COMPACT MODE — flat list, no section headers                     */
  /* ---------------------------------------------------------------- */

  if (compact) {
    const allFields = (
      Object.keys(MEASUREMENT_GROUPS) as Array<keyof typeof MEASUREMENT_GROUPS>
    ).flatMap((g) => getGroupFields(MEASUREMENT_GROUPS[g].keys));

    return (
      <div className="space-y-0.5">
        <div className="flex items-center justify-end pb-1">
          <UnitToggle unit={unit} onToggle={toggle} size="sm" />
        </div>
        {allFields.map(({ key, value }) => (
          <div key={key} className="group">
            <MeasurementRow
              fieldKey={key}
              valueCm={value}
              confidenceScores={confidenceScores}
              aiEstimatedFields={aiEstimatedFields}
              manualOverrides={manualOverrides}
              editable={editable}
              onEdit={onEdit}
            />
          </div>
        ))}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  FULL MODE — grouped with section headers                         */
  /* ---------------------------------------------------------------- */

  const groups = (
    Object.entries(MEASUREMENT_GROUPS) as Array<
      [keyof typeof MEASUREMENT_GROUPS, { label: string; keys: readonly string[] }]
    >
  )
    .map(([groupKey, group]) => ({
      groupKey: String(groupKey),
      label:    group.label,
      fields:   getGroupFields(group.keys),
    }))
    .filter((g) => g.fields.length > 0);

  return (
    <div className="space-y-5">
      {/* Header with unit toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          All measurements stored in cm · displayed in{" "}
          {unit === "in" ? "inches" : "centimetres"}
        </p>
        <UnitToggle unit={unit} onToggle={toggle} />
      </div>

      {groups.map(({ groupKey, label, fields }) => (
        <div key={groupKey}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </h4>
          <div className="divide-y divide-border/50 rounded-xl border border-border/60 bg-card/50">
            {fields.map(({ key, value }) => {
              const isAiEst: boolean         = isKeyAiEstimated(key, aiEstimatedFields);
              const conf: number | undefined = confidenceScores?.[key];
              const showBadge: boolean       = isAiEst || (conf !== undefined && conf < 0.85);

              return (
                <div key={key} className="group first:rounded-t-xl last:rounded-b-xl">
                  <MeasurementRow
                    fieldKey={key}
                    valueCm={value}
                    confidenceScores={confidenceScores}
                    aiEstimatedFields={aiEstimatedFields}
                    manualOverrides={manualOverrides}
                    editable={editable}
                    onEdit={onEdit}
                  />
                  {/* Confidence badge — desktop only */}
                  {showBadge && (
                    <div className="hidden px-3 pb-2 sm:block">
                      <ConfidenceBadge
                        score={conf ?? 0.6}
                        isAiEstimated={isAiEst}
                        compact={false}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}


// "use client";

// import { useState } from "react";
// import { Edit2, Check, X } from "lucide-react";
// import { cn, formatMeasurement, parseMeasurementInput } from "@/lib/utils";
// import { MEASUREMENT_GROUPS, MEASUREMENT_TYPES } from "@/lib/constants";
// import { useUnitPreference } from "@/hooks/use-unit-preference";
// import { UnitToggle } from "@/components/common/unit-toggle";
// import { ConfidenceBadge, ConfidenceDot } from "@/components/common/confidence-badge";
// import type { Measurements } from "@/types";

// /* -------------------------------------------------------------------------- */
// /*  Types                                                                      */
// /* -------------------------------------------------------------------------- */

// interface MeasurementDisplayProps {
//   measurements: Measurements;
//   editable?: boolean;
//   onEdit?: (key: string, valueCm: number) => void;
//   compact?: boolean;
//   hideEmpty?: boolean;
//   visibleFields?: string[];
// }

// /* -------------------------------------------------------------------------- */
// /*  Label lookup                                                               */
// /* -------------------------------------------------------------------------- */

// const labelMap: Record<string, string> = Object.fromEntries(
//   MEASUREMENT_TYPES.map((m) => [String(m.key), m.label])
// );

// /*
//  * Explicitly typed as Set<string>.
//  * Without this TypeScript infers Set<"bust"|"underBust"|...> and then
//  * rejects .has(anyPlainString) with the union-type error you are seeing.
//  */
// const aiEstimatedKeys: Set<string> = new Set<string>(
//   MEASUREMENT_TYPES
//     .filter((m) => "aiEstimated" in m && Boolean((m as Record<string, unknown>).aiEstimated))
//     .map((m) => String(m.key))
// );

// /* -------------------------------------------------------------------------- */
// /*  Pure helper — always accepts plain string, never touches the union type   */
// /* -------------------------------------------------------------------------- */

// function isKeyAiEstimated(key: string, aiEstimatedFields?: string[]): boolean {
//   return (aiEstimatedFields ?? []).includes(key) || aiEstimatedKeys.has(key);
// }

// /* -------------------------------------------------------------------------- */
// /*  Single measurement row                                                     */
// /* -------------------------------------------------------------------------- */

// function MeasurementRow({
//   fieldKey,
//   valueCm,
//   confidenceScores,
//   aiEstimatedFields,
//   manualOverrides,
//   editable,
//   onEdit,
// }: {
//   fieldKey: string;
//   valueCm: number;
//   confidenceScores?: Record<string, number>;
//   aiEstimatedFields?: string[];
//   manualOverrides?: Record<string, number>;
//   editable?: boolean;
//   onEdit?: (key: string, valueCm: number) => void;
// }) {
//   const { unit } = useUnitPreference();
//   const [editing, setEditing] = useState(false);
//   const [draftValue, setDraftValue] = useState("");

//   const isAiEst: boolean          = isKeyAiEstimated(fieldKey, aiEstimatedFields);
//   const confidence: number | undefined = confidenceScores?.[fieldKey];
//   const isOverridden: boolean     = !!manualOverrides?.[fieldKey];
//   const displayVal: number        = isOverridden
//     ? (manualOverrides as Record<string, number>)[fieldKey]
//     : valueCm;

//   const handleSave = () => {
//     const parsed = parseMeasurementInput(draftValue, unit);
//     if (parsed !== null && parsed > 0 && onEdit) {
//       onEdit(fieldKey, parsed);
//     }
//     setEditing(false);
//   };

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter") handleSave();
//     if (e.key === "Escape") setEditing(false);
//   };

//   return (
//     <div
//       className={cn(
//         "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
//         "hover:bg-muted/40",
//         isOverridden && "border-l-2 border-primary pl-2.5"
//       )}
//     >
//       {/* Label */}
//       <div className="flex min-w-0 flex-1 items-center gap-2">
//         {confidence !== undefined && !isAiEst && (
//           <ConfidenceDot score={confidence} />
//         )}
//         <span className="truncate font-medium text-foreground">
//           {labelMap[fieldKey] ?? fieldKey}
//         </span>
//         {isOverridden && (
//           <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
//             Edited
//           </span>
//         )}
//       </div>

//       {/* Value / inline edit */}
//       <div className="flex shrink-0 items-center gap-2">
//         {editing ? (
//           <div className="flex items-center gap-1">
//             <input
//               autoFocus
//               type="number"
//               step="0.5"
//               className="w-20 rounded border border-border bg-background px-2 py-0.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-ring"
//               placeholder={unit === "in" ? "e.g. 38" : "e.g. 96.5"}
//               value={draftValue}
//               onChange={(e) => setDraftValue(e.target.value)}
//               onKeyDown={handleKeyDown}
//             />
//             <span className="text-xs text-muted-foreground">{unit}</span>
//             <button
//               onClick={handleSave}
//               className="text-emerald-500 hover:text-emerald-600"
//             >
//               <Check className="h-4 w-4" />
//             </button>
//             <button
//               onClick={() => setEditing(false)}
//               className="text-muted-foreground hover:text-foreground"
//             >
//               <X className="h-4 w-4" />
//             </button>
//           </div>
//         ) : (
//           <>
//             <span className="font-mono text-sm tabular-nums text-foreground">
//               {formatMeasurement(displayVal, unit)}
//             </span>
//             {editable && onEdit && (
//               <button
//                 onClick={() => {
//                   setDraftValue("");
//                   setEditing(true);
//                 }}
//                 className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus:opacity-100"
//                 title="Override this measurement"
//               >
//                 <Edit2 className="h-3.5 w-3.5" />
//               </button>
//             )}
//           </>
//         )}
//       </div>

//       {/* Confidence / AI-estimated badge — mobile only */}
//       {(isAiEst || (confidence !== undefined && confidence < 0.85)) && !editing && (
//         <div className="w-full pl-5 pt-0.5 text-xs sm:hidden">
//           <ConfidenceBadge
//             score={confidence ?? 0.6}
//             isAiEstimated={isAiEst}
//             compact
//           />
//         </div>
//       )}
//     </div>
//   );
// }

// /* -------------------------------------------------------------------------- */
// /*  Main component                                                             */
// /* -------------------------------------------------------------------------- */

// export function MeasurementDisplay({
//   measurements,
//   editable = false,
//   onEdit,
//   compact = false,
//   hideEmpty = true,
//   visibleFields,
// }: MeasurementDisplayProps) {
//   const { unit, toggle } = useUnitPreference();

//   /*
//    * FIX: Cast to Record<string, unknown> through 'unknown' first
//    * This resolves the TypeScript error because Measurements type
//    * doesn't have an index signature, but we need to access properties dynamically.
//    * The two-step cast explicitly acknowledges this intentional type conversion.
//    */
//   const mRaw = measurements as unknown as Record<string, unknown>;

//   const confidenceScores  = mRaw.confidenceScores  as Record<string, number> | undefined;
//   const aiEstimatedFields = mRaw.aiEstimatedFields as string[]               | undefined;
//   const manualOverrides   = mRaw.manualOverrides   as Record<string, number> | undefined;

//   function getGroupFields(keys: readonly string[]): Array<{ key: string; value: number }> {
//     return (keys as string[])
//       .filter((k) => {
//         const val   = mRaw[k];
//         const visOk = !visibleFields || visibleFields.includes(k);
//         const hasVal = typeof val === "number" && !isNaN(val as number) && (val as number) > 0;
//         return visOk && (!hideEmpty || hasVal);
//       })
//       .map((k) => ({
//         key:   k,
//         value: mRaw[k] as number,
//       }));
//   }

//   /* ---------------------------------------------------------------- */
//   /*  COMPACT MODE                                                     */
//   /* ---------------------------------------------------------------- */

//   if (compact) {
//     const allFields = (
//       Object.keys(MEASUREMENT_GROUPS) as Array<keyof typeof MEASUREMENT_GROUPS>
//     ).flatMap((g) => getGroupFields(MEASUREMENT_GROUPS[g].keys));

//     return (
//       <div className="space-y-0.5">
//         <div className="flex items-center justify-end pb-1">
//           <UnitToggle unit={unit} onToggle={toggle} size="sm" />
//         </div>
//         {allFields.map(({ key, value }) => (
//           <div key={key} className="group">
//             <MeasurementRow
//               fieldKey={key}
//               valueCm={value}
//               confidenceScores={confidenceScores}
//               aiEstimatedFields={aiEstimatedFields}
//               manualOverrides={manualOverrides}
//               editable={editable}
//               onEdit={onEdit}
//             />
//           </div>
//         ))}
//       </div>
//     );
//   }

//   /* ---------------------------------------------------------------- */
//   /*  FULL MODE — grouped with section headers                         */
//   /* ---------------------------------------------------------------- */

//   const groups = (
//     Object.entries(MEASUREMENT_GROUPS) as Array<
//       [keyof typeof MEASUREMENT_GROUPS, { label: string; keys: readonly string[] }]
//     >
//   )
//     .map(([groupKey, group]) => ({
//       groupKey: String(groupKey),
//       label:    group.label,
//       fields:   getGroupFields(group.keys),
//     }))
//     .filter((g) => g.fields.length > 0);

//   return (
//     <div className="space-y-5">
//       {/* Header with unit toggle */}
//       <div className="flex items-center justify-between">
//         <p className="text-xs text-muted-foreground">
//           All measurements stored in cm · displayed in{" "}
//           {unit === "in" ? "inches" : "centimetres"}
//         </p>
//         <UnitToggle unit={unit} onToggle={toggle} />
//       </div>

//       {groups.map(({ groupKey, label, fields }) => (
//         <div key={groupKey}>
//           <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
//             {label}
//           </h4>
//           <div className="divide-y divide-border/50 rounded-xl border border-border/60 bg-card/50">
//             {fields.map(({ key, value }) => {
//               /*
//                * Derive these as typed variables — NOT inside an IIFE.
//                * isKeyAiEstimated() takes plain string, so no union errors.
//                */
//               const isAiEst: boolean          = isKeyAiEstimated(key, aiEstimatedFields);
//               const conf: number | undefined  = confidenceScores?.[key];
//               const showBadge: boolean        = isAiEst || (conf !== undefined && conf < 0.85);

//               return (
//                 <div key={key} className="group first:rounded-t-xl last:rounded-b-xl">
//                   <MeasurementRow
//                     fieldKey={key}
//                     valueCm={value}
//                     confidenceScores={confidenceScores}
//                     aiEstimatedFields={aiEstimatedFields}
//                     manualOverrides={manualOverrides}
//                     editable={editable}
//                     onEdit={onEdit}
//                   />
//                   {/* Confidence badge — desktop only */}
//                   {showBadge && (
//                     <div className="hidden px-3 pb-2 sm:block">
//                       <ConfidenceBadge
//                         score={conf ?? 0.6}
//                         isAiEstimated={isAiEst}
//                         compact={false}
//                       />
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }