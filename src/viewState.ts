import type { FigureState, AxesState } from "numbl/graphics";
import { TRACE_CATEGORIES, type Tree } from "./tree";

/**
 * Per-element view state layered on top of the immutable parsed figure. The
 * rendered figure is *derived* from (figure + ViewState) via `applyViewState`,
 * so new kinds of per-element view controls (highlight, pin, style overrides,
 * …) can be added as additional fields + transform steps without touching the
 * parse/tree code.
 *
 * Today it carries visibility: which axes/traces are hidden. "Show only" is
 * expressed as "hide everything else", so showing a set, hiding one, and
 * isolating one all reduce to manipulating `hidden`.
 */
export interface ViewState {
  /** Ids of axes/trace elements explicitly hidden from the figure. */
  hidden: Set<string>;
  // Future: highlighted: Set<string>; pinned: Set<string>; overrides: Map<…>;
}

export const emptyViewState = (): ViewState => ({ hidden: new Set() });

export function toggleHidden(vs: ViewState, id: string): ViewState {
  const hidden = new Set(vs.hidden);
  if (hidden.has(id)) hidden.delete(id);
  else hidden.add(id);
  return { ...vs, hidden };
}

export function showAll(vs: ViewState): ViewState {
  return { ...vs, hidden: new Set() };
}

/** The element itself was hidden. */
export function isHidden(vs: ViewState, id: string): boolean {
  return vs.hidden.has(id);
}

/** Hidden itself, or its containing axes is hidden (so it won't render). */
export function isEffectivelyHidden(vs: ViewState, id: string): boolean {
  if (vs.hidden.has(id)) return true;
  const m = id.match(/^(axes\/\d+)\/trace\//);
  return m ? vs.hidden.has(m[1]) : false;
}

/** Show only `id`: hide every other axes/trace. A dataset isolates its parent
 *  trace; the figure root shows everything. */
export function isolate(vs: ViewState, tree: Tree, id: string): ViewState {
  if (id === "figure") return showAll(vs);
  const node = tree.byId.get(id);
  if (!node) return vs;

  const keep = new Set<string>();
  if (node.icon === "axes") {
    keep.add(id);
    for (const c of node.children) if (c.icon === "trace") keep.add(c.id);
  } else {
    // trace or dataset → resolve to the trace and its axes
    const traceId = node.icon === "dataset" ? id.replace(/\/[^/]+$/, "") : id;
    keep.add(traceId);
    keep.add(traceId.replace(/\/trace\/\d+$/, ""));
  }

  const hidden = new Set<string>();
  for (const [nid, n] of tree.byId)
    if ((n.icon === "axes" || n.icon === "trace") && !keep.has(nid))
      hidden.add(nid);
  return { ...vs, hidden };
}

/** Whether a figure has anything to draw (any trace, or a uihtml component). */
export function figureHasContent(figure: FigureState): boolean {
  if (figure.uihtml) return true;
  for (const ax of Object.values(figure.axes)) {
    for (const [field, , single] of TRACE_CATEGORIES) {
      const cur = (ax as Record<string, unknown>)[field as string];
      if (single ? !!cur : Array.isArray(cur) && cur.length > 0) return true;
    }
  }
  return false;
}

/** Derive the figure to render from the parsed figure + view state. */
export function applyViewState(figure: FigureState, vs: ViewState): FigureState {
  if (figure.uihtml || vs.hidden.size === 0) return figure;

  const outAxes: FigureState["axes"] = {};
  for (const [idxStr, ax] of Object.entries(figure.axes)) {
    const idx = Number(idxStr);
    const axId = `axes/${idx}`;
    if (vs.hidden.has(axId)) continue; // whole axes hidden

    const next = { ...(ax as Record<string, unknown>) };
    let k = 0; // flattened trace index, matching the object tree
    for (const [field, , single] of TRACE_CATEGORIES) {
      const cur = (ax as Record<string, unknown>)[field as string];
      if (single) {
        if (cur) {
          const tid = `${axId}/trace/${k++}`;
          if (vs.hidden.has(tid)) next[field as string] = undefined;
        }
      } else if (Array.isArray(cur)) {
        const kept: unknown[] = [];
        for (const t of cur) {
          const tid = `${axId}/trace/${k++}`;
          if (!vs.hidden.has(tid)) kept.push(t);
        }
        next[field as string] = kept;
      }
    }
    outAxes[idx] = next as unknown as AxesState;
  }

  // If isolating collapsed a subplot grid to a single axes, let it fill.
  let subplotGrid = figure.subplotGrid;
  if (subplotGrid && Object.keys(outAxes).length <= 1) subplotGrid = undefined;
  return { ...figure, axes: outAxes, subplotGrid };
}
