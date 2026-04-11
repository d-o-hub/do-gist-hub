/**
 * Application-wide TypeScript types
 */

export * from './api';

// Re-export database types from db service
export type { 
  GistRecord, 
  GistFile as GistFileRecord, 
  GistOwner as GistOwnerRecord,
  PendingWrite, 
  MetadataRecord 
} from '../services/db';
