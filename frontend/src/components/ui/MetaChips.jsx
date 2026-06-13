import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";

// Semantic chips for task metadata. Colors come from the theme's custom
// palette tokens (see src/styles/theme.js), so they adapt to light/dark
// automatically. Unknown values (e.g. free-form types from LLM drafts)
// fall back to a neutral outlined chip.

const STATUS_KEYS = {
  "To Do": "todo",
  "In Progress": "inProgress",
  "In Review": "inReview",
  Done: "done",
  Completed: "done",
};

const PRIORITY_KEYS = {
  Urgent: "urgent",
  High: "high",
  Medium: "medium",
  Low: "low",
  None: "none",
};

const TYPE_KEYS = {
  Feature: "feature",
  Story: "feature",
  Bug: "bug",
  Improvement: "improvement",
  Task: "improvement",
};

function TokenChip({ group, tokenKey, label, ...props }) {
  if (!tokenKey) {
    return <Chip size="small" variant="outlined" label={label} {...props} />;
  }
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        bgcolor: `${group}.${tokenKey}Bg`,
        color: `${group}.${tokenKey}Fg`,
      }}
      {...props}
    />
  );
}

export function StatusChip({ value, ...props }) {
  return (
    <TokenChip
      group="status"
      tokenKey={STATUS_KEYS[value]}
      label={value}
      {...props}
    />
  );
}

export function PriorityChip({ value, ...props }) {
  return (
    <TokenChip
      group="priority"
      tokenKey={PRIORITY_KEYS[value]}
      label={value}
      {...props}
    />
  );
}

export function TypeChip({ value, ...props }) {
  return (
    <TokenChip
      group="tasktype"
      tokenKey={TYPE_KEYS[value]}
      label={value}
      {...props}
    />
  );
}

// Small colored dot keyed to a status — used in kanban column headers.
export function StatusDot({ value, size = 8 }) {
  const key = STATUS_KEYS[value] || "todo";
  return (
    <Box
      component="span"
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: `status.${key}Fg`,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}
