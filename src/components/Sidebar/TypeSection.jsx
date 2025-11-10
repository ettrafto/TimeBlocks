import React, { useMemo, useSyncExternalStore } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TypeHeader from '../Calendar/TypeHeader.jsx';
import TypeEditorModal from '../Modals/TypeEditorModal.jsx';
import TypeDeleteModal from '../Modals/TypeDeleteModal.jsx';
import { uiStore } from '../../state/uiStore.js';
import { useCreatePageStore } from '../../store/createPageStore.js';
import SortableEventRow from './SortableEventRow.jsx';
import { sortByOrder } from '../../utils/sort.js';
import { useTypesStore } from '../../state/typesStore.js';
import TaskEditorModal from '../Modals/TaskEditorModal.jsx';

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

function useUi() {
  return useSyncExternalStore(uiStore.subscribe, uiStore.get, uiStore.get);
}

export default function TypeSection({ typeEntity }) {
  // Make entire section a droppable target for unscheduling from calendar
  const droppableId = `type-drop:${typeEntity.id}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { kind: 'type-target', typeId: String(typeEntity.id) },
  });
  const ui = useUi();
  const collapsed = !!ui.collapsedByType?.[String(typeEntity.id)];
  const toggle = () => uiStore.toggleCollapsed(String(typeEntity.id));
  const order = ui.eventOrderByType?.[String(typeEntity.id)] || [];

  const { tasksByType, addTask, updateType: updateTypeCreate, removeType: removeTypeCreate } = useCreatePageStore();
  const { update: updateType } = useTypesStore.getState ? useTypesStore : { update: null };
  const [showTypeEditor, setShowTypeEditor] = React.useState(false);
  const [showTaskCreate, setShowTaskCreate] = React.useState(false);
  const [showTypeDelete, setShowTypeDelete] = React.useState(false);
  const raw = tasksByType?.[typeEntity.id] || [];
  const events = useMemo(() => sortByOrder(raw, order), [raw, order]);

  return (
    <section ref={setNodeRef} className={`rounded-lg border bg-white shadow-sm ${isOver ? 'ring-2 ring-blue-400/60' : ''}`}>
      <div className="px-2 py-2">
        <TypeHeader
          typeEntity={typeEntity}
          count={raw.length}
          collapsed={collapsed}
          onToggle={toggle}
          onChangeColor={(hex) => {
            console.log('[TypeSection] onChangeColor', { id: typeEntity.id, newHex: hex });
            // persist color to types store/backend
            try { useTypesStore.getState().update(typeEntity.id, { color: hex }); } catch {}
            // mirror to create page store so Create page reflects immediately
            try {
              // optimistic local update for Create store
              useCreatePageStore.setState((s) => {
                const next = {
                types: (s.types || []).map(t =>
                  t.id === typeEntity.id ? { ...t, color: hex } : t
                )
              };
                console.log('[TypeSection] createPageStore.types updated (optimistic)', next.types.find(t => t.id === typeEntity.id));
                return next;
              });
            } catch {}
            try { updateTypeCreate?.(typeEntity.id, { color: hex }); } catch (e) { console.warn('[TypeSection] updateType (persist) failed', e); }
          }}
          onEdit={() => setShowTypeEditor(true)}
          onDelete={() => setShowTypeDelete(true)}
        />
      </div>
      {!collapsed && (
        <div className="px-3 pb-3">
          <SortableContext items={events.map(e => String(e.id))} strategy={verticalListSortingStrategy}>
            {events.length === 0 && (
              <p className="text-sm text-gray-500 px-1">No events yet</p>
            )}
            <ul className="space-y-1">
              {events.map(e => (
                <SortableEventRow key={e.id} event={e} typeId={String(typeEntity.id)} />
              ))}
            </ul>
          </SortableContext>
          <div className="mt-2">
            <button
              onClick={() => setShowTaskCreate(true)}
              className="w-full py-2 px-3 text-sm font-medium rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center gap-2 shrink-0 border-gray-300 text-gray-600 bg-transparent hover:bg-gray-50"
              title="Add event"
            >
              <PlusIcon />
              <span>Add Event</span>
            </button>
          </div>
        </div>
      )}
      {collapsed && null}
      <TaskEditorModal
        isOpen={showTaskCreate}
        task={{ id: null, title: '', type_id: Number(typeEntity.id) }}
        types={useTypesStore().items || []}
        onCancel={() => setShowTaskCreate(false)}
        onSave={async ({ title, type_id }) => {
          await addTask({ type_id: Number(type_id ?? typeEntity.id), title });
          setShowTaskCreate(false);
        }}
      />
      <TypeEditorModal
        isOpen={showTypeEditor}
        type={{ id: typeEntity.id, name: typeEntity.name, color: typeEntity.color }}
        onCancel={() => setShowTypeEditor(false)}
        onSave={async ({ id, name, color }) => {
          console.log('[TypeSection] TypeEditorModal onSave', { id, name, color });
          try {
            await useTypesStore.getState().update(id, { name, color });
            // keep Create page store in sync
            try {
              // optimistic local update
              useCreatePageStore.setState((s) => {
                const next = {
                types: (s.types || []).map(t =>
                  t.id === id ? { ...t, name, color } : t
                )
              };
                console.log('[TypeSection] createPageStore.types updated (optimistic)', next.types.find(t => t.id === id));
                return next;
              });
            } catch {}
            try { await updateTypeCreate?.(id, { name, color }); } catch (e) { console.warn('[TypeSection] updateType (persist) failed', e); }
          } catch (e) {
            console.warn('Failed to update type', e);
          }
          setShowTypeEditor(false);
        }}
      />
      <TypeDeleteModal
        isOpen={showTypeDelete}
        type={{ id: typeEntity.id, name: typeEntity.name }}
        onCancel={() => setShowTypeDelete(false)}
        onConfirm={async (t) => {
          try {
            await useTypesStore.getState().remove(t.id);
            try { await removeTypeCreate?.(t.id, { skipApi: true }); } catch {}
          } catch (e) {
            console.warn('Failed to delete type', e);
          } finally {
            setShowTypeDelete(false);
          }
        }}
      />
    </section>
  );
}


