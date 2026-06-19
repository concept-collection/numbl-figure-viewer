import type { FigureState, AxesState } from "numbl/graphics";

// ── Node / detail types ────────────────────────────────────────────────────

export type PropEntry = {
  key: string;
  /** Display string. */
  value: string;
  /** If the property is an RGB triple in [0,1], the CSS color for a swatch. */
  swatch?: string;
};

export type ObjectDetail = {
  type: "object";
  kind: string;
  properties: PropEntry[];
};

export type DatasetDetail = {
  type: "dataset";
  name: string;
  shapeLabel: string;
  count: number;
  stats?: { min: number; max: number; mean: number; nan: number };
  preview: string;
};

export type NodeIcon = "figure" | "axes" | "trace" | "dataset";

export type TreeNode = {
  id: string;
  label: string;
  icon: NodeIcon;
  detail: ObjectDetail | DatasetDetail;
  children: TreeNode[];
};

export type Tree = { root: TreeNode; byId: Map<string, TreeNode> };

// ── Field classification ────────────────────────────────────────────────────

const COLOR_FIELDS = new Set([
  "color",
  "edgeColor",
  "faceColor",
  "markerEdgeColor",
  "markerFaceColor",
  "lineColor",
]);

// Trace categories in the same order as the HDF5 writer, so tree trace indices
// line up with the file's trace indices. `single` marks one-per-axes traces.
const TRACE_CATEGORIES: [keyof AxesState, string, boolean][] = [
  ["traces", "plot", false],
  ["plot3Traces", "plot3", false],
  ["areaTraces", "area", false],
  ["patchTraces", "patch", false],
  ["surfTraces", "surf", false],
  ["imagescTrace", "imagesc", true],
  ["pcolorTraces", "pcolor", false],
  ["contourTraces", "contour", false],
  ["barTraces", "bar", false],
  ["barhTraces", "barh", false],
  ["bar3Traces", "bar3", false],
  ["bar3hTraces", "bar3h", false],
  ["errorBarTraces", "errorbar", false],
  ["boxTraces", "boxchart", false],
  ["pieTrace", "piechart", true],
  ["heatmapTrace", "heatmap", true],
  ["quiverTraces", "quiver", false],
  ["quiver3Traces", "quiver3", false],
];

// ── Formatting helpers ──────────────────────────────────────────────────────

function fmtNum(x: number): string {
  if (Number.isNaN(x)) return "NaN";
  if (!Number.isFinite(x)) return x > 0 ? "Inf" : "-Inf";
  if (Number.isInteger(x)) return String(x);
  return Number(x.toPrecision(6)).toString();
}

function flattenNumbers(v: unknown, out: number[] = []): number[] {
  if (typeof v === "number") out.push(v);
  else if (Array.isArray(v)) for (const e of v) flattenNumbers(e, out);
  return out;
}

function rgbSwatch(v: number[]): string | undefined {
  if (v.length !== 3 || v.some(c => typeof c !== "number")) return undefined;
  const c = v.map(x => Math.round(Math.max(0, Math.min(1, x)) * 255));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function formatProp(key: string, value: unknown): PropEntry {
  if (typeof value === "boolean")
    return { key, value: value ? "true" : "false" };
  if (typeof value === "number") return { key, value: fmtNum(value) };
  if (typeof value === "string") return { key, value };
  if (Array.isArray(value)) {
    if (COLOR_FIELDS.has(key) && value.every(e => typeof e === "number")) {
      const swatch = rgbSwatch(value as number[]);
      return {
        key,
        value: `[${(value as number[]).map(fmtNum).join(", ")}]`,
        swatch,
      };
    }
    if (value.every(e => typeof e === "string"))
      return { key, value: (value as string[]).join(", ") };
    if (value.every(e => e === null || typeof e === "number"))
      return {
        key,
        value: `[${value.map(e => (e === null ? "auto" : fmtNum(e as number))).join(", ")}]`,
      };
  }
  if (value && typeof value === "object")
    return { key, value: JSON.stringify(value) };
  return { key, value: String(value) };
}

function makeDataset(
  name: string,
  raw: unknown,
  rows?: number,
  cols?: number
): DatasetDetail {
  const flat = flattenNumbers(raw);
  let shapeLabel: string;
  if (Array.isArray(raw) && raw.every(e => Array.isArray(e))) {
    const inner = (raw as unknown[][]).map(r => r.length);
    const uniform = inner.every(n => n === inner[0]);
    shapeLabel = uniform
      ? `${raw.length} × ${inner[0] ?? 0}`
      : `${raw.length} × (ragged)`;
  } else if (
    rows &&
    cols &&
    rows > 1 &&
    cols > 1 &&
    flat.length === rows * cols
  ) {
    shapeLabel = `${rows} × ${cols}`;
  } else {
    shapeLabel = String(flat.length);
  }

  let stats: DatasetDetail["stats"];
  if (flat.length > 0) {
    let min = Infinity,
      max = -Infinity,
      sum = 0,
      nan = 0,
      n = 0;
    for (const x of flat) {
      if (Number.isNaN(x)) {
        nan++;
        continue;
      }
      if (x < min) min = x;
      if (x > max) max = x;
      sum += x;
      n++;
    }
    stats = n
      ? { min, max, mean: sum / n, nan }
      : { min: NaN, max: NaN, mean: NaN, nan };
  }

  const previewVals = flat.slice(0, 16).map(fmtNum).join(", ");
  const preview =
    flat.length > 16 ? `${previewVals}, … (${flat.length} total)` : previewVals;

  return { type: "dataset", name, shapeLabel, count: flat.length, stats, preview };
}

// ── Trace flattening ────────────────────────────────────────────────────────

function flattenTraces(ax: AxesState): { kind: string; trace: Record<string, unknown> }[] {
  const out: { kind: string; trace: Record<string, unknown> }[] = [];
  for (const [field, kind, single] of TRACE_CATEGORIES) {
    const v = ax[field];
    if (single) {
      if (v) out.push({ kind, trace: v as unknown as Record<string, unknown> });
    } else if (Array.isArray(v)) {
      for (const t of v)
        out.push({ kind, trace: t as unknown as Record<string, unknown> });
    }
  }
  return out;
}

function buildTraceNode(
  id: string,
  index: number,
  kind: string,
  trace: Record<string, unknown>
): TreeNode {
  const rows = typeof trace.rows === "number" ? trace.rows : undefined;
  const cols = typeof trace.cols === "number" ? trace.cols : undefined;
  const properties: PropEntry[] = [{ key: "kind", value: kind }];
  const datasets: TreeNode[] = [];

  for (const [key, val] of Object.entries(trace)) {
    if (val === null || val === undefined || key === "id") continue;
    const isNumArray = Array.isArray(val) && val.every(e => typeof e === "number");
    const isNestedArray = Array.isArray(val) && val.length > 0 && val.some(e => Array.isArray(e));
    const isDataArray = (isNumArray || isNestedArray) && !COLOR_FIELDS.has(key);
    if (isDataArray) {
      datasets.push({
        id: `${id}/${key}`,
        label: key,
        icon: "dataset",
        detail: makeDataset(key, val, rows, cols),
        children: [],
      });
    } else {
      properties.push(formatProp(key, val));
    }
  }

  const label = `${kind} #${index}`;
  return {
    id,
    label,
    icon: "trace",
    detail: { type: "object", kind, properties },
    children: datasets,
  };
}

// ── Axes / figure ──────────────────────────────────────────────────────────

function axesProperties(ax: AxesState): PropEntry[] {
  const props: PropEntry[] = [];
  const add = (key: string, v: unknown) => {
    if (v !== undefined && v !== null) props.push(formatProp(key, v));
  };
  add("title", ax.title);
  add("xlabel", ax.xlabel);
  add("ylabel", ax.ylabel);
  add("zlabel", ax.zlabel);
  add("legend", ax.legend);
  add("xlim", ax.xlim);
  add("ylim", ax.ylim);
  add("zlim", ax.zlim);
  add("colormap", ax.colormap);
  add("caxis", ax.caxis);
  add("axisScale", ax.axisScale);
  add("gridOn", ax.gridOn);
  add("boxOn", ax.boxOn);
  add("holdOn", ax.holdOn);
  add("colorbar", ax.colorbar);
  add("shading", ax.shading);
  if (ax.view) add("view", [ax.view.az, ax.view.el]);
  return props;
}

export function buildTree(figure: FigureState, fileName: string): Tree {
  const byId = new Map<string, TreeNode>();
  const register = (n: TreeNode) => {
    byId.set(n.id, n);
    return n;
  };

  const figProps: PropEntry[] = [];
  if (figure.sgtitle) figProps.push({ key: "sgtitle", value: figure.sgtitle });
  if (figure.subplotGrid)
    figProps.push({
      key: "subplots",
      value: `${figure.subplotGrid.rows} × ${figure.subplotGrid.cols}`,
    });
  const axesIndices = Object.keys(figure.axes)
    .map(Number)
    .sort((a, b) => a - b);
  figProps.push({ key: "axes", value: String(axesIndices.length) });

  const axesNodes: TreeNode[] = [];
  if (figure.uihtml) {
    figProps.push({ key: "type", value: "HTML component (uihtml)" });
  } else {
    for (const idx of axesIndices) {
      const ax = figure.axes[idx];
      const axId = `axes/${idx}`;
      const traces = flattenTraces(ax);
      const traceNodes = traces.map((t, k) =>
        register(buildTraceNode(`${axId}/trace/${k}`, k, t.kind, t.trace))
      );
      // also surface registered dataset children
      for (const tn of traceNodes) for (const d of tn.children) byId.set(d.id, d);

      const axTitle = ax.title ? `Axes ${idx} — ${ax.title}` : `Axes ${idx}`;
      axesNodes.push(
        register({
          id: axId,
          label: axTitle,
          icon: "axes",
          detail: { type: "object", kind: "Axes", properties: axesProperties(ax) },
          children: traceNodes,
        })
      );
    }
  }

  const root = register({
    id: "figure",
    label: fileName,
    icon: "figure",
    detail: { type: "object", kind: "Figure", properties: figProps },
    children: axesNodes,
  });

  return { root, byId };
}
