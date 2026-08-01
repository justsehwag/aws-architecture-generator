"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useCostEstimate } from "@/hooks/useCostEstimate";
import type { UsageAssumptions } from "@/types/cost";
import { cn } from "@/lib/utils";

// --- Parameter range constraints (Requirements 7.4) ---

interface ParameterConfig {
  key: keyof Pick<UsageAssumptions, "requestsPerMonth" | "dataTransferGB" | "storageGB">;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  /** Format the value for display */
  formatValue: (value: number) => string;
}

const PARAMETER_CONFIGS: ParameterConfig[] = [
  {
    key: "requestsPerMonth",
    label: "Requests per month",
    min: 1,
    max: 10_000_000_000,
    step: 1_000_000,
    unit: "requests",
    formatValue: (v) => {
      if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
      return String(v);
    },
  },
  {
    key: "dataTransferGB",
    label: "Data transfer",
    min: 0,
    max: 102_400, // 100 TB in GB
    step: 100,
    unit: "GB",
    formatValue: (v) => {
      if (v >= 1_024) return `${(v / 1_024).toFixed(1)} TB`;
      return `${v} GB`;
    },
  },
  {
    key: "storageGB",
    label: "Storage",
    min: 0,
    max: 1_073_741_824, // 1 PB in GB
    step: 1_000,
    unit: "GB",
    formatValue: (v) => {
      if (v >= 1_073_741_824) return `${(v / 1_073_741_824).toFixed(2)} PB`;
      if (v >= 1_048_576) return `${(v / 1_048_576).toFixed(1)} TB`;
      if (v >= 1_024) return `${(v / 1_024).toFixed(1)} TB`;
      return `${v} GB`;
    },
  },
];

// --- Validation helper ---

/**
 * Validates a parameter value is within its allowed range.
 * Returns an error message if invalid, or null if valid.
 */
function validateParameterValue(
  value: number,
  config: ParameterConfig
): string | null {
  if (isNaN(value)) {
    return `${config.label} must be a valid number.`;
  }
  if (value < config.min) {
    return `${config.label} must be at least ${config.formatValue(config.min)}.`;
  }
  if (value > config.max) {
    return `${config.label} must be at most ${config.formatValue(config.max)}.`;
  }
  return null;
}

// --- Component Props ---

export interface CostPanelProps {
  diagramId: string;
  className?: string;
}

/**
 * CostPanel component displays:
 * - Total estimated monthly cost prominently
 * - Per-service cost breakdown table
 * - Usage parameter adjustment sliders
 * - Recalculate button
 *
 * Validates: Requirements 7.2, 7.4
 */
export function CostPanel({ diagramId, className }: CostPanelProps) {
  const { state, fetchCost, recalculate } = useCostEstimate();

  // Local state for parameter adjustments
  const [params, setParams] = React.useState<
    Pick<UsageAssumptions, "requestsPerMonth" | "dataTransferGB" | "storageGB">
  >({
    requestsPerMonth: 1_000_000,
    dataTransferGB: 100,
    storageGB: 50,
  });

  const [validationErrors, setValidationErrors] = React.useState<
    Record<string, string | null>
  >({});

  // Fetch cost on mount
  React.useEffect(() => {
    if (diagramId) {
      fetchCost(diagramId);
    }
  }, [diagramId, fetchCost]);

  // Sync params with fetched assumptions
  React.useEffect(() => {
    if (state.data?.assumptions) {
      setParams({
        requestsPerMonth: state.data.assumptions.requestsPerMonth,
        dataTransferGB: state.data.assumptions.dataTransferGB,
        storageGB: state.data.assumptions.storageGB,
      });
    }
  }, [state.data?.assumptions]);

  const handleParamChange = (key: ParameterConfig["key"], value: number) => {
    const config = PARAMETER_CONFIGS.find((c) => c.key === key)!;
    const error = validateParameterValue(value, config);
    setValidationErrors((prev) => ({ ...prev, [key]: error }));
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const hasValidationErrors = Object.values(validationErrors).some(
    (err) => err !== null
  );

  const handleRecalculate = () => {
    if (hasValidationErrors) return;
    recalculate(diagramId, params);
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div
      className={cn("flex flex-col gap-4 rounded-lg border border-border p-4", className)}
      aria-label="Cost estimation panel"
    >
      {/* Header with total cost */}
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-muted-foreground">
          Estimated Monthly Cost
        </h2>
        <div
          className="text-3xl font-bold text-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          {state.status === "loading" && (
            <span className="flex items-center gap-2 text-muted-foreground">
              <SpinnerIcon className="h-6 w-6 animate-spin" />
              Calculating...
            </span>
          )}
          {state.status === "success" && state.data && (
            formatCurrency(state.data.totalMonthlyCost)
          )}
          {state.status === "error" && (
            <span className="text-lg text-destructive">--</span>
          )}
          {state.status === "idle" && (
            <span className="text-muted-foreground">--</span>
          )}
        </div>
      </div>

      {/* Error display */}
      {state.status === "error" && state.error && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm text-destructive">{state.error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => fetchCost(diagramId)}
            aria-label="Retry cost estimation"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Per-service cost breakdown table */}
      {state.status === "success" && state.data && state.data.services.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Service Breakdown
          </h3>
          <div className="overflow-x-auto rounded-md border border-border">
            <table
              className="w-full text-sm"
              aria-label="Per-service cost breakdown"
            >
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Service Name
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Monthly Cost ($)
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.services.map((service) => (
                  <tr
                    key={service.serviceId}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-3 py-2 text-foreground">
                      {service.serviceName}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {service.serviceType}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {service.available ? (
                        <span className="font-medium text-foreground">
                          {formatCurrency(service.monthlyCost)}
                        </span>
                      ) : (
                        <span className="italic text-muted-foreground">
                          Estimate unavailable
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Usage parameter adjustments */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          Usage Parameters
        </h3>
        {PARAMETER_CONFIGS.map((config) => (
          <ParameterSlider
            key={config.key}
            config={config}
            value={params[config.key]}
            onChange={(value) => handleParamChange(config.key, value)}
            error={validationErrors[config.key] ?? null}
            disabled={state.status === "loading"}
          />
        ))}
      </div>

      {/* Recalculate button */}
      <Button
        onClick={handleRecalculate}
        disabled={state.status === "loading" || hasValidationErrors}
        className="w-full"
        aria-label={
          state.status === "loading"
            ? "Recalculating cost estimate..."
            : "Recalculate cost estimate"
        }
      >
        {state.status === "loading" ? (
          <>
            <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
            Recalculating...
          </>
        ) : (
          "Recalculate"
        )}
      </Button>
    </div>
  );
}

// --- ParameterSlider sub-component ---

interface ParameterSliderProps {
  config: ParameterConfig;
  value: number;
  onChange: (value: number) => void;
  error: string | null;
  disabled: boolean;
}

function ParameterSlider({
  config,
  value,
  onChange,
  error,
  disabled,
}: ParameterSliderProps) {
  const inputId = `cost-param-${config.key}`;
  const errorId = `cost-param-error-${config.key}`;

  // Use logarithmic scale for large ranges
  const logMin = config.min > 0 ? Math.log10(config.min) : 0;
  const logMax = Math.log10(config.max || 1);

  const sliderToValue = (sliderPos: number): number => {
    // sliderPos is 0-100
    if (config.min === 0 && sliderPos === 0) return 0;
    const logValue = logMin + (sliderPos / 100) * (logMax - logMin);
    return Math.round(Math.pow(10, logValue));
  };

  const valueToSlider = (val: number): number => {
    if (val <= 0) return 0;
    const logValue = Math.log10(val);
    return ((logValue - logMin) / (logMax - logMin)) * 100;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderPos = Number(e.target.value);
    const newValue = sliderToValue(sliderPos);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, "");
    const numericValue = Number(rawValue);
    if (!isNaN(numericValue)) {
      onChange(numericValue);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-muted-foreground"
        >
          {config.label}
        </label>
        <span className="text-xs font-medium text-foreground">
          {config.formatValue(value)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={valueToSlider(value)}
          onChange={handleSliderChange}
          disabled={disabled}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`${config.label} slider`}
          aria-valuemin={config.min}
          aria-valuemax={config.max}
          aria-valuenow={value}
          aria-valuetext={config.formatValue(value)}
        />
      </div>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        value={value.toLocaleString()}
        onChange={handleInputChange}
        disabled={disabled}
        className={cn(
          "h-8 w-full rounded-md border bg-background px-2 text-xs text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-destructive" : "border-input"
        )}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? "true" : undefined}
      />
      {error && (
        <p
          id={errorId}
          className="text-xs text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// --- Inline SVG icons ---

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
