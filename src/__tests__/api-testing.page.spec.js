import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ApiTestingPage from '../pages/api-testing.jsx';

// Mock stores
vi.mock('../state/typesStore.js', () => ({
  useTypesStore: () => ({
    items: [],
    loading: false,
    error: null,
    loadAll: () => {},
    create: () => {},
    update: () => {},
    remove: () => {},
    counts: () => ({}),
  }),
  useTypesOrdered: () => [],
}));

vi.mock('../state/tasksStore.js', () => ({
  useTasksStore: () => ({
    loadAll: () => {},
    tasks: () => [],
    tasksForType: () => [],
    subtasksForTask: () => [],
    createTask: () => {},
    updateTask: () => {},
    removeTask: () => {},
    addSubtask: () => {},
    updateSubtask: () => {},
    removeSubtask: () => {},
    loading: false,
    error: null,
  }),
}));

vi.mock('../state/eventsStoreWithBackend.js', () => ({
  eventsStore: {
    subscribe: (fn) => { fn({ byId: new Map(), byDate: new Map() }); return () => {}; },
    get: () => ({ byId: new Map(), byDate: new Map() }),
    getStatus: () => ({ loading: false, error: null, lastLoadedAt: 0 }),
    loadAll: () => {},
  },
}));

describe('API Testing Page', () => {
  it('renders Manage Types with empty state', () => {
    render(<ApiTestingPage />);
    expect(screen.getByText('Manage Types')).toBeInTheDocument();
    expect(screen.getByText('No Types yet')).toBeInTheDocument();
  });

  it('renders Tasks section with empty state', () => {
    render(<ApiTestingPage />);
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('No Tasks')).toBeInTheDocument();
  });

  it('renders Events section with empty state', () => {
    render(<ApiTestingPage />);
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('No Events')).toBeInTheDocument();
  });
});


