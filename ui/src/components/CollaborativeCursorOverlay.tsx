import React from "react";
import { UserPresence } from "../types/collaboration";

interface Props {
  peers: UserPresence[];
}

export const CollaborativeCursorOverlay: React.FC<Props> = ({ peers }) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {peers
        .filter((peer) => peer.cursor && typeof peer.cursor.x === "number")
        .map((peer) => (
          <div
            key={peer.userId}
            className="absolute transition-all duration-75 ease-out"
            style={{
              left: `${peer.cursor!.x}px`,
              top: `${peer.cursor!.y}px`,
            }}
          >
            {/* Cursor SVG */}
            <svg
              className="w-4 h-4 transform -rotate-45"
              viewBox="0 0 24 24"
              fill={peer.color}
              stroke="#ffffff"
              strokeWidth="1.5"
            >
              <path d="M3 3l7 18 3-7 7-3L3 3z" />
            </svg>
            <div
              className="ml-3 px-1.5 py-0.5 rounded text-[10px] font-medium text-white shadow-sm whitespace-nowrap"
              style={{ backgroundColor: peer.color }}
            >
              {peer.username}
            </div>
          </div>
        ))}
    </div>
  );
};
