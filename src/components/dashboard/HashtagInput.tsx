"use client";

import { useCallback, useState } from "react";

const POPULAR_TAGS = [
  "bollywood", "hiphop", "kathak", "bhangra", "contemporary",
  "trending", "beginner", "tutorial", "choreography", "viral",
  "reels", "dance", "indian", "freestyle", "footwork",
  "grooves", "party", "wedding", "fitness", "zumba",
];

interface HashtagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
}

export default function HashtagInput({ tags, onTagsChange, maxTags = 10 }: HashtagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = useCallback((tag: string) => {
    const clean = tag.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    if (!clean || tags.includes(clean) || tags.length >= maxTags) return;
    onTagsChange([...tags, clean]);
    setInput("");
  }, [tags, onTagsChange, maxTags]);

  const removeTag = useCallback((tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  }, [tags, onTagsChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }, [input, tags, addTag, removeTag]);

  const filteredSuggestions = POPULAR_TAGS.filter(
    (t) => !tags.includes(t) && t.includes(input.toLowerCase())
  ).slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-zinc-400">Hashtags</label>
        <span className="text-[10px] text-zinc-600">{tags.length}/{maxTags}</span>
      </div>

      {/* Tags display */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-zinc-900 p-2.5 min-h-[44px] focus-within:border-[#F3B2AB]/40 transition">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-[#F3B2AB]/15 px-2 py-1 text-xs font-medium text-[#F3B2AB]">
            #{tag}
            <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 text-[#F3B2AB]/60 hover:text-[#F3B2AB] transition">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
        {tags.length < maxTags && (
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={tags.length === 0 ? "Add hashtags..." : ""}
            className="min-w-[80px] flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
          />
        )}
      </div>

      {/* Suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {filteredSuggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-400 transition hover:border-[#F3B2AB]/30 hover:text-[#F3B2AB]"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
