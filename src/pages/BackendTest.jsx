import { useState } from "react";
import { eventTypesApi, libraryEventsApi, scheduledEventsApi, healthApi } from "../services/api";
import { fullSystemCleanup, reconcileBackendEvents } from "../services/reconcile";

export default function BackendTest() {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState("");
  const [reconcileResult, setReconcileResult] = useState(null);
  const [isReconciling, setIsReconciling] = useState(false);

  // Test result component
  const TestResult = ({ result }) => (
    <div className={`p-3 rounded mb-2 ${result.passed ? 'bg-green-100 border-l-4 border-green-500' : 'bg-red-100 border-l-4 border-red-500'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{result.passed ? '✅' : '❌'}</span>
          <div>
            <div className="font-semibold">{result.name}</div>
            {result.message && <div className="text-sm text-gray-600">{result.message}</div>}
          </div>
        </div>
        <div className="text-sm text-gray-500">{result.duration}ms</div>
      </div>
      {result.error && (
        <pre className="mt-2 p-2 bg-red-50 text-xs overflow-auto">{result.error}</pre>
      )}
      {result.data && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-blue-600">Show data</summary>
          <pre className="mt-2 p-2 bg-gray-50 text-xs overflow-auto">{JSON.stringify(result.data, null, 2)}</pre>
        </details>
      )}
    </div>
  );

  // Utility to add test result
  const addResult = (name, passed, message = "", error = null, data = null, duration = 0) => {
    setTestResults(prev => [...prev, { name, passed, message, error, data, duration, timestamp: Date.now() }]);
  };

  // Utility to run a single test
  const runTest = async (name, testFn) => {
    setCurrentTest(name);
    const start = Date.now();
    try {
      const result = await testFn();
      const duration = Date.now() - start;
      addResult(name, true, result.message || "Passed", null, result.data, duration);
      return { passed: true, data: result.data };
    } catch (error) {
      const duration = Date.now() - start;
      addResult(name, false, error.message, error.stack, null, duration);
      return { passed: false, error };
    }
  };

  // ========================================
  // TEST SUITE 1: Health & Connectivity
  // ========================================
  const testHealthCheck = async () => {
    const data = await healthApi.check();
    if (!data.ok) throw new Error("Health check returned ok: false");
    return { message: "Backend is healthy", data };
  };

  // ========================================
  // TEST SUITE 2: Event Types CRUD
  // ========================================
  const testCreateEventType = async () => {
    const testType = {
      name: "Test Type " + Date.now(),
      color: "bg-purple-500",
      icon: "test",
    };
    const created = await eventTypesApi.create(testType);
    if (!created.id) throw new Error("Created type missing ID");
    return { message: `Created type: ${created.id}`, data: created };
  };

  const testGetEventTypes = async () => {
    const types = await eventTypesApi.getAll();
    if (!Array.isArray(types)) throw new Error("Expected array of types");
    return { message: `Found ${types.length} types`, data: types };
  };

  const testUpdateEventType = async () => {
    // First create a type to update
    const created = await eventTypesApi.create({
      name: "Type to Update " + Date.now(),
      color: "bg-blue-500",
    });
    
    // Update it
    const updated = await eventTypesApi.update(created.id, {
      ...created,
      name: "Updated Type " + Date.now(),
      color: "bg-red-500",
    });
    
    if (updated.name === created.name) throw new Error("Type name not updated");
    return { message: `Updated type: ${updated.id}`, data: updated };
  };

  const testDeleteEventType = async () => {
    // Create a type to delete
    const created = await eventTypesApi.create({
      name: "Type to Delete " + Date.now(),
      color: "bg-gray-500",
    });
    
    // Delete it
    await eventTypesApi.delete(created.id);
    
    // Verify it's gone
    const types = await eventTypesApi.getAll();
    if (types.find(t => t.id === created.id)) {
      throw new Error("Type still exists after deletion");
    }
    
    return { message: `Deleted type: ${created.id}`, data: { deletedId: created.id } };
  };

  // ========================================
  // TEST SUITE 3: Library Events CRUD
  // ========================================
  const testCreateLibraryEvent = async () => {
    const testEvent = {
      name: "Test Library Event " + Date.now(),
      defaultDurationMin: 45,
      color: "bg-green-500",
      notes: "Test notes",
    };
    const created = await libraryEventsApi.create(testEvent);
    if (!created.id) throw new Error("Created library event missing ID");
    return { message: `Created library event: ${created.id}`, data: created };
  };

  const testGetLibraryEvents = async () => {
    const events = await libraryEventsApi.getAll();
    if (!Array.isArray(events)) throw new Error("Expected array of library events");
    return { message: `Found ${events.length} library events`, data: events };
  };

  const testUpdateLibraryEvent = async () => {
    const created = await libraryEventsApi.create({
      name: "Library Event to Update " + Date.now(),
      defaultDurationMin: 30,
    });
    
    const updated = await libraryEventsApi.update(created.id, {
      ...created,
      name: "Updated Library Event " + Date.now(),
      defaultDurationMin: 60,
    });
    
    if (updated.defaultDurationMin !== 60) throw new Error("Duration not updated");
    return { message: `Updated library event: ${updated.id}`, data: updated };
  };

  const testDeleteLibraryEvent = async () => {
    const created = await libraryEventsApi.create({
      name: "Library Event to Delete " + Date.now(),
      defaultDurationMin: 15,
    });
    
    await libraryEventsApi.delete(created.id);
    
    const events = await libraryEventsApi.getAll();
    if (events.find(e => e.id === created.id)) {
      throw new Error("Library event still exists after deletion");
    }
    
    return { message: `Deleted library event: ${created.id}`, data: { deletedId: created.id } };
  };

  // ========================================
  // TEST SUITE 4: Scheduled Events CRUD
  // ========================================
  const testCreateScheduledEvent = async () => {
    const now = new Date();
    const testEvent = {
      title: "Test Scheduled Event " + Date.now(),
      tzid: "America/Toronto",
      startUtc: now.toISOString(),
      endUtc: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour later
      isAllDay: 0,
      createdBy: "u_test",
    };
    const created = await scheduledEventsApi.create(testEvent);
    if (!created.id) throw new Error("Created scheduled event missing ID");
    return { message: `Created scheduled event: ${created.id}`, data: created };
  };

  const testGetScheduledEvents = async () => {
    const from = new Date(2025, 9, 1).toISOString(); // Oct 1, 2025
    const to = new Date(2025, 9, 31).toISOString(); // Oct 31, 2025
    const events = await scheduledEventsApi.getForRange(from, to);
    if (!Array.isArray(events)) throw new Error("Expected array of events");
    return { message: `Found ${events.length} scheduled events`, data: events };
  };

  const testUpdateScheduledEvent = async () => {
    const now = new Date();
    const created = await scheduledEventsApi.create({
      title: "Event to Update " + Date.now(),
      tzid: "America/Toronto",
      startUtc: now.toISOString(),
      endUtc: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      createdBy: "u_test",
    });
    
    const newStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later
    const updated = await scheduledEventsApi.update(created.id, {
      ...created,
      title: "Updated Event " + Date.now(),
      startUtc: newStart.toISOString(),
    });
    
    if (updated.title === created.title) throw new Error("Event title not updated");
    return { message: `Updated scheduled event: ${updated.id}`, data: updated };
  };

  const testDeleteScheduledEvent = async () => {
    const now = new Date();
    const created = await scheduledEventsApi.create({
      title: "Event to Delete " + Date.now(),
      tzid: "America/Toronto",
      startUtc: now.toISOString(),
      endUtc: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      createdBy: "u_test",
    });
    
    await scheduledEventsApi.delete(created.id);
    
    return { message: `Deleted scheduled event: ${created.id}`, data: { deletedId: created.id } };
  };

  // ========================================
  // TEST SUITE 5: Integration Tests
  // ========================================
  const testFullWorkflow = async () => {
    // 1. Create a type
    const type = await eventTypesApi.create({
      name: "Workflow Type " + Date.now(),
      color: "bg-indigo-500",
    });
    
    // 2. Create a library event with that type
    const libEvent = await libraryEventsApi.create({
      name: "Workflow Template",
      defaultDurationMin: 30,
      typeId: type.id,
    });
    
    // 3. Create a scheduled event based on the library event
    const now = new Date();
    const scheduledEvent = await scheduledEventsApi.create({
      title: "Workflow Scheduled Event",
      libraryEventId: libEvent.id,
      typeId: type.id,
      tzid: "America/Toronto",
      startUtc: now.toISOString(),
      endUtc: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      createdBy: "u_test",
    });
    
    // 4. Verify all were created
    if (!type.id || !libEvent.id || !scheduledEvent.id) {
      throw new Error("Some entities missing IDs");
    }
    
    // 5. Cleanup
    await scheduledEventsApi.delete(scheduledEvent.id);
    await libraryEventsApi.delete(libEvent.id);
    await eventTypesApi.delete(type.id);
    
    return {
      message: "Full workflow: Create type → template → event → cleanup",
      data: { type, libEvent, scheduledEvent }
    };
  };

  // ========================================
  // RUN ALL TESTS
  // ========================================
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      // Suite 1: Health
      await runTest("1.1 Health Check", testHealthCheck);
      
      // Suite 2: Event Types
      await runTest("2.1 Create Event Type", testCreateEventType);
      await runTest("2.2 Get Event Types", testGetEventTypes);
      await runTest("2.3 Update Event Type", testUpdateEventType);
      await runTest("2.4 Delete Event Type", testDeleteEventType);
      
      // Suite 3: Library Events
      await runTest("3.1 Create Library Event", testCreateLibraryEvent);
      await runTest("3.2 Get Library Events", testGetLibraryEvents);
      await runTest("3.3 Update Library Event", testUpdateLibraryEvent);
      await runTest("3.4 Delete Library Event", testDeleteLibraryEvent);
      
      // Suite 4: Scheduled Events
      await runTest("4.1 Create Scheduled Event", testCreateScheduledEvent);
      await runTest("4.2 Get Scheduled Events", testGetScheduledEvents);
      await runTest("4.3 Update Scheduled Event", testUpdateScheduledEvent);
      await runTest("4.4 Delete Scheduled Event", testDeleteScheduledEvent);
      
      // Suite 5: Integration
      await runTest("5.1 Full Workflow Integration", testFullWorkflow);
      
      setCurrentTest("All tests complete! 🎉");
    } catch (error) {
      console.error("Test suite error:", error);
    } finally {
      setIsRunning(false);
    }
  };

  // Calculate summary
  const passedTests = testResults.filter(r => r.passed).length;
  const failedTests = testResults.filter(r => !r.passed).length;
  const totalTests = testResults.length;

  // Reconciliation handler
  const handleReconcile = async () => {
    setIsReconciling(true);
    setReconcileResult(null);
    try {
      const result = await fullSystemCleanup();
      setReconcileResult(result);
      console.log('Reconciliation result:', result);
    } catch (error) {
      setReconcileResult({ success: false, error: error.message });
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🧪 Backend Integration Tests</h1>
          <p className="text-gray-600">Comprehensive test suite for TimeBlocks Backend API</p>
          
          {/* Summary Stats */}
          {totalTests > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-2xl font-bold text-blue-600">{totalTests}</div>
                <div className="text-sm text-gray-600">Total Tests</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-2xl font-bold text-green-600">{passedTests}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="bg-red-50 p-4 rounded">
                <div className="text-2xl font-bold text-red-600">{failedTests}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="space-y-3">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className={`w-full py-3 px-6 rounded font-semibold text-white transition-colors ${
                isRunning 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isRunning ? `Running: ${currentTest}...` : '▶ Run All Tests'}
            </button>

            <button
              onClick={handleReconcile}
              disabled={isReconciling}
              className={`w-full py-3 px-6 rounded font-semibold text-white transition-colors ${
                isReconciling 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
              title="Remove invalid/ghost events from backend and clear draft states"
            >
              {isReconciling ? '🔄 Reconciling...' : '🧹 Clean & Reconcile Backend'}
            </button>

            <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded text-sm">
              <p className="font-medium text-orange-800 mb-1">What does Clean & Reconcile do?</p>
              <ul className="text-orange-700 space-y-1 text-xs">
                <li>• Scans backend for invalid/ghost events</li>
                <li>• Removes events with missing IDs, invalid times, or ghost flags</li>
                <li>• Clears stuck draft states from localStorage</li>
                <li>• Returns clean event list</li>
              </ul>
            </div>
          </div>
          
          {isRunning && (
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${(totalTests / 14) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Reconciliation Result */}
          {reconcileResult && (
            <div className={`mt-4 p-4 rounded ${reconcileResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold mb-2">{reconcileResult.success ? '✅ Reconciliation Complete' : '❌ Reconciliation Failed'}</h3>
              {reconcileResult.success && (
                <div className="text-sm space-y-1">
                  <p>Total Events: {reconcileResult.totalEvents}</p>
                  {reconcileResult.deletedCount > 0 && (
                    <p className="text-orange-600 font-medium">🗑️ Deleted {reconcileResult.deletedCount} invalid events</p>
                  )}
                  {reconcileResult.deletedCount === 0 && (
                    <p className="text-green-600">No invalid events found - backend is clean!</p>
                  )}
                </div>
              )}
              {reconcileResult.error && (
                <p className="text-sm text-red-600">{reconcileResult.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Test Results</h2>
            <div className="space-y-2">
              {testResults.map((result, idx) => (
                <TestResult key={idx} result={result} />
              ))}
            </div>
          </div>
        )}

        {/* Test Suites Info */}
        {testResults.length === 0 && !isRunning && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Test Suites</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold">Suite 1: Health & Connectivity</h3>
                <p className="text-sm text-gray-600">1 test - Verifies backend is running</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold">Suite 2: Event Types CRUD</h3>
                <p className="text-sm text-gray-600">4 tests - Create, Read, Update, Delete types</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold">Suite 3: Library Events CRUD</h3>
                <p className="text-sm text-gray-600">4 tests - Create, Read, Update, Delete templates</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-semibold">Suite 4: Scheduled Events CRUD</h3>
                <p className="text-sm text-gray-600">4 tests - Create, Read, Update, Delete events</p>
              </div>
              <div className="border-l-4 border-indigo-500 pl-4">
                <h3 className="font-semibold">Suite 5: Integration Tests</h3>
                <p className="text-sm text-gray-600">1 test - Full workflow validation</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> Click "Run All Tests" to execute all 14 tests. 
                Each test will create, modify, and clean up test data. 
                Watch the console for detailed logs.
              </p>
            </div>
          </div>
        )}

        {/* Back to App Link */}
        <div className="mt-6 text-center">
          <a 
            href="/" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to TimeBlocks App
          </a>
        </div>
      </div>
    </div>
  );
}
