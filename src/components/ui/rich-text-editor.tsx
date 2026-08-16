"use client";

import { useRef } from "react";

const COLORS = ["#16213A", "#3B5BDB", "#0EA371", "#D64545", "#B8860B"];

export function RichTextEditor({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  const editableRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  function sync() {
    if (editableRef.current && hiddenRef.current) {
      hiddenRef.current.value = editableRef.current.innerHTML;
    }
  }

  function exec(command: string, value?: string) {
    editableRef.current?.focus();
    document.execCommand(command, false, value);
    sync();
  }

  return (
    <div className="border border-border rounded-[var(--radius-sm)] overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-border-soft bg-bg-elevated-2 px-2 py-1.5">
        {(["H1", "H2", "H3", "H4"] as const).map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => exec("formatBlock", h.toLowerCase())}
            className="px-2 py-1 text-xs font-semibold rounded hover:bg-bg-elevated text-text-muted"
          >
            {h}
          </button>
        ))}
        <button
          type="button"
          onClick={() => exec("formatBlock", "p")}
          className="px-2 py-1 text-xs rounded hover:bg-bg-elevated text-text-muted"
        >
          P
        </button>
        <span className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={() => exec("bold")}
          className="px-2 py-1 text-xs font-bold rounded hover:bg-bg-elevated text-text-muted"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => exec("underline")}
          className="px-2 py-1 text-xs underline rounded hover:bg-bg-elevated text-text-muted"
        >
          U
        </button>
        <span className="w-px h-4 bg-border mx-1" />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => exec("foreColor", c)}
            className="h-4 w-4 rounded-full border border-border-soft"
            style={{ backgroundColor: c }}
            aria-label={`Couleur ${c}`}
          />
        ))}
      </div>
      <div
        ref={editableRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        className="rte-editable px-3 py-2.5 text-sm text-text-primary"
        dangerouslySetInnerHTML={{ __html: defaultValue }}
      />
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={defaultValue} />
    </div>
  );
}
