/**
 * Regression test for /create route
 *
 * To run this test, install testing dependencies:
 * npm install --save-dev @testing-library/react @testing-library/jest-dom vitest jsdom
 *
 * Then add to package.json:
 * "scripts": {
 *   "test": "vitest"
 * }
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

const typesState = {
  items: [],
  loading: false,
  error: null,
  loadAll: vi.fn(() => Promise.resolve()),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  counts: () => ({}),
};

const tasksState = {
  loadAll: vi.fn(() => Promise.resolve()),
  loadSubtasks: vi.fn(() => Promise.resolve()),
  tasksById: {},
  subtasksEntities: {},
  tasks: () => [],
  tasksForType: () => [],
  subtasksForTask: () => [],
  createTask: vi.fn(),
  updateTask: vi.fn(),
  removeTask: vi.fn(),
  addSubtask: vi.fn(),
  updateSubtask: vi.fn(),
  removeSubtask: vi.fn(),
  loading: false,
  error: null,
};

vi.mock('../debug/components/DebugNav', () => ({
  default: () => <div data-testid='debug-nav' />,
}));

// Mock the DndContext and other complex dependencies
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => <div data-testid='dnd-context'>{children}</div>,
  DragOverlay: ({ children }) => <div>{children}</div>,
  PointerSensor: class PointerSensor {},
  useSensor: () => () => {},
  useSensors: () => [],
  KeyboardSensor: function KeyboardSensor() {},
  MouseSensor: function MouseSensor() {},
  TouchSensor: function TouchSensor() {},
  useDndMonitor: () => {},
}));

vi.mock('../state/typesStore.js', () => {
  const useTypesStore = (selector) => {
    if (typeof selector === 'function') {
      return selector(typesState);
    }
    return typesState;
  };
  return {
    useTypesStore,
    useTypesOrdered: () => [],
  };
});

vi.mock('../state/tasksStore.js', () => {
  const useTasksStore = (selector) => {
    if (typeof selector === 'function') {
      return selector(tasksState);
    }
    return tasksState;
  };
  return { useTasksStore };
});

vi.mock('@dnd-kit/modifiers', () => ({
  restrictToWindowEdges: () => null,
}));

vi.mock('../state/eventsStoreWithBackend', () => {
  const snapshot = { byId: new Map(), byDate: new Map() };
  return {
    eventsStore: {
      subscribe: (listener) => {
        if (typeof listener === 'function') listener(snapshot);
        return () => {};
      },
      get: () => snapshot,
      getStatus: () => ({ loading: false, error: null, lastLoadedAt: 0 }),
      loadAll: vi.fn(),
      initialize: vi.fn(),
    },
  };
});

describe('Create Route', () => {
  it('renders Create page at /create', () => {
    render(
      <MemoryRouter initialEntries={['/create']}>
        <App />
      </MemoryRouter>
    );

    // Check for the Create page root element
    expect(screen.getByTestId('create-page-root')).toBeInTheDocument();
  });

  it('does not show diagnostics at /create', () => {
    // Set env flag to false
    const originalEnv = import.meta.env.VITE_SHOW_DIAGNOSTICS;
    import.meta.env.VITE_SHOW_DIAGNOSTICS = 'false';

    render(
      <MemoryRouter initialEntries={['/create']}>
        <App />
      </MemoryRouter>
    );

    // Diagnostics should not be present
    expect(screen.queryByText('Backend Health')).not.toBeInTheDocument();

    // Restore env
    import.meta.env.VITE_SHOW_DIAGNOSTICS = originalEnv;
  });

  it('renders diagnostics at /admin/diagnostics when flag is enabled', () => {
    // Set env flag to true
    const originalEnv = import.meta.env.VITE_SHOW_DIAGNOSTICS;
    import.meta.env.VITE_SHOW_DIAGNOSTICS = 'true';

    render(
      <MemoryRouter initialEntries={['/admin/diagnostics']}>
        <App />
      </MemoryRouter>
    );

    // Diagnostics should be present
    expect(screen.getByText('Backend Health')).toBeInTheDocument();

    // Restore env
    import.meta.env.VITE_SHOW_DIAGNOSTICS = originalEnv;
  });
});