import React from "react";
import { UserPresence, SharedViewState } from "../types/collaboration";

interface Props {
  currentUser: UserPresence;
  peers: UserPresence[];
  sharedView: SharedViewState;
  onToggleShareView?: () => void;
}

export const CollaborationPresenceBar: React.FC<Props> = ({
  currentUser,
  peers,
  sharedView,
  onToggleShareView,
}) => {
  const allUsers = [currentUser, ...peers];

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-sm text-slate-200">
      <div className="flex items-center space-x-3">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-medium text-xs uppercase tracking-wider text-slate-400">
          Live Collaboration ({allUsers.length} Active)
        </span>

        {/* User Avatar Stack */}
        <div className="flex -space-x-2 overflow-hidden items-center ml-2">
          {allUsers.map((user) => (
            <div
              key={user.userId}
              title={`${user.username} (${user.currentView})`}
              className="inline-block h-7 w-7 rounded-full ring-2 ring-slate-900 flex items-center justify-center font-bold text-xs uppercase shadow-sm cursor-pointer transition-transform hover:scale-110"
              style={{ backgroundColor: user.color, color: "#fff" }}
            >
              {user.username.slice(0, 2)}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {sharedView.syncedBy && (
          <div className="text-xs text-slate-400 flex items-center space-x-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            <span>Shared View synced by <strong className="text-indigo-300">{sharedView.syncedBy}</strong></span>
          </div>
        )}

        {onToggleShareView && (
          <button
            onClick={onToggleShareView}
            className="px-2.5 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Broadcast My View
          </button>
        )}
      </div>
    </div>
  );
};
