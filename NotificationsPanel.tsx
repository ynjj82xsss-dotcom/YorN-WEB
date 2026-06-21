import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Plus,
  MessageSquare,
  Settings,
  User,
  X,
  LogIn,
  LogOut,
  Edit2,
  Trash2,
  Pin,
  MoreVertical,
} from "lucide-react";
import { ChatSession } from "../types";
import { User as FirebaseUser } from "firebase/auth";

interface LeftSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onPinSession: (id: string, isPinned: boolean) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  user: FirebaseUser | null;
  onLogin: () => void;
  subscriptionTier: 'free' | 'pro' | 'unique';
}

export default function LeftSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onPinSession,
  onNewChat,
  isOpen,
  onClose,
  onOpenProfile,
  user,
  onLogin,
  subscriptionTier,
}: LeftSidebarProps) {
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 45) {
      if (deltaX < 0) {
        onClose();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  useEffect(() => {
    const closeMenu = () => setMenuSessionId(null);
    document.addEventListener("click", closeMenu);
    document.addEventListener("contextmenu", closeMenu);
    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("contextmenu", closeMenu);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuSessionId(id);
    setEditingSessionId(null);
  };

  const startRename = (id: string, title: string) => {
    setEditingSessionId(id);
    setEditingTitle(title);
    setMenuSessionId(null);
  };

  const handleRenameSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (editingTitle.trim()) {
      onRenameSession(id, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-0 left-0 h-full w-[280px] shrink-0 z-50 flex flex-col items-stretch
                   bg-[#080808]/95 border-r border-[#1A1A1A] 
                   transition-transform duration-300 ease-in-out overflow-hidden
                   ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] flex flex-col h-full w-[280px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-transparent flex items-center justify-center border border-[#333] shadow-[0_0_15px_rgba(255,255,255,0.03)] relative overflow-hidden bg-[#0A0A0A]">
                {/* Soft glow behind avatar */}
                <div className="absolute inset-0 bg-white/5 rounded-lg blur-md" />
                <svg
                  viewBox="0 0 100 100"
                  className="w-5 h-5 relative z-10"
                  fill="none"
                  stroke="#E0E0E0"
                  strokeWidth="6"
                  strokeLinejoin="miter"
                >
                  {/* Stylized Y */}
                  <path d="M15 20 L40 55 V85 M65 20 L40 55" />
                  {/* Stylized N */}
                  <path d="M55 85 V20 L85 85 V20" />
                </svg>
              </div>
              <span className="font-medium text-[#A0A0A0] tracking-wide">
                YorN AI
              </span>
            </div>

            <button
              onClick={onClose}
              className="text-[#666] hover:text-[#CCC] hover:bg-[#121212]/50 p-1.5 rounded-lg transition-all cursor-pointer"
              title="Свернуть панель"
            >
              <X size={18} />
            </button>
          </div>

          <button
            onClick={onNewChat}
            className="group relative w-full p-3 rounded-xl bg-[#0C0C0C] border border-[#222] hover:bg-[#151515] transition-all overflow-hidden flex items-center justify-between"
          >
            {/* Pulse effect */}
            <div className="absolute inset-0 ring-1 ring-white/5 rounded-xl animate-[pulse_4s_ease-in-out_infinite]" />
            <span className="text-sm text-[#888] font-medium relative z-10 transition-colors">
              Новый чат
            </span>
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-[#1A1A1A] group-hover:scale-110 transition-transform relative z-10">
              <Plus size={12} className="text-[#888]" />
            </div>
          </button>

          <div className="mt-8 flex-1 overflow-y-auto scrollbar-hide">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#444] font-semibold mb-4 px-2">
              История
            </div>
            <div className="flex flex-col gap-1">
              {[...sessions]
                .sort((a, b) => {
                  const pinA = a.isPinned ? 1 : 0;
                  const pinB = b.isPinned ? 1 : 0;
                  return pinB - pinA;
                })
                .map((item) => (
                  <div
                    key={item.id}
                    className="relative animate-[fadeIn_0.15s_ease-out] group/item"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectSession(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectSession(item.id);
                        }
                      }}
                      onContextMenu={(e) => handleContextMenu(e, item.id)}
                      className={`group flex items-center gap-3 w-full py-2.5 px-3 rounded-lg text-left transition-all duration-200 hover:translate-x-1 relative overflow-hidden cursor-pointer select-none outline-none ${
                        item.id === currentSessionId
                          ? "bg-gradient-to-r from-white/10 via-white/2 to-transparent border-l-2 border-white shadow-[inset_12px_0_20px_-10px_rgba(255,255,255,0.08)] pl-2"
                          : "hover:bg-[#121212]/50 border-l-2 border-transparent pl-2 focus-visible:bg-[#121212]/50"
                      }`}
                    >
                      <MessageSquare
                        size={13}
                        className={`shrink-0 transition-all duration-300 ${
                          item.id === currentSessionId
                            ? "text-white scale-110"
                            : "text-[#444] group-hover:text-[#888]"
                        }`}
                      />
                      <div className="flex flex-col overflow-hidden max-w-full flex-1">
                        {editingSessionId === item.id ? (
                          <form
                            onSubmit={(e) => handleRenameSubmit(e, item.id)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={(e) => handleRenameSubmit(e, item.id)}
                              autoFocus
                              className="w-full bg-[#1A1A1A] text-xs text-[#E0E0E0] outline-none border border-[#333] rounded px-1 py-0.5"
                            />
                          </form>
                        ) : (
                          <span
                            className={`text-xs transition-all duration-300 truncate ${item.id === currentSessionId ? "text-[#E0E0E0]" : "text-[#666] group-hover:text-[#AAA]"}`}
                          >
                            {item.title}
                          </span>
                        )}
                      </div>

                      {/* Pin indicator / action button */}
                      <div className="flex items-center shrink-0 ml-1 gap-1 relative z-20">
                        {item.isPinned && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPinSession(item.id, false);
                            }}
                            className="p-1 text-[#C084FC] hover:text-[#E9D5FF] hover:bg-white/5 rounded transition-colors cursor-pointer"
                            title="Открепить"
                          >
                            <Pin
                              size={11}
                              className="fill-[#C084FC]/20 transform rotate-45"
                            />
                          </button>
                        )}

                        {/* Mobile options menu */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setMenuSessionId(menuSessionId === item.id ? null : item.id);
                            setEditingSessionId(null);
                          }}
                          className="p-1 text-[#555] hover:text-[#CCC] hover:bg-white/5 rounded transition-all cursor-pointer block lg:hidden"
                          title="Опции"
                        >
                          <MoreVertical size={12} />
                        </button>

                        {!item.isPinned && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPinSession(item.id, true);
                            }}
                            className="p-1 opacity-0 group-hover/item:opacity-100 text-[#444] hover:text-[#AAA] hover:bg-white/5 rounded transition-opacity transition-colors cursor-pointer hidden lg:block"
                            title="Закрепить"
                          >
                            <Pin size={10} />
                          </button>
                        )}
                      </div>
                    </div>

                    {menuSessionId === item.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        onContextMenu={(e) => e.preventDefault()}
                        className="absolute top-8 right-2 z-[100] bg-[#151515] border border-[#222] rounded-lg shadow-2xl flex flex-col p-1 min-w-[140px]"
                      >
                        <button
                          onClick={() => {
                            onPinSession(item.id, !item.isPinned);
                            setMenuSessionId(null);
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#222] rounded text-[#E0E0E0] text-xs transition-colors"
                        >
                          <Pin
                            size={12}
                            className={item.isPinned ? "text-[#C084FC]" : ""}
                          />
                          {item.isPinned ? "Открепить" : "Закрепить"}
                        </button>
                        <button
                          onClick={() => startRename(item.id, item.title)}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#222] rounded text-[#E0E0E0] text-xs transition-colors"
                        >
                          <Edit2 size={12} />
                          Переименовать
                        </button>
                        <button
                          onClick={() => {
                            onDeleteSession(item.id);
                            setMenuSessionId(null);
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-red-900/30 rounded text-red-500 text-xs transition-colors"
                        >
                          <Trash2 size={12} />
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#1A1A1A] flex flex-col gap-2">
            {user ? (
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-3 w-full py-3 px-2 rounded-lg text-left hover:bg-[#151515] transition-all"
              >
                <div className="w-8 h-8 rounded bg-[#111] overflow-hidden border border-[#222] flex items-center justify-center">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "Profile"}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User size={14} className="text-[#888]" />
                  )}
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className="text-[11px] font-medium text-[#E0E0E0] truncate">
                      {user.displayName || "Пользователь"}
                    </span>
                    <span className={`inline-flex items-center text-[7px] font-mono font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded leading-none shrink-0 ${
                      subscriptionTier === 'unique' 
                        ? 'bg-white text-[#000000]' 
                        : subscriptionTier === 'pro'
                          ? 'bg-neutral-800 text-[#FFFFFF] border border-neutral-700'
                          : 'bg-[#151515] text-[#555] border border-neutral-800'
                    }`}>
                      {subscriptionTier}
                    </span>
                  </div>
                  <span className="text-[9px] text-[#555] truncate">
                    {user.email}
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center justify-center gap-2 w-full py-3 px-2 rounded-lg bg-white text-black hover:bg-gray-100 transition-all font-medium"
              >
                <LogIn size={16} />
                <span className="text-xs">Войти через Google</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
