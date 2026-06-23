import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LogMetricQuery, MetricFormulaConfig } from "@/lib/logMetrics/metrics";

type FormulaOperation = Extract<MetricFormulaConfig, { type: "operation" }>["operation"];

const operations: FormulaOperation[] = [
  "sum",
  "difference",
  "ratio",
  "percentage",
  "min",
  "max",
  "average",
];
const operationLabels: Record<FormulaOperation, string> = {
  average: "average",
  difference: "difference (A - B)",
  max: "max",
  min: "min",
  percentage: "percentage (A / B * 100)",
  ratio: "ratio (A / B)",
  sum: "sum",
};
const multiOperandOperations = new Set<FormulaOperation>([
  "sum",
  "min",
  "max",
  "average",
]);

export function MetricFormulaBuilder({
  formula,
  formulaConfig,
  onFormulaChange,
  onFormulaConfigChange,
  queries,
}: {
  formula: string;
  formulaConfig: MetricFormulaConfig;
  onFormulaChange: (formula: string) => void;
  onFormulaConfigChange: (formula: MetricFormulaConfig) => void;
  queries: LogMetricQuery[];
}) {
  const queryIds = queries.map((query) => query.id).filter(Boolean);
  const advanced = formulaConfig.type === "advanced";
  const operationConfig = formulaConfig.type === "operation" ? formulaConfig : undefined;

  return (
    <div className="grid gap-2">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={advanced}
          onCheckedChange={(checked) =>
            checked === true
              ? onFormulaConfigChange({ type: "advanced", expression: formula || queryIds[0] || "A" })
              : onFormulaConfigChange({ type: "single", queryId: queryIds[0] || "A" })
          }
        />
        Advanced formula
      </label>
      {advanced ? (
        <Input
          className="w-72"
          onChange={(event) => {
            onFormulaChange(event.currentTarget.value);
            onFormulaConfigChange({ type: "advanced", expression: event.currentTarget.value });
          }}
          placeholder="A / B * 100"
          value={formula}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Select
            onValueChange={(type) =>
              type === "single"
                ? onFormulaConfigChange({ type, queryId: queryIds[0] || "A" })
                : onFormulaConfigChange({
                    type: "operation",
                    operation: "sum",
                    operands: queryIds.slice(0, 2),
                  })
            }
            value={formulaConfig.type}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="operation">Operation</SelectItem>
            </SelectContent>
          </Select>
          {formulaConfig.type === "single" ? (
            <QuerySelect
              onChange={(queryId) => onFormulaConfigChange({ type: "single", queryId })}
              queryIds={queryIds}
              value={formulaConfig.queryId}
            />
          ) : operationConfig ? (
            <>
              <Select
                onValueChange={(operation) =>
                  onFormulaConfigChange({
                    ...operationConfig,
                    operation: operation as FormulaOperation,
                    operands: normalizeOperandsForOperation(
                      operation as FormulaOperation,
                      operationConfig.operands,
                      queryIds,
                    ),
                  })
                }
                value={operationConfig.operation}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operations.map((operation) => (
                    <SelectItem key={operation} value={operation}>
                      {operationLabels[operation]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <OperandSelectors
                config={operationConfig}
                onChange={onFormulaConfigChange}
                queryIds={queryIds}
              />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function OperandSelectors({
  config,
  onChange,
  queryIds,
}: {
  config: Extract<MetricFormulaConfig, { type: "operation" }>;
  onChange: (formula: MetricFormulaConfig) => void;
  queryIds: string[];
}) {
  const operands = normalizeOperandsForOperation(config.operation, config.operands, queryIds);
  const canAddOperand = multiOperandOperations.has(config.operation);

  function updateOperand(index: number, queryId: string) {
    onChange({
      ...config,
      operands: operands.map((operand, currentIndex) =>
        currentIndex === index ? queryId : operand,
      ),
    });
  }

  function addOperand() {
    onChange({
      ...config,
      operands: [...operands, queryIds[0] ?? ""],
    });
  }

  function removeOperand(index: number) {
    onChange({
      ...config,
      operands: operands.filter((_, currentIndex) => currentIndex !== index),
    });
  }

  return (
    <>
      {operands.map((operand, index) => (
        <div className="flex items-center gap-1" key={index}>
          <span className="w-4 text-xs text-muted-foreground">
            {String.fromCharCode(65 + index)}
          </span>
          <QuerySelect
            onChange={(queryId) => updateOperand(index, queryId)}
            queryIds={queryIds}
            value={operand}
          />
          {canAddOperand && operands.length > 2 ? (
            <Button
              className="size-9"
              onClick={() => removeOperand(index)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
        </div>
      ))}
      {canAddOperand ? (
        <Button onClick={addOperand} type="button" variant="outline">
          <Plus aria-hidden="true" className="size-4" />
          Operand
        </Button>
      ) : null}
    </>
  );
}

function normalizeOperandsForOperation(
  operation: FormulaOperation,
  operands: string[],
  queryIds: string[],
) {
  const fallbackA = operands[0] ?? queryIds[0] ?? "";
  const fallbackB = operands[1] ?? queryIds[1] ?? fallbackA;
  if (!multiOperandOperations.has(operation)) {
    return [fallbackA, fallbackB];
  }
  return operands.length >= 2 ? operands : [fallbackA, fallbackB];
}

function QuerySelect({
  onChange,
  queryIds,
  value,
}: {
  onChange: (queryId: string) => void;
  queryIds: string[];
  value: string;
}) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-24">
        <SelectValue placeholder="Query" />
      </SelectTrigger>
      <SelectContent>
        {queryIds.map((queryId) => (
          <SelectItem key={queryId} value={queryId}>
            {queryId}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
