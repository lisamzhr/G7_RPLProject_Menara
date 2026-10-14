import { StatusLevel, ParameterStatusLevel } from "../types";

export function getStatusBadge(level: StatusLevel) {
  switch (level) {
    case "normal":
      return {
        label: "Normal",
        bgColor: "bg-emerald-100",
        textColor: "text-emerald-800",
        borderColor: "border-emerald-300",
        icon: "✓",
      };
    case "advisory":
      return {
        label: "Needs Attention (Advisory)",
        bgColor: "bg-amber-100",
        textColor: "text-amber-800",
        borderColor: "border-amber-300",
        icon: "⚠",
      };
    case "warning":
      return {
        label: "Action Required (Warning)",
        bgColor: "bg-rose-100",
        textColor: "text-rose-800",
        borderColor: "border-rose-300",
        icon: "!",
      };
  }
}

export function getParamStatusBadge(status: ParameterStatusLevel) {
  switch (status) {
    case "ok":
      return {
        label: "Optimal",
        bgColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "low":
      return {
        label: "Below Ideal",
        bgColor: "bg-sky-50 text-sky-700 border-sky-200",
      };
    case "high":
      return {
        label: "Above Ideal",
        bgColor: "bg-rose-50 text-rose-700 border-rose-200",
      };
  }
}
