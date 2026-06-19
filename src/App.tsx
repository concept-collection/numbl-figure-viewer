import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { importFigureHdf5, FigureView, type FigureState } from "numbl/graphics";
import { buildTree } from "./tree";
import { ObjectTree } from "./ObjectTree";
import { InfoPanel } from "./InfoPanel";
import { useMediaQuery } from "./useMediaQuery";
import {
  applyViewState,
  emptyViewState,
  figureHasContent,
  isolate,
  showAll,
  toggleHidden,
  type ViewState,
} from "./viewState";

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** A draggable vertical divider; reports incremental drag deltas in px. */
function Divider({ onResize }: { onResize: (dx: number) => void }) {
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    let lastX = e.clientX;
    const move = (ev: PointerEvent) => {
      onResize(ev.clientX - lastX);
      lastX = ev.clientX;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  return <div className="divider" onPointerDown={onPointerDown} role="separator" />;
}

export function App() {
  const [figure, setFigure] = useState<FigureState | null>(null);
  const [fileName, setFileName] = useState("figure");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>(emptyViewState);
  const [dragOver, setDragOver] = useState(false);

  const isMobile = useMediaQuery("(max-width: 820px)");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftW, setLeftW] = useState(260);
  const [rightW, setRightW] = useState(320);
  const inputRef = useRef<HTMLInputElement>(null);

  // Panels are inline columns on desktop, slide-in drawers on mobile.
  useEffect(() => {
    setLeftOpen(!isMobile);
    setRightOpen(!isMobile);
  }, [isMobile]);

  const tree = useMemo(
    () => (figure ? buildTree(figure, fileName) : null),
    [figure, fileName]
  );
  const selectedNode =
    tree && selectedId ? (tree.byId.get(selectedId) ?? null) : null;

  // The figure actually rendered is derived from the parsed figure + view state.
  const viewFigure = useMemo(
    () => (figure ? applyViewState(figure, viewState) : null),
    [figure, viewState]
  );
  const nothingVisible = !!viewFigure && !figureHasContent(viewFigure);

  const onToggleHidden = (id: string) =>
    setViewState(vs => toggleHidden(vs, id));
  const onIsolate = (id: string) =>
    setViewState(vs => (tree ? isolate(vs, tree, id) : vs));
  const onShowAll = () => setViewState(showAll);

  const loadFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const fig = await importFigureHdf5(bytes);
      setFigure(fig);
      setFileName(file.name);
      setSelectedId("figure");
      setViewState(emptyViewState());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setFigure(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const pickFile = () => inputRef.current?.click();
  const onSelect = (id: string) => {
    setSelectedId(id);
    if (isMobile) setLeftOpen(false);
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".h5,.hdf5"
      style={{ display: "none" }}
      onChange={e => {
        const f = e.target.files?.[0];
        if (f) loadFile(f);
        e.target.value = "";
      }}
    />
  );

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) loadFile(f);
    },
  };

  return (
    <div className="app">
      {fileInput}

      <header className="titlebar">
        {figure && (
          <button
            className="icon-btn"
            title="Toggle object tree"
            onClick={() => setLeftOpen(o => !o)}
          >
            ☰
          </button>
        )}
        <span className="app-title">numbl figure viewer</span>
        {figure && <span className="file-name">{fileName}</span>}
        <span className="spacer" />
        <button className="text-btn" onClick={pickFile} disabled={loading}>
          {loading ? "Loading…" : "Open .h5…"}
        </button>
        {figure && (
          <button
            className="icon-btn"
            title="Toggle details panel"
            onClick={() => setRightOpen(o => !o)}
          >
            ⓘ
          </button>
        )}
      </header>

      {error && <div className="error-bar">Failed to open file: {error}</div>}

      {!figure ? (
        <div
          className={"empty-state" + (dragOver ? " over" : "")}
          onClick={pickFile}
          {...dropHandlers}
        >
          <div className="empty-inner">
            <div className="empty-icon">▦</div>
            <h2>Open a numbl figure</h2>
            <p>
              Drag a <code>.h5</code> figure file here, or click to choose one.
            </p>
            <p className="muted small">
              Exported from numbl via “Download data (.h5)”.
            </p>
          </div>
        </div>
      ) : (
        <div className="body">
          {/* Left: object tree */}
          {leftOpen && (
            <aside
              className={"panel left" + (isMobile ? " drawer" : "")}
              style={isMobile ? undefined : { width: leftW }}
            >
              <div className="panel-head">
                <span>Objects</span>
                <span className="head-actions">
                  {viewState.hidden.size > 0 && (
                    <button className="link-btn" onClick={onShowAll}>
                      Show all
                    </button>
                  )}
                  {isMobile && (
                    <button
                      className="icon-btn"
                      onClick={() => setLeftOpen(false)}
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>
              <div className="panel-body">
                {tree && (
                  <ObjectTree
                    root={tree.root}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    viewState={viewState}
                    onToggleHidden={onToggleHidden}
                    onIsolate={onIsolate}
                  />
                )}
              </div>
            </aside>
          )}
          {leftOpen && !isMobile && (
            <Divider onResize={dx => setLeftW(w => clamp(w + dx, 180, 520))} />
          )}

          {/* Center: figure (rendered from the view-state-derived figure) */}
          <main className="center" {...dropHandlers}>
            <div className="figure-host">
              {viewFigure && !nothingVisible && (
                <FigureView figure={viewFigure} />
              )}
            </div>
            {nothingVisible && (
              <div className="center-overlay">
                <div>
                  <p>Nothing visible</p>
                  <button className="text-btn" onClick={onShowAll}>
                    Show all
                  </button>
                </div>
              </div>
            )}
            {dragOver && <div className="drop-hint">Drop to open</div>}
          </main>

          {/* Right: details */}
          {rightOpen && !isMobile && (
            <Divider onResize={dx => setRightW(w => clamp(w - dx, 220, 620))} />
          )}
          {rightOpen && (
            <aside
              className={"panel right" + (isMobile ? " drawer" : "")}
              style={isMobile ? undefined : { width: rightW }}
            >
              <div className="panel-head">
                <span>Details</span>
                {isMobile && (
                  <button
                    className="icon-btn"
                    onClick={() => setRightOpen(false)}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="panel-body">
                <InfoPanel node={selectedNode} />
              </div>
            </aside>
          )}

          {/* Mobile drawer backdrop */}
          {isMobile && (leftOpen || rightOpen) && (
            <div
              className="backdrop"
              onClick={() => {
                setLeftOpen(false);
                setRightOpen(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
