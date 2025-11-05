import React, { useEffect, useMemo, useState } from "react";
import { api, WORKSPACE_ID, CALENDAR_ID } from "../services/api";

export default function DiagnosticsPage() {
  const [health, setHealth] = useState(null);
  const [healthErr, setHealthErr] = useState(null);

  // Types
  const [types, setTypes] = useState([]);
  const [tForm, setTForm] = useState({ name: "", color: "#3388ff", icon: "Tag", defaultsJson: "{}" });
  const [tBusy, setTBusy] = useState(false);
  const [typesError, setTypesError] = useState(null);

  // Events
  const now = useMemo(() => new Date(), []);
  const iso = (d) => d.toISOString();
  const [evts, setEvts] = useState([]);
  const [eForm, setEForm] = useState({
    title: "New Event",
    typeId: "",
    startUtc: iso(now),
    endUtc: iso(new Date(now.getTime() + 60 * 60 * 1000)),
    tzid: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notes: "",
  });
  const [eBusy, setEBusy] = useState(false);
  const [eventsError, setEventsError] = useState(null);

  useEffect(() => {
    (async () => {
      // Health check
      try {
        const h = await api.health();
        setHealth(h);
      } catch (e) {
        setHealthErr(e.message);
      }

      // Load types
      try {
        const loadedTypes = await api.getTypes(WORKSPACE_ID);
        setTypes(Array.isArray(loadedTypes) ? loadedTypes : []);
      } catch (e) {
        console.error("Types load failed:", e);
        setTypesError(e.message);
      }

      // Load events
      try {
        const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthTo = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const loadedEvts = await api.getScheduledEvents(CALENDAR_ID, {
          from: iso(monthFrom),
          to: iso(monthTo),
        });
        setEvts(Array.isArray(loadedEvts) ? loadedEvts : []);
      } catch (e) {
        console.error("Events load failed:", e);
        setEventsError(e.message);
      }
    })();
  }, [now]);

  async function createType() {
    if (!tForm.name.trim()) {
      alert("Type name is required");
      return;
    }
    setTBusy(true);
    setTypesError(null);
    try {
      let defaults = {};
      try {
        defaults = JSON.parse(tForm.defaultsJson || "{}");
      } catch (e) {
        alert(`Invalid JSON in defaults: ${e.message}`);
        setTBusy(false);
        return;
      }

      const payload = {
        name: tForm.name,
        color: tForm.color,
        icon: tForm.icon,
        defaultsJsonb: JSON.stringify(defaults),
      };

      const created = await api.createType(WORKSPACE_ID, payload);
      setTypes([...(types || []), created]);
      setTForm({ name: "", color: "#3388ff", icon: "Tag", defaultsJson: "{}" });
    } catch (e) {
      const msg = `Create Type failed: ${e.message}`;
      alert(msg);
      setTypesError(msg);
    } finally {
      setTBusy(false);
    }
  }

  async function deleteType(id) {
    if (!confirm("Delete this type?")) return;
    try {
      await api.deleteType(id);
      setTypes(types.filter((t) => t.id !== id));
    } catch (e) {
      const msg = `Delete Type failed: ${e.message}`;
      alert(msg);
      setTypesError(msg);
    }
  }

  async function createEvent() {
    if (!eForm.title.trim()) {
      alert("Event title is required");
      return;
    }
    setEBusy(true);
    setEventsError(null);
    try {
      const payload = {
        title: eForm.title,
        typeId: eForm.typeId || null,
        startUtc: eForm.startUtc,
        endUtc: eForm.endUtc,
        tzid: eForm.tzid,
        notes: eForm.notes || "",
      };

      const created = await api.createScheduledEvent(CALENDAR_ID, payload);
      setEvts([created, ...evts]);
      // Reset form
      setEForm({
        title: "New Event",
        typeId: "",
        startUtc: iso(new Date()),
        endUtc: iso(new Date(Date.now() + 60 * 60 * 1000)),
        tzid: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notes: "",
      });
    } catch (e) {
      const msg = `Create Event failed: ${e.message}`;
      alert(msg);
      setEventsError(msg);
    } finally {
      setEBusy(false);
    }
  }

  async function deleteEvent(id) {
    if (!confirm("Delete this event?")) return;
    try {
      await api.deleteScheduledEvent(id);
      setEvts(evts.filter((ev) => ev.id !== id));
    } catch (e) {
      const msg = `Delete Event failed: ${e.message}`;
      alert(msg);
      setEventsError(msg);
    }
  }

  async function reloadTypes() {
    setTypesError(null);
    try {
      const loadedTypes = await api.getTypes(WORKSPACE_ID);
      setTypes(Array.isArray(loadedTypes) ? loadedTypes : []);
    } catch (e) {
      setTypesError(e.message);
    }
  }

  async function reloadEvents() {
    setEventsError(null);
    try {
      const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthTo = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const loadedEvts = await api.getScheduledEvents(CALENDAR_ID, {
        from: iso(monthFrom),
        to: iso(monthTo),
      });
      setEvts(Array.isArray(loadedEvts) ? loadedEvts : []);
    } catch (e) {
      setEventsError(e.message);
    }
  }

  return (
    <div className="p-4 grid gap-6 md:grid-cols-2">
      <section className="rounded-xl p-4 border bg-white">
        <h2 className="text-lg font-semibold mb-2">Backend Health</h2>
        <pre className="text-xs bg-black/5 p-2 rounded overflow-auto max-h-32">
          {health ? JSON.stringify(health, null, 2) : healthErr || "Checking…"}
        </pre>
        {healthErr && (
          <div className="mt-2 text-xs text-red-600">⚠️ Backend offline</div>
        )}
      </section>

      <section className="rounded-xl p-4 border bg-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Event Types</h2>
          <button
            onClick={reloadTypes}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            🔄 Reload
          </button>
        </div>
        {typesError && (
          <div className="mb-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            Error: {typesError}
          </div>
        )}
        <div className="grid gap-2">
          <input
            className="px-2 py-1 border rounded text-sm"
            value={tForm.name}
            onChange={(e) => setTForm((s) => ({ ...s, name: e.target.value }))}
            placeholder="Name"
          />
          <input
            className="px-2 py-1 border rounded text-sm"
            value={tForm.color}
            onChange={(e) => setTForm((s) => ({ ...s, color: e.target.value }))}
            placeholder="#RRGGBB"
            type="color"
          />
          <input
            className="px-2 py-1 border rounded text-sm"
            value={tForm.icon}
            onChange={(e) => setTForm((s) => ({ ...s, icon: e.target.value }))}
            placeholder="Icon name"
          />
          <textarea
            className="px-2 py-1 border rounded text-sm font-mono"
            value={tForm.defaultsJson}
            onChange={(e) =>
              setTForm((s) => ({ ...s, defaultsJson: e.target.value }))
            }
            rows={3}
            placeholder='{"durationMinutes":60}'
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            disabled={tBusy}
            onClick={createType}
          >
            {tBusy ? "Creating..." : "Create Type"}
          </button>
        </div>
        <ul className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {types.length === 0 ? (
            <li className="text-sm text-gray-500 italic">No types yet</li>
          ) : (
            types.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between border p-2 rounded text-sm"
              >
                <span>
                  <b>{t.name}</b>{" "}
                  <small style={{ opacity: 0.7 }}>{t.id}</small>
                </span>
                <button
                  onClick={() => deleteType(t.id)}
                  className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl p-4 border bg-white md:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Scheduled Events</h2>
          <button
            onClick={reloadEvents}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            🔄 Reload
          </button>
        </div>
        {eventsError && (
          <div className="mb-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            Error: {eventsError}
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-2">
          <input
            className="px-2 py-1 border rounded text-sm"
            value={eForm.title}
            onChange={(e) =>
              setEForm((s) => ({ ...s, title: e.target.value }))
            }
            placeholder="Title"
          />
          <select
            className="px-2 py-1 border rounded text-sm"
            value={eForm.typeId}
            onChange={(e) =>
              setEForm((s) => ({ ...s, typeId: e.target.value }))
            }
          >
            <option value="">(no type)</option>
            {(types || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            className="px-2 py-1 border rounded text-sm"
            type="datetime-local"
            value={eForm.startUtc.slice(0, 16)}
            onChange={(e) =>
              setEForm((s) => ({
                ...s,
                startUtc: new Date(e.target.value).toISOString(),
              }))
            }
          />
          <input
            className="px-2 py-1 border rounded text-sm"
            type="datetime-local"
            value={eForm.endUtc.slice(0, 16)}
            onChange={(e) =>
              setEForm((s) => ({
                ...s,
                endUtc: new Date(e.target.value).toISOString(),
              }))
            }
          />
          <input
            className="px-2 py-1 border rounded text-sm"
            value={eForm.tzid}
            onChange={(e) =>
              setEForm((s) => ({ ...s, tzid: e.target.value }))
            }
            placeholder="Timezone"
          />
          <input
            className="px-2 py-1 border rounded text-sm"
            value={eForm.notes}
            onChange={(e) =>
              setEForm((s) => ({ ...s, notes: e.target.value }))
            }
            placeholder="Notes"
          />
        </div>
        <button
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          disabled={eBusy}
          onClick={createEvent}
        >
          {eBusy ? "Creating..." : "Create Event"}
        </button>

        <ul className="mt-3 space-y-2 max-h-96 overflow-y-auto">
          {evts.length === 0 ? (
            <li className="text-sm text-gray-500 italic">No events yet</li>
          ) : (
            evts.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between border p-2 rounded text-sm"
              >
                <div>
                  <b>{ev.title}</b>{" "}
                  <small style={{ opacity: 0.7 }}>{ev.id}</small>
                  <div className="text-xs text-gray-600 mt-1">
                    {new Date(ev.startUtc).toLocaleString()} →{" "}
                    {new Date(ev.endUtc).toLocaleString()} ({ev.tzid || "UTC"})
                  </div>
                </div>
                <button
                  onClick={() => deleteEvent(ev.id)}
                  className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

