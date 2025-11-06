import React, { useEffect, useState } from "react";
import { apiRequest } from "../services/api.js";

export default function ApiTestingPage() {
  const [endpoint, setEndpoint] = useState("/api/test");
  const [method, setMethod] = useState("GET");
  const [body, setBody] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const nowIso = new Date().toISOString();
  const inOneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const samples = [
    { group: "Health", items: [
      { label: "GET /api/health", method: "GET", path: "/api/health" },
      { label: "POST /api/debug/selfcheck", method: "POST", path: "/api/debug/selfcheck" },
    ]},
    { group: "Types", items: [
      { label: "GET /api/types", method: "GET", path: "/api/types" },
      { label: "POST /api/types", method: "POST", path: "/api/types", body: { name: "Work", color: "#2563eb" } },
      { label: "PATCH /api/types/{id}", method: "PATCH", path: "/api/types/1", body: { name: "Work+", color: "#1d4ed8" } },
      { label: "DELETE /api/types/{id}", method: "DELETE", path: "/api/types/1" },
    ]},
    { group: "Tasks", items: [
      { label: "GET /api/tasks?typeId=1", method: "GET", path: "/api/tasks?typeId=1" },
      { label: "POST /api/tasks", method: "POST", path: "/api/tasks", body: { type_id: 1, title: "Sample Task", description: "demo" } },
      { label: "PATCH /api/tasks/{id}", method: "PATCH", path: "/api/tasks/1", body: { title: "Renamed Task" } },
      { label: "DELETE /api/tasks/{id}", method: "DELETE", path: "/api/tasks/1" },
    ]},
    { group: "Subtasks", items: [
      { label: "GET /api/subtasks?taskId=1", method: "GET", path: "/api/subtasks?taskId=1" },
      { label: "POST /api/subtasks", method: "POST", path: "/api/subtasks", body: { task_id: 1, title: "First sub" } },
      { label: "PATCH /api/subtasks/{id}", method: "PATCH", path: "/api/subtasks/1", body: { title: "Renamed sub", done: true } },
      { label: "DELETE /api/subtasks/{id}", method: "DELETE", path: "/api/subtasks/1" },
    ]},
    { group: "Calendar Window", items: [
      { label: "GET /api/calendars/cal_main/events?from..&to..", method: "GET", path: `/api/calendars/cal_main/events?from=${encodeURIComponent(nowIso)}&to=${encodeURIComponent(inOneWeek)}` },
    ]},
    { group: "Events CRUD", items: [
      { label: "POST /api/events", method: "POST", path: "/api/events", body: { calendar_id: "cal_main", title: "Demo Event", start: nowIso, end: inOneHour, type_id: "type-work", color: "#2563eb" } },
      { label: "PATCH /api/events/{id}", method: "PATCH", path: "/api/events/{eventId}", body: { title: "Updated Title" } },
      { label: "DELETE /api/events/{id}", method: "DELETE", path: "/api/events/{eventId}" },
    ]},
    { group: "Legacy (if used)", items: [
      { label: "GET /api/calendars/cal_main/scheduled-events?from..&to..", method: "GET", path: `/api/calendars/cal_main/scheduled-events?from=${encodeURIComponent(nowIso)}&to=${encodeURIComponent(inOneWeek)}` },
      { label: "POST /api/calendars/cal_main/scheduled-events", method: "POST", path: "/api/calendars/cal_main/scheduled-events", body: { title: "Legacy", start: nowIso, end: inOneHour } },
    ]},
  ];

  const quickSet = (item, autoSend = true) => {
    setEndpoint(item.path);
    setMethod(item.method);
    setBody(item.body ? JSON.stringify(item.body, null, 2) : "");
    if (autoSend) {
      // slight delay to ensure state updates rendered before sending
      setTimeout(() => sendRequest(), 0);
    }
  };

  // Quick testers via centralized API client (uses VITE_API_BASE)
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState(null);
  const [quickResult, setQuickResult] = useState(null);

  const runQuick = async (item) => {
    setQuickLoading(true);
    setQuickError(null);
    setQuickResult(null);
    try {
      const data = await apiRequest(item.path, { method: item.method, body: item.body });
      setQuickResult(data);
    } catch (e) {
      setQuickError(e?.message || String(e));
    } finally {
      setQuickLoading(false);
    }
  };

  // ------------------------------------------
  // Simple CRUD managers (local lists)
  // ------------------------------------------
  const [createdTypes, setCreatedTypes] = useState([]);
  const [typeForm, setTypeForm] = useState({ name: "", color: "#2563eb" });

  const [createdTasks, setCreatedTasks] = useState([]);
  const [taskForm, setTaskForm] = useState({ type_id: 1, title: "Sample Task", description: "" });

  const [createdSubs, setCreatedSubs] = useState([]);
  const [subForm, setSubForm] = useState({ task_id: 1, title: "First sub" });

  const [createdEvents, setCreatedEvents] = useState([]);
  const [eventForm, setEventForm] = useState({
    calendar_id: "cal_main",
    title: "Demo Event",
    start: nowIso,
    end: inOneHour,
    type_id: "type-work",
    color: "#2563eb",
  });

  async function apiJson(path, init) {
    return apiRequest(path, { method: init?.method || "GET", body: init?.body });
  }

  // Types CRUD
  const createTypeItem = () => refreshTypesAfter(async () => {
    const created = await apiJson("/api/types", { method: "POST", body: typeForm });
    setCreatedTypes((prev) => [created, ...prev]);
  });
  const updateTypeItem = (t) => refreshTypesAfter(async () => {
    const name = prompt("New name", t.name) ?? t.name;
    const color = prompt("New color (hex)", t.color || "#2563eb") ?? t.color;
    const updated = await apiJson(`/api/types/${t.id}`, { method: "PATCH", body: { name, color } });
    setCreatedTypes((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
  });
  const deleteTypeItem = (t) => refreshTypesAfter(async () => {
    await apiJson(`/api/types/${t.id}`, { method: "DELETE" });
    setCreatedTypes((prev) => prev.filter((x) => x.id !== t.id));
  });

  // Tasks CRUD
  const createTaskItem = () => refreshTasksAfter(async () => {
    const created = await apiJson("/api/tasks", { method: "POST", body: taskForm });
    setCreatedTasks((prev) => [created, ...prev]);
  });
  const updateTaskItem = (t) => refreshTasksAfter(async () => {
    const title = prompt("New title", t.title) ?? t.title;
    const updated = await apiJson(`/api/tasks/${t.id}`, { method: "PATCH", body: { title } });
    setCreatedTasks((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
  });
  const deleteTaskItem = (t) => refreshTasksAfter(async () => {
    await apiJson(`/api/tasks/${t.id}`, { method: "DELETE" });
    setCreatedTasks((prev) => prev.filter((x) => x.id !== t.id));
  });

  // Subtasks CRUD
  const createSubItem = () => refreshSubsAfter(async () => {
    const created = await apiJson("/api/subtasks", { method: "POST", body: subForm });
    setCreatedSubs((prev) => [created, ...prev]);
  });
  const updateSubItem = (s) => refreshSubsAfter(async () => {
    const title = prompt("New title", s.title) ?? s.title;
    const updated = await apiJson(`/api/subtasks/${s.id}`, { method: "PATCH", body: { title } });
    setCreatedSubs((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
  });
  const deleteSubItem = (s) => refreshSubsAfter(async () => {
    await apiJson(`/api/subtasks/${s.id}`, { method: "DELETE" });
    setCreatedSubs((prev) => prev.filter((x) => x.id !== s.id));
  });

  // Events CRUD
  const createEventItem = () => refreshEventsAfter(async () => {
    const created = await apiJson("/api/events", { method: "POST", body: eventForm });
    setCreatedEvents((prev) => [created, ...prev]);
  });
  const updateEventItem = (e) => refreshEventsAfter(async () => {
    const title = prompt("New title", e.title ?? "");
    const updated = await apiJson(`/api/events/${e.id}`, { method: "PATCH", body: { title } });
    setCreatedEvents((prev) => prev.map((x) => (x.id === e.id ? updated : x)));
  });
  const deleteEventItem = (e) => refreshEventsAfter(async () => {
    await apiJson(`/api/events/${e.id}`, { method: "DELETE" });
    setCreatedEvents((prev) => prev.filter((x) => x.id !== e.id));
  });

  // Existing data loaders and lists
  const [existingTypes, setExistingTypes] = useState([]);
  const [existingTasks, setExistingTasks] = useState([]);
  const [existingSubs, setExistingSubs] = useState([]);
  const [existingEvents, setExistingEvents] = useState([]);

  const loadTypes = async () => {
    try { setExistingTypes(await apiJson("/api/types") || []); } catch {}
  };
  const loadTasks = async () => {
    try { setExistingTasks(await apiJson("/api/tasks") || []); } catch {}
  };
  const loadAllSubtasks = async () => {
    try {
      const tasks = await apiJson("/api/tasks");
      const subsAgg = [];
      for (const t of tasks || []) {
        try { subsAgg.push(...(await apiJson(`/api/subtasks?taskId=${t.id}`) || [])); } catch {}
      }
      setExistingSubs(subsAgg);
    } catch {}
  };
  const loadEvents = async () => {
    try {
      const list = await apiJson(`/api/calendars/${encodeURIComponent(eventForm.calendar_id)}/events?from=${encodeURIComponent(nowIso)}&to=${encodeURIComponent(inOneWeek)}`);
      setExistingEvents(list || []);
    } catch {}
  };

  useEffect(() => {
    loadTypes();
    loadTasks();
    loadAllSubtasks();
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh lists after CRUD
  const refreshTypesAfter = async (fn) => { await fn(); await loadTypes(); };
  const refreshTasksAfter = async (fn) => { await fn(); await loadTasks(); };
  const refreshSubsAfter = async (fn) => { await fn(); await loadAllSubtasks(); };
  const refreshEventsAfter = async (fn) => { await fn(); await loadEvents(); };

  const sendRequest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const init = {
        method,
        headers: { "Content-Type": "application/json" },
      };
      if (method !== "GET" && body) init.body = body;
      const res = await fetch(endpoint, init);
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
      if (!res.ok) throw new Error((data && (data.message || data.error)) || res.statusText);
      setResponse(data);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen overflow-y-auto bg-gray-50 p-8">
      <div className="w-full max-w-5xl mx-auto">
        {/* Managers */}
        <div className="bg-white border rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Manage Types</h3>
          <div className="flex gap-2 mb-3">
            <input className="border rounded-md px-3 py-2 text-sm" placeholder="Name" value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
            <input className="border rounded-md px-3 py-2 text-sm w-36" placeholder="#hex" value={typeForm.color} onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })} />
            <button onClick={createTypeItem} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Create</button>
          </div>
          <ul className="space-y-2">
            {createdTypes.map((t) => (
              <li key={t.id} className="border rounded-md p-3 text-sm flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.name} <span className="ml-2 text-gray-500">(id: {t.id}{t.uid ? `, uid: ${t.uid}` : ""})</span></div>
                  {t.color && <div className="text-gray-600">color: {t.color}</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateTypeItem(t)} className="px-3 py-1 border rounded-md text-xs">Update</button>
                  <button onClick={() => deleteTypeItem(t)} className="px-3 py-1 border rounded-md text-xs text-red-600">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Manage Tasks</h3>
          <div className="flex gap-2 mb-3">
            <input className="border rounded-md px-3 py-2 text-sm w-24" type="number" placeholder="type_id" value={taskForm.type_id} onChange={(e) => setTaskForm({ ...taskForm, type_id: Number(e.target.value) })} />
            <input className="border rounded-md px-3 py-2 text-sm flex-1" placeholder="Title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
            <input className="border rounded-md px-3 py-2 text-sm flex-1" placeholder="Description" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
            <button onClick={createTaskItem} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Create</button>
          </div>
          <ul className="space-y-2">
            {createdTasks.map((t) => (
              <li key={t.id} className="border rounded-md p-3 text-sm flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.title} <span className="ml-2 text-gray-500">(id: {t.id}{t.uid ? `, uid: ${t.uid}` : ""})</span></div>
                  <div className="text-gray-600">type_id: {t.type_id}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateTaskItem(t)} className="px-3 py-1 border rounded-md text-xs">Update</button>
                  <button onClick={() => deleteTaskItem(t)} className="px-3 py-1 border rounded-md text-xs text-red-600">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Manage Subtasks</h3>
          <div className="flex gap-2 mb-3">
            <input className="border rounded-md px-3 py-2 text-sm w-24" type="number" placeholder="task_id" value={subForm.task_id} onChange={(e) => setSubForm({ ...subForm, task_id: Number(e.target.value) })} />
            <input className="border rounded-md px-3 py-2 text-sm flex-1" placeholder="Title" value={subForm.title} onChange={(e) => setSubForm({ ...subForm, title: e.target.value })} />
            <button onClick={createSubItem} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Create</button>
          </div>
          <ul className="space-y-2">
            {createdSubs.map((s) => (
              <li key={s.id} className="border rounded-md p-3 text-sm flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.title} <span className="ml-2 text-gray-500">(id: {s.id}{s.uid ? `, uid: ${s.uid}` : ""})</span></div>
                  <div className="text-gray-600">task_id: {s.task_id}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateSubItem(s)} className="px-3 py-1 border rounded-md text-xs">Update</button>
                  <button onClick={() => deleteSubItem(s)} className="px-3 py-1 border rounded-md text-xs text-red-600">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Manage Events</h3>
          <div className="grid md:grid-cols-2 gap-2 mb-3">
            <input className="border rounded-md px-3 py-2 text-sm" placeholder="calendar_id" value={eventForm.calendar_id} onChange={(e) => setEventForm({ ...eventForm, calendar_id: e.target.value })} />
            <input className="border rounded-md px-3 py-2 text-sm" placeholder="title" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
            <input className="border rounded-md px-3 py-2 text-sm" placeholder="start ISO" value={eventForm.start} onChange={(e) => setEventForm({ ...eventForm, start: e.target.value })} />
            <input className="border rounded-md px-3 py-2 text-sm" placeholder="end ISO" value={eventForm.end} onChange={(e) => setEventForm({ ...eventForm, end: e.target.value })} />
            <input className="border rounded-md px-3 py-2 text-sm" placeholder="type_id (e.g., type-work)" value={eventForm.type_id} onChange={(e) => setEventForm({ ...eventForm, type_id: e.target.value })} />
            <input className="border rounded-md px-3 py-2 text-sm" placeholder="#color" value={eventForm.color} onChange={(e) => setEventForm({ ...eventForm, color: e.target.value })} />
          </div>
          <button onClick={createEventItem} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Create Event</button>
          <ul className="space-y-2 mt-3">
            {createdEvents.map((e) => (
              <li key={e.id} className="border rounded-md p-3 text-sm flex items-center justify-between">
                <div>
                  <div className="font-medium">{e.title} <span className="ml-2 text-gray-500">(id: {e.id}{e.uid ? `, uid: ${e.uid}` : ""})</span></div>
                  <div className="text-gray-600">{e.start} → {e.end}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateEventItem(e)} className="px-3 py-1 border rounded-md text-xs">Update</button>
                  <button onClick={() => deleteEventItem(e)} className="px-3 py-1 border rounded-md text-xs text-red-600">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white border rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Endpoint Tests</h3>
          <div className="space-y-6">
            {samples.map((section) => (
              <div key={section.group}>
                <div className="text-sm font-medium text-gray-700 mb-2">{section.group}</div>
                <div className="grid md:grid-cols-2 gap-2">
                  {section.items.map((it) => (
                    <button
                      key={it.label}
                      onClick={() => runQuick(it)}
                      className="text-left w-full border rounded-md px-3 py-2 text-sm hover:bg-gray-50"
                      title={`${it.method} ${it.path}`}
                    >
                      <span className="inline-block min-w-[64px] mr-2 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-mono">{it.method}</span>
                      <span className="font-medium">{it.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            {quickError && (
              <pre className="bg-red-50 text-red-800 border border-red-200 p-3 rounded-md text-sm whitespace-pre-wrap">{quickError}</pre>
            )}
            {quickResult && (
              <pre className="bg-green-50 text-green-800 border border-green-200 p-3 rounded-md text-sm overflow-auto">{JSON.stringify(quickResult, null, 2)}</pre>
            )}
            {quickLoading && (
              <div className="text-sm text-gray-600">Loading...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


