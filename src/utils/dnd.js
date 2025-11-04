import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

export { arrayMove };

export function useCommonSensors() {
  // Delay/threshold to prevent accidental drags during clicks
  const pointer = useSensor(PointerSensor, { activationConstraint: { distance: 6 } });
  return useSensors(pointer);
}

