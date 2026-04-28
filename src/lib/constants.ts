/**
 * Shared application constants
 * These constants are used by both server and client code
 */

// Default password for new employees
// Can be overridden via environment variable DEFAULT_INITIAL_PASSWORD
export const DEFAULT_PASSWORD = process.env.DEFAULT_INITIAL_PASSWORD || 'ChangeMe123!';