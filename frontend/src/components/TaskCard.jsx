import { useDraggable } from "@dnd-kit/core";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

import UserAvatar from "./UserAvatar";
import { TypeChip, PriorityChip } from "./ui/MetaChips";

const cardSx = (theme) => ({
  p: 1.75,
  borderRadius: 2.5,
  "&:hover": {
    borderColor: "primary.main",
    boxShadow: `0 4px 14px ${theme.vars.palette.forge.glowSoft}`,
  },
});

function TaskCardBody({ task, onClick }) {
  return (
    <Box onClick={() => onClick?.(task)} sx={{ cursor: "pointer" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 1,
        }}
      >
        <Typography variant="body2" fontWeight={600} sx={{ wordBreak: "break-word" }}>
          {task.title}
        </Typography>

        <Stack direction="row" spacing={-0.75} flexShrink={0}>
          {task.assignees?.map((user) => (
            <UserAvatar key={user._id} name={user.username} size={24} />
          ))}
        </Stack>
      </Box>

      <Stack direction="row" spacing={0.75} sx={{ mt: 1.25 }}>
        {task.type ? <TypeChip value={task.type} /> : null}
        {task.priority ? <PriorityChip value={task.priority} /> : null}
      </Stack>
    </Box>
  );
}

function DragHandle(props) {
  return (
    <Box
      {...props}
      sx={{
        display: "flex",
        alignItems: "center",
        color: "text.disabled",
        cursor: "grab",
        touchAction: "none",
        mb: 0.5,
        mx: -0.5,
      }}
    >
      <DragIndicatorIcon fontSize="small" />
    </Box>
  );
}

/** Static preview for <DragOverlay /> — must not call useDraggable. */
export function TaskCardPreview({ task }) {
  return (
    <Card
      sx={(theme) => ({
        ...cardSx(theme),
        cursor: "grabbing",
        boxShadow: `0 8px 28px ${theme.vars.palette.forge.glow}`,
        borderColor: "primary.main",
      })}
    >
      <DragHandle />
      <TaskCardBody task={task} />
    </Card>
  );
}

export default function TaskCard({ task, onClick }) {
  const id = String(task._id);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  return (
    <Card
      ref={setNodeRef}
      sx={cardSx}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.35 : undefined,
      }}
    >
      <DragHandle {...listeners} {...attributes} />
      <TaskCardBody task={task} onClick={onClick} />
    </Card>
  );
}
