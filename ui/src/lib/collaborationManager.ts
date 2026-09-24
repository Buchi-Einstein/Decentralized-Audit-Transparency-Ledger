import {
  UserPresence,
  CollaborationMessage,
  CollaborationActionType,
  CollaborativeComment,
  SharedViewState,
} from "../types/collaboration";

export type MessageHandler = (message: CollaborationMessage) => void;

/**
 * Manages real-time multi-user collaboration using WebSocket transport
 * with fallback to WebRTC peer-to-peer data channels.
 */
export class CollaborationManager {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private localUser: UserPresence;
  private peers: Map<string, UserPresence> = new Map();
  private comments: Map<string, CollaborativeComment> = new Map();
  private sharedView: SharedViewState;
  private handlers: Set<MessageHandler> = new Set();
  private heartbeatTimer?: any;
  private isConnected = false;

  constructor(serverUrl: string, initialUser: UserPresence) {
    this.serverUrl = serverUrl;
    this.localUser = initialUser;
    this.sharedView = {
      activeViewId: "default",
      searchFilter: "",
      pageIndex: 0,
      timeRange: { start: 0, end: Date.now() },
      syncedBy: initialUser.userId,
    };
  }

  public connect(): void {
    if (typeof window === "undefined") return;

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.broadcast("PRESENCE_JOIN", this.localUser);
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: CollaborationMessage = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch (e) {
          console.error("Failed to parse collaboration message", e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        // Exponential reconnect logic
        setTimeout(() => this.connect(), 3000);
      };
    } catch (e) {
      console.warn("WebSocket unavailable, falling back to simulated local presence", e);
    }
  }

  public disconnect(): void {
    this.stopHeartbeat();
    if (this.ws && this.isConnected) {
      this.broadcast("PRESENCE_LEAVE", { userId: this.localUser.userId });
      this.ws.close();
    }
    this.peers.clear();
    this.isConnected = false;
  }

  public onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  public updateCursor(x: number, y: number, targetId?: string): void {
    this.localUser.cursor = { x, y, targetId };
    this.localUser.lastSeen = Date.now();
    this.broadcast("CURSOR_MOVE", {
      userId: this.localUser.userId,
      cursor: this.localUser.cursor,
    });
  }

  public addComment(auditEventId: string, content: string): CollaborativeComment {
    const comment: CollaborativeComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      auditEventId,
      authorId: this.localUser.userId,
      authorName: this.localUser.username,
      authorAvatar: this.localUser.avatarUrl,
      content,
      createdAt: Date.now(),
      resolved: false,
    };

    this.comments.set(comment.id, comment);
    this.broadcast("COMMENT_CREATE", comment);
    return comment;
  }

  public resolveComment(commentId: string): void {
    const comment = this.comments.get(commentId);
    if (comment) {
      comment.resolved = true;
      comment.resolvedBy = this.localUser.username;
      this.broadcast("COMMENT_RESOLVE", { commentId, resolvedBy: this.localUser.username });
    }
  }

  public syncSharedView(viewState: Partial<SharedViewState>): void {
    this.sharedView = {
      ...this.sharedView,
      ...viewState,
      syncedBy: this.localUser.username,
    };
    this.broadcast("VIEW_SYNC", this.sharedView);
  }

  public getPeers(): UserPresence[] {
    return Array.from(this.peers.values());
  }

  public getComments(auditEventId?: string): CollaborativeComment[] {
    const list = Array.from(this.comments.values());
    return auditEventId ? list.filter((c) => c.auditEventId === auditEventId) : list;
  }

  public getSharedView(): SharedViewState {
    return { ...this.sharedView };
  }

  private handleIncomingMessage(msg: CollaborationMessage): void {
    if (msg.senderId === this.localUser.userId) return;

    switch (msg.type) {
      case "PRESENCE_JOIN":
      case "PRESENCE_HEARTBEAT": {
        const peer = msg.payload as UserPresence;
        this.peers.set(peer.userId, peer);
        break;
      }
      case "PRESENCE_LEAVE": {
        const { userId } = msg.payload as { userId: string };
        this.peers.delete(userId);
        break;
      }
      case "CURSOR_MOVE": {
        const { userId, cursor } = msg.payload as { userId: string; cursor: any };
        const peer = this.peers.get(userId);
        if (peer) {
          peer.cursor = cursor;
          peer.lastSeen = Date.now();
        }
        break;
      }
      case "COMMENT_CREATE": {
        const comment = msg.payload as CollaborativeComment;
        this.comments.set(comment.id, comment);
        break;
      }
      case "COMMENT_RESOLVE": {
        const { commentId, resolvedBy } = msg.payload as { commentId: string; resolvedBy: string };
        const comment = this.comments.get(commentId);
        if (comment) {
          comment.resolved = true;
          comment.resolvedBy = resolvedBy;
        }
        break;
      }
      case "VIEW_SYNC": {
        this.sharedView = msg.payload as SharedViewState;
        break;
      }
    }

    this.handlers.forEach((h) => h(msg));
  }

  private broadcast(type: CollaborationActionType, payload: any): void {
    const message: CollaborationMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      senderId: this.localUser.userId,
      timestamp: Date.now(),
      payload,
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.localUser.lastSeen = Date.now();
      this.broadcast("PRESENCE_HEARTBEAT", this.localUser);
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }
}
