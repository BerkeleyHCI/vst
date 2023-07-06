import React, { Component } from "react";
import { connect } from "react-redux";
import { fabric } from "fabric";
import { v4 as uuid } from "uuid";
import {
    loadSelection,
    customizeSelectionStyle,
    customizeCanvasStyle,
    getCanvas,
    resizeCanvas,
    lockCanvasMovement,
} from "../util.js";
import { DimButton } from "./Button.js";
import CanvasBase from "./CanvasBase.js";
import ListHead from "./ListHead.js";
import Image from "./Image.js";
import Icon from "./Icon.js";
import { setCanvasSelection, setModal, setFilter } from "../actions/index.js";
import { downloadContent } from "./Downloader.js";

// Different selection style
fabric.Object.prototype.transparentCorners = false;

class Canvas extends Component {
    constructor(props) {
        super(props);
        this.state = { darkMode: false };
    }

    componentDidMount = () => {
        const { canvasId } = this.props;

        // http://fabricjs.com/many-objects
        const options = { renderOnAddRemove: false };

        // Resize canvas with window.
        const canvas = new CanvasBase(canvasId, options);
        window.addEventListener("resize", this.resize);
        canvas.brightenBg();
        canvas.resetZoom();

        // Handling zoom with scroll / canvas selections
        canvas.on("mouse:wheel", canvas.handleScroll);
        canvas.on("mouse:over", canvas.handleMouseOver);
        canvas.on("mouse:move", canvas.handleMouseMove);
        canvas.on("mouse:up", canvas.handleMouseUp);

        // Special case because we unset selection on bg click
        canvas.on("mouse:down", this.handleMouseDown);

        // Store canvas selection in redux.
        // canvas.on("selection:cleared", this.clearCanvasSelection); // no-op
        canvas.on("selection:created", this.updateSelection);
        canvas.on("selection:updated", this.updateSelection);

        // Assign each rendered object a unique ID.
        canvas.on("object:added", this.handleObjectAdd);

        if (!window.canvas) window.canvas = {};
        canvas.requestRenderAll();
        window.canvas[canvasId] = canvas;
        this.resize();
    };

    componentDidUpdate = () => {
        const { dispatch, filter } = this.props;
        const canvas = this.getCanvasProps();
        if (!canvas) return;
        customizeCanvasStyle(canvas);

        if (filter.dirtyCanvas) {
            canvas.requestRenderAll();
            dispatch(setFilter({ dirtyCanvas: false }));
        }
    };

    getCanvasProps = () => {
        const { canvasId } = this.props;
        return getCanvas(canvasId);
    };

    handleObjectAdd = ({ target }) => {
        if (!target.uuid) target.set("uuid", uuid());
        customizeSelectionStyle(target);
        target.setCoords();
    };

    updateSelection = () => {
        const { dispatch, canvasId } = this.props;
        const canvas = this.getCanvasProps();
        if (!canvas) return;
        customizeSelectionStyle(canvas);
        const active = canvas.getActiveObject();
        const objects = canvas.getActiveObjects();
        let selection = objects.map((o) => o.uuid).sort();
        lockCanvasMovement(active);
        dispatch(setCanvasSelection({ canvasId, selection }));
        // this.updateMatchSelection(selection);
    };

    updateMatchSelection = (newSelection) => {
        const { canvasId } = this.props;
        if (canvasId !== "Source") return;
        if (!window.canvas) return;
        if (!window.vst.MATCH_RESULTS) return;

        const otherCanvasId = "Target";
        const matchHash = window.vst.MATCH_RESULTS.sourceTargetMap;
        const selection = newSelection.map((uuid) => matchHash[uuid]).flat();
        loadSelection(otherCanvasId, selection);
    };

    clearCanvasSelection = () => {
        // const { dispatch, canvasId } = this.props;
        // const canvas = this.getCanvasProps();
        // if (!canvas) return;
        // const active = canvas.getActiveObject();
        // unlockCanvasMovement(active);
        // canvas.discardActiveObject();
        // canvas.requestRenderAll();
        // dispatch(setCanvasSelection({ canvasId, selection: [] }));
    };

    loadData = ({ data, format }) => {
        const canvas = this.getCanvasProps();
        if (!data || !canvas) return;
        switch (format) {
            case "json":
                console.log("Loading json");
                canvas.loadFromJSON(data);
                console.error("This is not handled here anymore. Fix");
                break;
            case "svg":
                canvas.loadSVGData(data);
                break;
        }
    };

    resize = () => {
        const { canvasId } = this.props;
        const canvas = this.getCanvasProps();
        if (!canvas) return;
        canvas.discardActiveObject();
        customizeCanvasStyle(canvas);
        canvas.requestRenderAll();
        resizeCanvas({ id: canvasId, canvas, width: 8, height: 12 });
    };

    loadExample = (filename = "steps.svg") => {
        window.toastr.info(`Starting load: ${filename}`);

        // Clear old matching information
        window.vst = {};
        this.props.dispatch(setFilter({ matched: false }));

        const { canvasId } = this.props;
        const canvas = this.getCanvasProps();
        if (!canvas) return;
        const pre = filename.match("svg") ? "svg" : "mp";
        window
            .fetch(`${pre}/` + filename)
            .then(function (response) {
                if (!response.ok) {
                    console.log(response);
                } else {
                    return response.text();
                }
            })
            .then((data) => {
                if (pre === "svg") {
                    this.loadData({ data, format: "svg" });
                } else {
                    // Unpack and Loading VST State
                    try {
                        const { state } = JSON.parse(data);
                        const data = state.canvas[canvasId];
                        this.loadData({ data, format: "json" });
                    } catch (e) {
                        console.error(e);
                    }
                }
                customizeCanvasStyle(canvas);
                window.toastr.success(`Loaded example: ${filename}`);
            })
            .catch(function (error) {
                window.toastr.error(`Loading error`);
                console.error(error);
            });
    };

    exportSVG = () => {
        const canvas = this.getCanvasProps();
        if (!canvas) return;
        if (canvas.getObjects().length === 0) {
            window.toastr.warning(`Canvas is empty.`);
        } else {
            canvas.backgroundColor = "white";
            canvas.requestRenderAll();
            const svg = canvas.toSVG();
            downloadContent(`VST-${Date.now()}.svg`, svg);
            canvas.restoreBg();
        }
    };

    renderFile = (example, i) => {
        const { dispatch } = this.props;
        const { tag, files } = example;
        return (
            <div key={`example-file-${i}`}>
                {i !== 0 && <hr />}
                <p>{tag}</p>
                {files.map((filename, j) => {
                    return (
                        <Image
                            key={`example-${i}-${j}`}
                            alt={filename}
                            src={`svg/${filename}.png`}
                            className={`example-loader light-bg-highlight`}
                            onClick={() => {
                                this.loadExample(filename);
                                dispatch(setModal({ modalOpen: false }));
                            }}
                        />
                    );
                })}
            </div>
        );
    };

    toggleDarkMode = () => {
        const { darkMode } = this.state;
        const canvas = this.getCanvasProps();
        if (!canvas) return;

        if (darkMode) {
            canvas.brightenBg();
        } else {
            canvas.darkenBg();
        }

        this.setState({ darkMode: !darkMode });
    };

    handleMouseDown = (opt) => {
        const canvas = this.getCanvasProps();
        let evt = opt.e;
        if (evt.altKey === true) {
            canvas.isDragging = true;
            canvas.selection = false;
            canvas.lastPosX = evt.clientX;
            canvas.lastPosY = evt.clientY;
        } else if (opt.target == null) {
            this.clearCanvasSelection();
        }

        const { canvasId, filter } = this.props;
        let lastClick = this.lastClick;
        this.lastClick = Date.now();

        if (lastClick && this.lastClick - lastClick < 500) {
            var target = canvas.findTarget(opt);
            if (!target) return;
            if (canvasId == "Target") {
                this.props.dispatch(setFilter({ dirtySimilar: true }));
            } else if (canvasId == "Source" && filter.matched) {
                const sourceId = target.uuid; // target = clicked element
                const targetIds =
                    window.vst.MATCH_RESULTS.sourceTargetMap[sourceId];
                loadSelection(targetIds, "Target");
            }
        }
    };

    resetZoom = () => {
        const canvas = this.getCanvasProps();
        if (!canvas) return;
        canvas.resetZoom();
    };

    render() {
        const { className, canvasId } = this.props;
        return (
            <div className={""}>
                <div className={className} id={`parent-${canvasId}`}>
                    <ListHead>
                        {canvasId}
                        <div className="float-right">
                            <DimButton
                                children={<Icon name="lightbulb" />}
                                handleClick={this.toggleDarkMode}
                            />
                            {/* <DimButton
                                children={<Icon name="magnifying-glass" />}
                                handleClick={this.resetZoom}
                            /> */}
                        </div>
                    </ListHead>

                    <canvas id={canvasId} />
                </div>
            </div>
        );
    }
}

Canvas.defaultProps = {
    className: "sticky full-width",
};

function mapStateToProps(state) {
    const { filter } = state;
    return { filter };
}

const ConnectCanvas = connect(mapStateToProps)(Canvas);

export default ConnectCanvas;
