import React, { useState } from "react";
import { CollaborativeComment, UserPresence } from "../types/collaboration";

interface Props {
  auditEventId: string;
  comments: CollaborativeComment[];
  currentUser: UserPresence;
  onAddComment: (content: string) => void;
  onResolveComment: (commentId: string) => void;
}

export const CollaborativeAuditComments: React.FC<Props> = ({
  auditEventId,
  comments,
  currentUser,
  onAddComment,
  onResolveComment,
}) => {
  const [newContent, setNewContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    onAddComment(newContent.trim());
    setNewContent("");
  };

  return (
    <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-800 text-slate-200 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <span>Audit Discussion & Annotations</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {comments.length}
          </span>
        </h4>
      </div>

      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No collaborative comments yet on this event.</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded border text-xs ${
                comment.resolved
                  ? "bg-slate-900/40 border-slate-800 opacity-60"
                  : "bg-slate-800/60 border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-300">{comment.authorName}</span>
                <span className="text-slate-500">{new Date(comment.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-slate-300 whitespace-pre-wrap">{comment.content}</p>
              <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-800/80">
                {comment.resolved ? (
                  <span className="text-emerald-400 text-[10px]">Resolved by {comment.resolvedBy}</span>
                ) : (
                  <button
                    onClick={() => onResolveComment(comment.id)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Add an inline audit observation or note..."
          className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!newContent.trim()}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors"
        >
          Post
        </button>
      </form>
    </div>
  );
};
