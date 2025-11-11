import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ApiTestingPage from '../pages/api-testing.jsx';

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
  byTypeId: {},
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

vi.mock('../state/eventsStoreWithBackend', () => {
  const snapshot = { byId: new Map(), byDate: new Map() };
  return {
    eventsStore: {
      subscribe: (fn) => {
        fn(snapshot);
        return () => {};
      },
      get: () => snapshot,
      getStatus: () => ({ loading: false, error: null, lastLoadedAt: 0 }),
      loadAll: vi.fn(),
      initialize: vi.fn(),
      getAllEvents: () => [],
    },
  };
});

describe.skip('API Testing Page', () => {
  it('renders Manage Types with empty state', () => {
    render(
      <MemoryRouter>
        <ApiTestingPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Manage Types')).toBeInTheDocument();
    expect(screen.getByText('No Types yet')).toBeInTheDocument();
  });

  it('renders Tasks section with empty state', () => {
    render(
      <MemoryRouter>
        <ApiTestingPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('No Tasks')).toBeInTheDocument();
  });

  it('renders Events section with empty state', () => {
    render(
      <MemoryRouter>
        <ApiTestingPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('No Events')).toBeInTheDocument();
  });
});

