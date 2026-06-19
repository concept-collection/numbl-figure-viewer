import type { TreeNode } from "./tree";

function fmt(x: number): string {
  if (Number.isNaN(x)) return "NaN";
  if (!Number.isFinite(x)) return x > 0 ? "Inf" : "-Inf";
  return Number.isInteger(x) ? String(x) : Number(x.toPrecision(6)).toString();
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
        <span className={"node-icon icon-" + node.icon}>
          {detail.type === "dataset" ? "⋯" : ""}
        </span>
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
          <pre className="preview">{detail.preview}</pre>
        </div>
      )}
    </div>
  );
}
