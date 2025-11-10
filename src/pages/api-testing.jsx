import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTypesStore, useTypesOrdered } from "../state/typesStore.js";
import { useTasksStore } from "../state/tasksStore.js";
import { eventsStore } from "../state/eventsStoreWithBackend.js";
import DebugNav from "../debug/components/DebugNav";
import log from "../lib/logger";

// Icons (outline, consistent with Create page)
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487L20.513 7.138M9.75 20.25H4.5v-5.25L16.862 3.487a2.25 2.25 0 013.182 3.182L7.682 18.182" />
  </svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15m-10.5 0V6a2.25 2.25 0 0 1 2.25-2.25h1.5A2.25 2.25 0 0 1 15.75 6v1.5M6.75 7.5l.75 10.5a2.25 2.25 0 0 0 2.25 2.25h4.5a2.25 2.25 0 0 0 2.25-2.25l.75-10.5" />
  </svg>
);

export default function ApiTestingPage() {
  const { items: types, loading: typesLoading, error: typesError, loadAll: loadTypes, create: createType, update: updateType, remove: removeType, counts: typeCounts } = useTypesStore();
  const orderedTypes = useTypesOrdered();
  const { loadAll: loadTasks, loadSubtasks, tasks, tasksForType, byTypeId, subtasksForTask, createTask, updateTask, removeTask, addSubtask, updateSubtask, removeSubtask, loading: tasksLoading, error: tasksError } = useTasksStore();

  // wire events store via subscription
  const eventsSnapshot = useSyncExternalStore(eventsStore.subscribe, eventsStore.get);
  const eventsStatus = eventsStore.getStatus ? eventsStore.getStatus() : { loading: false, error: null };
  const allEvents = useMemo(() => Array.from(eventsSnapshot.byId?.values?.() || []), [eventsSnapshot]);

  // On mount: load all
  useEffect(() => {
    let cancelers = [];
    const c1 = loadTypes({ force: true });
    const c2 = loadTasks({ force: true });
    eventsStore.loadAll({ force: true });
    if (typeof c1 === 'function') cancelers.push(c1);
    if (typeof c2 === 'function') cancelers.push(c2);
    return () => cancelers.forEach(fn => { try { fn(); } catch {} });
  }, []);

  // Forms
  const [typeForm, setTypeForm] = useState({ name: "", color: "#2563eb" });
  // parent-aware task form
  const [taskForm, setTaskForm] = useState({ id: null, type_id: 0, title: "", description: "", duration: "", priority: "", subtasks: [] });
  const resetTaskForm = () => setTaskForm({ id: null, type_id: 0, title: "", description: "", duration: "", priority: "", subtasks: [] });
  const [subForm, setSubForm] = useState({ task_id: 0, title: "" });
  const [subtaskForm, setSubtaskForm] = useState({ id: null, task_id: 0, title: "" });
  const [eventForm, setEventForm] = useState({ calendar_id: "cal_main", title: "Demo Event", start: new Date().toISOString(), end: new Date(Date.now()+3600000).toISOString(), type_id: null, color: "#2563eb" });
  const typeSelected = !!taskForm.type_id;
  const formErrors = {
    type: !taskForm.type_id,
    title: !taskForm.title?.trim(),
  };

  // Actions
  const onAddType = async () => {
    await createType({ name: typeForm.name, color: typeForm.color });
    setTypeForm({ name: "", color: "#2563eb" });
  };

  const onEditType = async (t) => {
    const name = prompt("New name", t.name) ?? t.name;
    const color = prompt("New color (hex)", t.color || "#2563eb") ?? t.color;
    await updateType(t.id, { name, color });
  };
  const onDeleteType = async (t) => { await removeType(t.id); };

  const loadTaskIntoForm = async (t) => {
    // Ensure subtasks for this task are loaded on demand
    try { await loadSubtasks?.(t.id, { force: false }); } catch {}
    setTaskForm({
      id: t.id,
      type_id: t.type_id,
      title: t.title || "",
      description: t.description || "",
      duration: t.duration || "",
      priority: t.priority || "",
      subtasks: (subtasksForTask(t.id) || []).map(s => ({ id: s.id, title: s.title })),
    });
    // Prime subtask form with selected task
    setSubtaskForm((f) => ({ id: null, task_id: t.id, title: "" }));
  };
  const onSubmitTask = async () => {
    if (formErrors.type || formErrors.title) return;
    if (taskForm.id == null) {
      await createTask({ type_id: Number(taskForm.type_id), title: taskForm.title, description: taskForm.description });
    } else {
      await updateTask(taskForm.id, { type_id: Number(taskForm.type_id), title: taskForm.title, description: taskForm.description });
    }
    resetTaskForm();
  };
  const onDeleteTask = async (t) => {
    if (!confirm("Delete this task?")) return;
    await removeTask(t.id);
    if (taskForm.id === t.id) resetTaskForm();
  };

  // Legacy quick-add (kept for debugging, not used in UI)
  const onAddSubtask = async () => {
    if (!subForm.task_id) return;
    await addSubtask(Number(subForm.task_id), subForm.title || "Untitled");
    setSubForm({ task_id: 0, title: "" });
  };
  const onEditSubtask = async (s) => {
    const title = prompt("New title", s.title) ?? s.title;
    await updateSubtask(s.id, { title });
  };
  const onDeleteSubtask = async (s) => { await removeSubtask(s.id); };
  const loadSubtaskIntoForm = (s) => {
    setSubtaskForm({ id: s.id, task_id: s.task_id, title: s.title });
  };
  const resetSubtaskForm = () => setSubtaskForm({ id: null, task_id: 0, title: "" });
  const onSubmitSubtask = async () => {
    const parentId = Number(subtaskForm.task_id || taskForm.id || 0);
    const title = (subtaskForm.title || "").trim();
    if (!parentId || !title) {
      log.warn(["API-Testing","subtasks","submit"], "missing parentId or title", { parentId, title });
      return;
    }
    try {
      if (subtaskForm.id == null) {
        log.info(["API-Testing","subtasks","create"], "creating subtask", { parentId, title });
        await addSubtask(parentId, title);
        log.info(["API-Testing","subtasks","create"], "created");
      } else {
        log.info(["API-Testing","subtasks","update"], "updating subtask", { id: subtaskForm.id, title });
        await updateSubtask(subtaskForm.id, { title });
        log.info(["API-Testing","subtasks","update"], "updated");
      }
      resetSubtaskForm();
    } catch (e) {
      log.error(["API-Testing","subtasks","submit"], "failed", e);
      alert(`Subtask error: ${e?.message || String(e)}`);
    }
  };

  return (
    <div className="w-full h-screen overflow-y-auto bg-gray-50">
      <DebugNav />
      <div className="p-8">
      <div className="w-full max-w-5xl mx-auto">
        {/* Manage Types */}
        <div className="bg-white border rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Manage Types</h3>
          <div className="flex gap-2 mb-3">
            <input className="border rounded-md px-3 py-2 text-sm" placeholder="Name" value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
            <input className="border rounded-md px-3 py-2 text-sm w-36" placeholder="#hex" value={typeForm.color} onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })} />
            <button onClick={onAddType} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">+ Add Type</button>
          </div>
          {typesLoading && <div className="text-sm text-gray-600">Loading...</div>}
          {typesError && <div className="text-sm text-red-600">Error: {typesError} <button className="underline" onClick={() => loadTypes({ force: true })}>Retry</button></div>}
          {!typesLoading && !typesError && (
          <ul className="space-y-2">
              {orderedTypes.length === 0 && <li className="text-sm text-gray-600">No Types yet</li>}
              {orderedTypes.map((t) => (
              <li key={t.id} className="border rounded-md p-3 text-sm flex items-center justify-between">
                <div>
                    <div className="font-medium">{t.name} <span className="ml-2 text-gray-500">(id: {t.id})</span></div>
                  {t.color && <div className="text-gray-600">color: {t.color}</div>}
                </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">count: {typeCounts()[String(t.id)] ?? 0}</span>
                    <button onClick={() => onEditType(t)} className="p-1.5 border rounded-md text-xs hover:bg-gray-50" title="Edit" aria-label="Edit">
                      <EditIcon />
                    </button>
                    <button onClick={() => onDeleteType(t)} className="p-1.5 border rounded-md text-xs text-red-600 hover:bg-red-50" title="Delete" aria-label="Delete">
                      <TrashIcon />
                    </button>
                </div>
              </li>
            ))}
          </ul>
          )}
        </div>

        {/* Tasks: Grouped list + Parent-aware form */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white border rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Tasks</h3>
            {tasksLoading && <div className="text-sm text-gray-600">Loading...</div>}
            {tasksError && <div className="text-sm text-red-600">Error: {tasksError} <button className="underline" onClick={() => loadTasks({ force: true })}>Retry</button></div>}
            {!tasksLoading && !tasksError && (
              <div className="space-y-4">
                {orderedTypes.map((t) => (
                  <div key={t.id} className="border rounded-md">
                    <div className="px-3 py-2 text-sm font-medium bg-gray-50 flex items-center justify-between">
                      <span>{t.name}</span>
                      <span className="text-xs text-gray-500">{(tasksForType(t.id) || []).length} tasks</span>
          </div>
                    <ul className="p-3 space-y-2">
                      {(tasksForType(t.id) || []).length === 0 && (
                        <li className="text-sm text-gray-600">No Tasks</li>
                      )}
                      {(tasksForType(t.id) || []).map(task => (
                        <li key={task.id} className="border rounded-md p-3 text-sm cursor-pointer" onClick={() => loadTaskIntoForm(task)}>
                          <div className="flex items-center justify-between">
                <div>
                              <div className="font-medium">{task.title} <span className="text-gray-500 ml-2">(id: {task.id})</span></div>
                              {task.description && <div className="text-gray-600">{task.description}</div>}
                </div>
                <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); loadTaskIntoForm(task); }} className="p-1.5 border rounded-md text-xs hover:bg-gray-50" title="Edit" aria-label="Edit">
                                <EditIcon />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); onDeleteTask(task); }} className="p-1.5 border rounded-md text-xs text-red-600 hover:bg-red-50" title="Delete" aria-label="Delete">
                                <TrashIcon />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 pl-3">
                            <div className="text-xs text-gray-500 mb-2">Subtasks</div>
                            <ul className="space-y-1">
                              {(subtasksForTask(task.id) || []).length === 0 && <li className="text-xs text-gray-500">No Subtasks</li>}
                              {(subtasksForTask(task.id) || []).map(st => (
                                <li key={st.id} className="flex items-center justify-between border rounded px-2 py-1 text-xs cursor-pointer" onClick={(e) => { e.stopPropagation(); loadSubtaskIntoForm(st); }}>
                                  <span>{st.title}</span>
                                  <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); loadSubtaskIntoForm(st); }} className="p-1.5 border rounded hover:bg-gray-50" title="Edit" aria-label="Edit">
                                      <EditIcon />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteSubtask(st); }} className="p-1.5 border rounded text-red-600 hover:bg-red-50" title="Delete" aria-label="Delete">
                                      <TrashIcon />
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white border rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">{taskForm.id ? 'Edit Task' : 'Create Task'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Type (required)</label>
                <select
                  className="border rounded-md px-3 py-2 text-sm w-full"
                  value={taskForm.type_id}
                  onChange={(e) => setTaskForm({ ...taskForm, type_id: Number(e.target.value) })}
                  disabled={typesLoading || (types || []).length === 0}
                >
                  <option value={0}>Select a Type…</option>
                  {orderedTypes.map(t => <option key={t.id} value={Number(t.id)}>{t.name}</option>)}
                </select>
                <div className="text-xs text-gray-500 mt-1">Tasks must belong to a Type.</div>
                {formErrors.type && <div className="text-xs text-red-600 mt-1">Select a Type to continue.</div>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Title (required)</label>
                <input
                  className="border rounded-md px-3 py-2 text-sm w-full"
                  placeholder="Task title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  disabled={!typeSelected}
                />
                {formErrors.title && <div className="text-xs text-red-600 mt-1">Title is required.</div>}
              </div>
                <div>
                <label className="block text-xs text-gray-600 mb-1">Description</label>
                <textarea
                  className="border rounded-md px-3 py-2 text-sm w-full"
                  rows={3}
                  placeholder="Optional description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  disabled={!typeSelected}
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onSubmitTask} disabled={formErrors.type || formErrors.title} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50">
                  {taskForm.id ? 'Save Changes' : 'Create Task'}
                </button>
                <button onClick={resetTaskForm} className="px-3 py-2 border rounded-md text-sm">Reset form</button>
              </div>
            </div>
            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Subtasks</h4>
              <div className="grid sm:grid-cols-3 gap-2 items-end">
                <div className="sm:col-span-1">
                  <label className="block text-xs text-gray-600 mb-1">Parent Task</label>
                  <input
                    className="border rounded-md px-3 py-2 text-sm w-full"
                    value={subtaskForm.task_id || taskForm.id || 0}
                    onChange={(e) => setSubtaskForm({ ...subtaskForm, task_id: Number(e.target.value) })}
                    placeholder="Task ID"
                  />
                  <div className="text-xs text-gray-500 mt-1">Select a Task from the left list or enter an ID.</div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Subtask title</label>
                  <input
                    className="border rounded-md px-3 py-2 text-sm w-full"
                    value={subtaskForm.title}
                    onChange={(e) => setSubtaskForm({ ...subtaskForm, title: e.target.value })}
                    placeholder="Subtask title"
                    disabled={!taskForm.id}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={onSubmitSubtask}
                  disabled={!(Number(subtaskForm.task_id || taskForm.id || 0) > 0) || !subtaskForm.title?.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50"
                >
                  {subtaskForm.id ? 'Save Subtask' : 'Add Subtask'}
                </button>
                <button onClick={resetSubtaskForm} className="px-3 py-2 border rounded-md text-sm">Reset subtask form</button>
              </div>
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="bg-white border rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Events</h3>
          {eventsStatus.loading && <div className="text-sm text-gray-600">Loading...</div>}
          {eventsStatus.error && <div className="text-sm text-red-600">Error: {eventsStatus.error} <button className="underline" onClick={() => eventsStore.loadAll({ force: true })}>Retry</button></div>}
          {!eventsStatus.loading && !eventsStatus.error && (
            <ul className="space-y-2">
              {allEvents.length === 0 && <li className="text-sm text-gray-600">No Events</li>}
              {allEvents.map((e) => (
              <li key={e.id} className="border rounded-md p-3 text-sm flex items-center justify-between">
                <div>
                    <div className="font-medium">{e.label || e.title || 'Untitled'} <span className="ml-2 text-gray-500">(id: {e.id})</span></div>
                    <div className="text-gray-600">{e.dateKey} • {e.startMinutes} → {e.startMinutes + (e.duration || 0)} mins</div>
                </div>
              </li>
            ))}
          </ul>
          )}
        </div>

        {/* Diagnostics */}
        <div className="bg-white border rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Raw JSON / Diagnostics</h3>
          <details>
            <summary className="cursor-pointer text-sm">Open diagnostics</summary>
            <div className="grid md:grid-cols-2 gap-4 mt-3">
              <pre className="bg-gray-50 border rounded p-2 text-xs overflow-auto">{JSON.stringify({ types, typesLoading, typesError }, null, 2)}</pre>
              <pre className="bg-gray-50 border rounded p-2 text-xs overflow-auto">{JSON.stringify({ tasks: tasks(), tasksState: { loading: tasksLoading, tasksError } }, null, 2)}</pre>
              <pre className="bg-gray-50 border rounded p-2 text-xs overflow-auto">{JSON.stringify({ events: allEvents, eventsStatus }, null, 2)}</pre>
                </div>
          </details>
        </div>
        </div>
      </div>
    </div>
  );
}


