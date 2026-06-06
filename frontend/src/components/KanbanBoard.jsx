import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  useDroppable,
} from "@dnd-kit/core";

import { useState, useEffect } from "react";
import { alpha, useTheme } from "@mui/material/styles";

import TaskCard, { TaskCardPreview } from "./TaskCard";
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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
  });

  const columnBg = isDark
    ? isOver
      ? alpha(theme.palette.primary.main, 0.14)
      : alpha(theme.palette.background.paper, 0.55)
    : isOver
      ? "#e8eaed"
      : "#f4f5f7";

  return (
    <div
      ref={setNodeRef}
      style={{
        width: "300px",

        background: columnBg,

        padding: "15px",

        borderRadius: "10px",

        minHeight: "500px",

        flexShrink: 0,

        ...(isDark
          ? {
              border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
            }
          : {}),
      }}
    >
      <h3
        style={{
          marginTop: 0,

          color: theme.palette.text.primary,
        }}
      >
        {title}
      </h3>

      {(columnTasks || []).map((task) => (
        <TaskCard key={task._id} task={task} onClick={onTaskClick} />
      ))}
    </div>
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
      <div
        style={{
          display: "flex",

          gap: "20px",
        }}
      >
        {columns.map((col) => (
          <DroppableColumn
            key={col}
            columnId={col}
            title={col}
            columnTasks={grouped[col]}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? <TaskCardPreview task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
