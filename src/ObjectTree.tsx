import { useState } from "react";
import type { TreeNode, NodeIcon } from "./tree";
import {
  type ViewState,
  isHidden,
  isEffectivelyHidden,
} from "./viewState";

const ICONS: Record<NodeIcon, string> = {
  figure: "▦",
  axes: "▢",
  trace: "∿",
  dataset: "⋯",
};

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M8 3.2C4.4 3.2 1.9 6 1.2 8c.7 2 3.2 4.8 6.8 4.8S14.1 10 14.8 8C14.1 6 11.6 3.2 8 3.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
      {!open && (
        <line x1="2.5" y1="13.5" x2="13.5" y2="2.5" stroke="currentColor" strokeWidth="1.2" />
      )}
    </svg>
  );
}

function SoloIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="1.8" fill="currentColor" />
    </svg>
  );
}

function NodeRow({
  node,
  depth,
  expanded,
  toggle,
  selectedId,
  onSelect,
  viewState,
  onToggleHidden,
  onIsolate,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  viewState: ViewState;
  onToggleHidden: (id: string) => void;
  onIsolate: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const hasControls = node.icon === "axes" || node.icon === "trace";
  const ownHidden = isHidden(viewState, node.id);
  const dimmed = isEffectivelyHidden(viewState, node.id);

  const cls = [
    "tree-row",
    isSelected ? "selected" : "",
    dimmed ? "dimmed" : "",
    ownHidden ? "el-hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        className={cls}
        style={{ paddingLeft: 4 + depth * 14 }}
        onClick={() => onSelect(node.id)}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isOpen : undefined}
      >
        <span
          className={"twisty" + (hasChildren ? "" : " leaf")}
          onClick={e => {
            e.stopPropagation();
            if (hasChildren) toggle(node.id);
          }}
        >
          {hasChildren ? (isOpen ? "▾" : "▸") : ""}
        </span>
        <span className={"node-icon icon-" + node.icon}>{ICONS[node.icon]}</span>
        <span className="node-label">{node.label}</span>
        {hasControls && (
          <span className="row-actions">
            <button
              className="act-btn"
              title="Show only this"
              onClick={e => {
                e.stopPropagation();
                onIsolate(node.id);
              }}
            >
              <SoloIcon />
            </button>
            <button
              className={"act-btn" + (ownHidden ? " active" : "")}
              title={ownHidden ? "Show" : "Hide"}
              onClick={e => {
                e.stopPropagation();
                onToggleHidden(node.id);
              }}
            >
              <EyeIcon open={!ownHidden} />
            </button>
          </span>
        )}
      </div>
      {hasChildren &&
        isOpen &&
        node.children.map(child => (
          <NodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            toggle={toggle}
            selectedId={selectedId}
            onSelect={onSelect}
            viewState={viewState}
            onToggleHidden={onToggleHidden}
            onIsolate={onIsolate}
          />
        ))}
    </>
  );
}

export function ObjectTree({
  root,
  selectedId,
  onSelect,
  viewState,
  onToggleHidden,
  onIsolate,
}: {
  root: TreeNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  viewState: ViewState;
  onToggleHidden: (id: string) => void;
  onIsolate: (id: string) => void;
}) {
  // Expand the figure and its axes by default.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>([root.id]);
    for (const axes of root.children) s.add(axes.id);
    return s;
  });
  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="tree" role="tree">
      <NodeRow
        node={root}
        depth={0}
        expanded={expanded}
        toggle={toggle}
        selectedId={selectedId}
        onSelect={onSelect}
        viewState={viewState}
        onToggleHidden={onToggleHidden}
        onIsolate={onIsolate}
      />
    </div>
  );
}
