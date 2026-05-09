/**
 * Application-wide TypeScript types
 */

// Re-export database types from db service
export type {
  GistFile as GistFileRecord,
  GistOwner as GistOwnerRecord,
  GistRecord,
  MetadataRecord,
  PendingWrite,
} from '../services/db';
export * from './api';
