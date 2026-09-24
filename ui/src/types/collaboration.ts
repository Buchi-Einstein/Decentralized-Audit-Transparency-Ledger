export interface UserPresence {
  userId: string;
  username: string;
  avatarUrl?: string;
  color: string;
  currentView: string;
  cursor?: {
    x: number;
    y: number;
    targetId?: string;
  };
  selection?: {
    startLine: number;
    endLine: number;
  };
  lastSeen: number;
  isIdle: boolean;
}

export type CollaborationActionType =
  | "PRESENCE_JOIN"
  | "PRESENCE_LEAVE"
  | "PRESENCE_HEARTBEAT"
  | "CURSOR_MOVE"
  | "CONCURRENT_EDIT"
  | "COMMENT_CREATE"
  | "COMMENT_RESOLVE"
  | "VIEW_SYNC";

export interface CollaborationMessage<T = unknown> {
  id: string;
  type: CollaborationActionType;
  senderId: string;
  timestamp: number;
  payload: T;
}

export interface CollaborativeComment {
  id: string;
  auditEventId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: number;
  resolved: boolean;
  resolvedBy?: string;
  replies?: CollaborativeComment[];
}

export interface SharedViewState {
  activeViewId: string;
  selectedEventId?: string;
  searchFilter: string;
  pageIndex: number;
  timeRange: {
    start: number;
    end: number;
  };
  syncedBy: string;
}
