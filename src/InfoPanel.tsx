import { useState } from "react";
import type { TreeNode } from "./tree";

function fmt(x: number): string {
  if (Number.isNaN(x)) return "NaN";
  if (!Number.isFinite(x)) return x > 0 ? "Inf" : "-Inf";
  return Number.isInteger(x) ? String(x) : Number(x.toPrecision(6)).toString();
}

// Hard cap on how many values/rows are ever rendered as text, to keep large
// arrays (e.g. big surf grids) from freezing the UI.
const MAX_RENDER = 5000;
const STEP = 1000;

function DataValues({ data }: { data: unknown }) {
  const [limit, setLimit] = useState(200);

  if (!Array.isArray(data) || data.length === 0)
    return <p className="muted small">No data.</p>;

  const isNumber = (e: unknown) => typeof e === "number";
  const allNumbers = (data as unknown[]).every(isNumber);

  const total = data.length;
  const renderCap = Math.min(total, MAX_RENDER);
  const shown = Math.min(limit, renderCap);
  const hasMore = shown < renderCap;
  const capped = total > MAX_RENDER && shown >= MAX_RENDER;
  const unit = allNumbers ? "values" : "rows";

  let body: string;
  if (allNumbers) {
    body = (data as number[]).slice(0, shown).map(fmt).join(", ");
  } else {
    body = (data as unknown[])
      .slice(0, shown)
      .map((r, i) => {
        const text = Array.isArray(r)
          ? `[${(r as number[]).map(fmt).join(", ")}]`
          : fmt(r as number);
        return `${i}: ${text}`;
      })
      .join("\n");
  }
  if (shown < total) body += allNumbers ? ", …" : "\n…";

  return (
    <>
      <pre className="preview">{body}</pre>
      <div className="vfooter">
        <span className="muted small">
          {shown < total ? `Showing ${shown} of ${total} ${unit}` : `${total} ${unit}`}
          {capped ? " — display capped" : ""}
        </span>
        {hasMore && (
          <button
            className="text-btn sm"
            onClick={() => setLimit(l => Math.min(l + STEP, renderCap))}
          >
            Show more
          </button>
        )}
        {!capped && shown < total && total <= MAX_RENDER && (
          <button className="text-btn sm" onClick={() => setLimit(total)}>
            Show all
          </button>
        )}
      </div>
    </>
  );
}

export function InfoPanel({ node }: { node: TreeNode | null }) {
  if (!node) {
    return (
      <div className="info empty">
        <p>Select an object in the tree to inspect it.</p>
      </div>
    );
  }

  const { detail } = node;

  return (
    <div className="info">
      <div className="info-header">
        <span className="info-title">{node.label}</span>
        <span className="info-kind">
          {detail.type === "dataset" ? "dataset" : detail.kind}
        </span>
      </div>

      {detail.type === "object" ? (
        detail.properties.length === 0 ? (
          <p className="muted">No properties.</p>
        ) : (
          <table className="props">
            <tbody>
              {detail.properties.map(p => (
                <tr key={p.key}>
                  <td className="pk">{p.key}</td>
                  <td className="pv">
                    {p.swatch && (
                      <span className="swatch" style={{ background: p.swatch }} />
                    )}
                    {p.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : (
        <div className="dataset-detail">
          <table className="props">
            <tbody>
              <tr>
                <td className="pk">shape</td>
                <td className="pv">{detail.shapeLabel}</td>
              </tr>
              <tr>
                <td className="pk">count</td>
                <td className="pv">{detail.count}</td>
              </tr>
              {detail.stats && (
                <>
                  <tr>
                    <td className="pk">min</td>
                    <td className="pv">{fmt(detail.stats.min)}</td>
                  </tr>
                  <tr>
                    <td className="pk">max</td>
                    <td className="pv">{fmt(detail.stats.max)}</td>
                  </tr>
                  <tr>
                    <td className="pk">mean</td>
                    <td className="pv">{fmt(detail.stats.mean)}</td>
                  </tr>
                  {detail.stats.nan > 0 && (
                    <tr>
                      <td className="pk">NaN</td>
                      <td className="pv">{detail.stats.nan}</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
          <div className="preview-label">values</div>
          <DataValues key={node.id} data={detail.data} />
        </div>
      )}
    </div>
  );
}
