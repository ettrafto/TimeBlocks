// src/config/policies.js

/**
 * Application behavior policies
 * Configure how the app handles conflicts and user actions
 */

// Move policy: how to handle cross-day/cross-time moves
export const MOVE_POLICY = 'confirm-then-commit';    // 'always' | 'confirm-then-commit'

// Resize policy: how to handle resize operations
export const RESIZE_POLICY = 'confirm-then-commit'; // 'always' | 'confirm-then-commit'

// Conflict behavior: what to do when overlaps are detected
export const CONFLICT_BEHAVIOR = 'inform'; // 'allow' | 'inform' | 'auto-shift' (future)

/**
 * Policy Descriptions:
 * 
 * MOVE_POLICY:
 * - 'always': Moves commit immediately, conflicts shown informationally (if at all)
 * - 'confirm-then-commit': Shows modal before committing (blocks move)
 * 
 * RESIZE_POLICY:
 * - 'always': Resize commits immediately
 * - 'confirm-then-commit': Shows modal before committing
 * 
 * CONFLICT_BEHAVIOR:
 * - 'allow': Allow all overlaps without warning
 * - 'inform': Show informational modal after action (doesn't block)
 * - 'auto-shift': Automatically adjust times to avoid conflicts (future)
 */

