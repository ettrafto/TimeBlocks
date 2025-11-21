import React, { useCallback, useState } from "react";
import { fetchAllUsers } from "../auth/api";

const BoolBadge = ({ value }) => {
  if (value === null || value === undefined) {
    return <span className="text-xs text-gray-500">Unknown</span>;
  }
  return (
    <span className={`text-sm font-semibold ${value ? "text-green-600" : "text-red-600"}`}>
      {value ? "✓" : "✗"}
    </span>
  );
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export default function UsersMonitorPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRefresh = useCallback(async () => {
    console.info("[UsersMonitor] Fetching all users...");
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAllUsers();
      const list = Array.isArray(result) ? result : [];
      console.info("[UsersMonitor] Received %d users.", list.length);
      setUsers(list);
    } catch (err) {
      console.error("[UsersMonitor] Failed to fetch users", err);
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="bg-white border rounded-xl shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Users Monitor Panel</h3>
          <p className="text-xs text-gray-500">
            Inspect backend users in dev profile. Data is fetched directly from /api/dev/users.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh User List"}
        </button>
      </div>
      {error && <div className="text-sm text-red-600 mb-3">Error: {error}</div>}
      {users.length === 0 ? (
        <div className="text-sm text-gray-600">No users loaded. Click refresh to fetch the latest data.</div>
      ) : (
        <div className="overflow-x-auto bg-gray-50 border rounded-md p-3">
          <table className="min-w-full text-sm text-left">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 border-b border-gray-200">Email</th>
                <th className="px-3 py-2 border-b border-gray-200">Name</th>
                <th className="px-3 py-2 border-b border-gray-200">Role</th>
                <th className="px-3 py-2 border-b border-gray-200">Verified</th>
                <th className="px-3 py-2 border-b border-gray-200">Active</th>
                <th className="px-3 py-2 border-b border-gray-200">Authenticated</th>
                <th className="px-3 py-2 border-b border-gray-200">Recent Login</th>
                <th className="px-3 py-2 border-b border-gray-200">Created</th>
                <th className="px-3 py-2 border-b border-gray-200">Last Login</th>
                <th className="px-3 py-2 border-b border-gray-200">Updated</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="px-3 py-2 font-mono text-xs">{user.email}</td>
                  <td className="px-3 py-2">{user.name || "—"}</td>
                  <td className="px-3 py-2">{user.role || "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <BoolBadge value={user.verified} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <BoolBadge value={user.active} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <BoolBadge value={user.authenticated} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <BoolBadge value={user.loggedInRecently} />
                  </td>
                  <td className="px-3 py-2">{formatDate(user.createdAt)}</td>
                  <td className="px-3 py-2">{formatDate(user.lastLoginAt)}</td>
                  <td className="px-3 py-2">{formatDate(user.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


