import { useState } from "react";
import type { TreeNode, NodeIcon } from "./tree";

const ICONS: Record<NodeIcon, string> = {
  figure: "▦",
  axes: "▢",
  trace: "∿",
  dataset: "⋯",
};

function NodeRow({
  node,
  depth,
  expanded,
  toggle,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  return (
    <>
      <div
        className={"tree-row" + (isSelected ? " selected" : "")}
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
          />
        ))}
    </>
  );
}

export function ObjectTree({
  root,
  selectedId,
  onSelect,
}: {
  root: TreeNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
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
      />
    </div>
  );
}
