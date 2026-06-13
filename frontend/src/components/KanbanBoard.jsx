import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  useDroppable,
} from "@dnd-kit/core";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";

import TaskCard, { TaskCardPreview } from "./TaskCard";
import EmptyState from "./ui/EmptyState";
import { StatusDot } from "./ui/MetaChips";
import { supabase } from "../lib/supabaseClient";
import { getApiBaseUrl } from "../lib/apiBaseUrl";

/** Prefer pointer position; fallback to card–column overlap (fixes column gaps + corner quirks). */
function boardCollisionDetection(args) {
  const pointerHits = pointerWithin(args);

  if (pointerHits.length > 0) {
    return pointerHits;
  }

  return rectIntersection(args);
}

const columns = ["To Do", "In Progress", "In Review", "Done"];

function DroppableColumn({ columnId, title, columnTasks, onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
  });

  return (
    <Box
      ref={setNodeRef}
      sx={(theme) => ({
        width: 300,
        flexShrink: 0,
        minHeight: 500,
        p: 1.75,
        borderRadius: 3,
        bgcolor: isOver ? "forge.columnBgOver" : "forge.columnBg",
        border: "1px solid",
        borderColor: isOver ? "primary.main" : "divider",
        boxShadow: isOver
          ? `0 0 0 3px ${theme.vars.palette.forge.glowSoft}`
          : "none",
        transition:
          "background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
      })}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, px: 0.5 }}>
        <StatusDot value={columnId} />
        <Typography variant="subtitle2" fontWeight={700}>
          {title}
        </Typography>
        <Chip
          label={(columnTasks || []).length}
          size="small"
          sx={{ height: 20, fontSize: "0.7rem", bgcolor: "background.paper" }}
        />
      </Stack>

      {(columnTasks || []).length === 0 ? (
        <EmptyState caption="Drop a task here" sx={{ py: 6 }} />
      ) : (
        <Stack spacing={1.5}>
          {(columnTasks || []).map((task) => (
            <TaskCard key={task._id} task={task} onClick={onTaskClick} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default function KanbanBoard({ tasks, setTasks, onTaskClick }) {
  const [grouped, setGrouped] = useState({});

  useEffect(() => {
    const map = {};

    columns.forEach((col) => {
      map[col] = tasks.filter((t) => t.status === col);
    });

    setGrouped(map);
  }, [tasks]);

  const resolveStatusFromOverId = (overId) => {
    const key = String(overId);

    if (columns.includes(key)) {
      return key;
    }

    const targetTask = tasks.find((t) => String(t._id) === key);

    return targetTask ? targetTask.status : null;
  };

  const [activeId, setActiveId] = useState(null);

  const activeTask =
    activeId == null
      ? null
      : tasks.find((t) => String(t._id) === String(activeId));

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over) return;

    const taskId = String(active.id);

    const newStatus = resolveStatusFromOverId(over.id);

    if (!newStatus) return;

    const task = tasks.find((t) => String(t._id) === taskId);

    if (!task) return;

    if (task.status === newStatus) return;

    const updatedTasks = tasks.map((t) =>
      String(t._id) === taskId ? { ...t, status: newStatus } : t,
    );

    setTasks(updatedTasks);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      await fetch(
        `${getApiBaseUrl()}/api/tasks/${taskId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },

          body: JSON.stringify({
            status: newStatus,
          }),
        },
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DndContext
      collisionDetection={boardCollisionDetection}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ display: "flex", gap: 2.5 }}>
        {columns.map((col) => (
          <DroppableColumn
            key={col}
            columnId={col}
            title={col}
            columnTasks={grouped[col]}
            onTaskClick={onTaskClick}
          />
        ))}
      </Box>

      <DragOverlay dropAnimation={null}>
        {activeTask ? <TaskCardPreview task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
