import { useCallback, useRef, useState } from "react";
import { importFigureHdf5, FigureView, type FigureState } from "numbl/graphics";

export function App() {
  const [figure, setFigure] = useState<FigureState | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadBytes = useCallback(async (bytes: Uint8Array, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const fig = await importFigureHdf5(bytes);
      setFigure(fig);
      setFileName(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setFigure(null);
      setFileName(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFile = useCallback(
    async (file: File) => loadBytes(new Uint8Array(await file.arrayBuffer()), file.name),
    [loadBytes]
  );

  const loadSample = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}sample.h5`);
      await loadBytes(new Uint8Array(await resp.arrayBuffer()), "sample.h5");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }, [loadBytes]);

  return (
    <div className="app">
      <header>
        <h1>numbl figure viewer</h1>
        <p className="sub">
          Open a <code>.h5</code> figure file exported from{" "}
          <a href="https://numbl.org">numbl</a> and view it here. Rendering uses
          numbl&rsquo;s own figure components.
        </p>
      </header>

      <div
        className={"dropzone" + (dragOver ? " over" : "")}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) loadFile(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".h5,.hdf5"
          style={{ display: "none" }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) loadFile(f);
          }}
        />
        {loading
          ? "Loading…"
          : fileName
            ? `Loaded: ${fileName} — click or drop to open another`
            : "Click to choose, or drag a .h5 figure file here"}
      </div>

      <div className="actions">
        <button onClick={loadSample} disabled={loading}>
          Try a sample figure
        </button>
      </div>

      {error && <div className="error">Failed to open file: {error}</div>}

      {figure && (
        <div className="figure-wrap">
          <div className="figure-inner">
            <FigureView figure={figure} />
          </div>
        </div>
      )}
    </div>
  );
}
