"use client";

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type MatchSelectOption = {
  value: string;
  label: string;
};

type Props = {
  id: string;
  label: string;
  options: MatchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
};

export function MatchSearchSelect({
  id,
  label,
  options,
  value,
  onChange,
  searchable = false,
  searchPlaceholder = "Gõ tên để tìm…",
  emptyLabel = "Không có kết quả",
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!searchable) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
    if (!open) setQuery("");
  }, [open, searchable]);

  return (
    <div ref={rootRef} className={`match-select${open ? " is-open" : ""}`}>
      <label htmlFor={searchable && open ? `${id}-search` : id}>{label}</label>
      <button
        id={id}
        type="button"
        className="match-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="match-select-value">{selected?.label ?? "Chọn…"}</span>
        <ChevronDown className="feather match-select-chevron" aria-hidden />
      </button>
      {open ? (
        <div className="match-select-panel" role="presentation">
          {searchable ? (
            <div className="match-select-search">
              <Search className="feather" aria-hidden />
              <input
                ref={inputRef}
                id={`${id}-search`}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                aria-controls={listId}
              />
            </div>
          ) : null}
          <ul id={listId} className="match-select-list" role="listbox" aria-label={label}>
            {filtered.length === 0 ? (
              <li className="match-select-empty" role="presentation">
                {emptyLabel}
              </li>
            ) : (
              filtered.map((o) => (
                <li key={o.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    className={`match-select-option${o.value === value ? " is-selected" : ""}`}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
