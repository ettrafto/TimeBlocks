import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DraggableTaskBlock from '../LeftPane/DraggableTaskBlock.jsx';
import { useTypesStore } from '../../state/typesStore.js';
import { useCreatePageStore } from '../../store/createPageStore.js';
import { hexToHsl, withSaturation, withLightness, hslToString, readableTextOn, tailwindToHex } from '../Create/colorUtils.js';
import TaskEditorModal from '../Modals/TaskEditorModal.jsx';
import TaskDeleteModal from '../Modals/TaskDeleteModal.jsx';
import DurationEditorModal from '../Modals/DurationEditorModal.jsx';
import { uiStore } from '../../state/uiStore.js';

export default function SortableEventRow({ event, typeId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(event.id),
    data: { context: 'sidebar', kind: 'task', typeId: String(typeId), eventId: String(event.id) },
  });

  const { items } = useTypesStore();
  const types = items || [];
  const { updateTask, removeTask, loadSubtasks } = useCreatePageStore();
  const cps = useCreatePageStore();
  const subtasks = cps.subtasksByTask?.[Number(event.id)] || [];
  // Always ensure subtasks are loaded for sidebar display
  React.useEffect(() => {
    const tid = Number(event.id);
    if (!Number.isFinite(tid)) return;
    if ((subtasks || []).length > 0) return; // already loaded
    try { loadSubtasks?.(tid); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);
  const [showEditor, setShowEditor] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [showDuration, setShowDuration] = React.useState(false);
  // Subscribe to UI store to know which templates are already scheduled
  const ui = React.useSyncExternalStore(uiStore.subscribe, uiStore.get, uiStore.get);

  // derive color from type color (desaturated)
  const typeHex = (() => {
    const tId = event.type_id != null ? String(event.type_id) : (event.typeId != null ? String(event.typeId) : String(typeId));
    const t = (types || []).find(tt => String(tt.id) === tId);
    const c = t?.color;
    if (!c) return '#3b82f6';
    return c.startsWith('#') ? c : tailwindToHex(c);
  })();
  const base = hexToHsl(typeHex);
  const bgHsl = withLightness(withSaturation(base, base.s * 0.35), 0.92);
  const bg = hslToString(bgHsl);
  const text = readableTextOn(bgHsl);

  const task = {
    id: String(event.id),
    name: event.title || event.name || 'Untitled',
    label: event.title || event.name || 'Untitled',
    bgColor: bg,
    textColor: text,
    duration: Number.isFinite(Number(event.duration)) ? Number(event.duration) : 30,
    typeId: event.type_id != null ? String(event.type_id) : (event.typeId != null ? String(event.typeId) : String(typeId)),
  };
  const isScheduled = !!(ui?.scheduledTemplateIds?.[String(task.id)] || event?.scheduled);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const onEdit = () => {
    setShowEditor(true);
  };

  const onDelete = () => {
    setShowDelete(true);
  };

  return (
    <>
      <li ref={setNodeRef} style={style} className="rounded border border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-2 py-1.5">
          {/* Drag handle (match Create page handle style) */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-black/5 shrink-0 transition-colors"
            aria-label="Reorder task"
            title="Drag to reorder task"
          >
            ⠿
          </button>
          <div className="flex-1 min-w-0">
            <DraggableTaskBlock task={task} types={types} onEdit={onEdit} onDelete={onDelete} onClockClick={() => setShowDuration(true)} disabled={isScheduled}>
              {(subtasks || []).length > 0 && (
                <ul className="mt-1 space-y-1">
                  {(subtasks || []).map(st => (
                    <li
                      key={st.id}
                      className="px-2 py-1 text-[11px] rounded border border-white/40 bg-white/15"
                      title={st.title}
                    >
                      {st.title}
                    </li>
                  ))}
                </ul>
              )}
            </DraggableTaskBlock>
          </div>
        </div>
      </li>
      <TaskEditorModal
        isOpen={showEditor}
        task={{ id: event.id, title: task.name, type_id: Number(task.typeId) }}
        types={types}
        onCancel={() => setShowEditor(false)}
        onSave={async ({ id, title, type_id }) => {
          if (Number.isFinite(Number(id))) {
            await updateTask(Number(id), { title, type_id });
            setShowEditor(false);
          }
        }}
      />
      <DurationEditorModal
        isOpen={showDuration}
        current={task.duration}
        onCancel={() => setShowDuration(false)}
        onSave={async (minutes) => {
          console.log('[SortableEventRow] Set duration', { id: event.id, minutes });
          const idNum = Number(event.id);
          if (!Number.isFinite(idNum)) return;
          try {
            await updateTask(idNum, { duration: Number(minutes) });
          } finally {
            setShowDuration(false);
          }
        }}
      />
      <TaskDeleteModal
        isOpen={showDelete}
        task={{ id: event.id, title: task.name }}
        onCancel={() => setShowDelete(false)}
        onConfirm={async (t) => {
          if (Number.isFinite(Number(t.id))) {
            await removeTask(Number(t.id));
            setShowDelete(false);
          }
        }}
      />
    </>
  );
}


