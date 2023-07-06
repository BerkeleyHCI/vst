import React, { Component, Fragment } from "react";
import { isEqual } from "lodash";
import { DimButton } from "./Button.js";
import CanvasBase from "./CanvasBase.js";
import ListHead from "./ListHead.js";
import { setFilter } from "../actions/index.js";
import Icon from "./Icon.js";
import { downloadContent } from "./Downloader.js";
import {
    cloneAndFit,
    cloneList,
    lockCanvasTransform,
    customizeSelectionStyle,
    customizeCanvasStyle,
    resizeCanvas,
    getCanvas,
    loadSelection,
    arrayContains,
} from "../util.js";

class StyleCanvas extends Component {
    constructor(props) {
        super(props);
        this.state = {
            darkMode: false,
        };
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
        canvas.on("mouse:down", this.handleMouseDown);
        canvas.on("mouse:up", canvas.handleMouseUp);

        // Store canvas selection in redux.
        canvas.on("selection:created", this.updateSelection);
        canvas.on("selection:updated", this.updateSelection);
        canvas.on("selection:cleared", this.clearCanvasSelection);

        if (!window.canvas) window.canvas = {};
        canvas.requestRenderAll();
        window.canvas[canvasId] = canvas;
        this.scheduleUpdate();
        this.resize();
    };

    componentDidUpdate = () => {
        this.importSelection();
    };

    scheduleUpdate = () => {
        // Wait for the thumbnail to load, then customize it.
        const { importId } = this.props;
        let interval = setInterval(() => {
            const canvas = getCanvas(importId);
            if (canvas && canvas.getObjects().length > 0) {
                this.importSelection();
                clearInt();
            }
        }, 100);

        const clearInt = () => clearInterval(interval);
        setTimeout(clearInt, 3000);
    };

    importSelection = () => {
        const { content, selection, importId } = this.props;

        // Getting elements in the group
        const importCanvas = getCanvas(importId);
        if (!importCanvas) return;

        const objects = importCanvas.getObjects();
        const newObj = objects
            .filter((o) => o != null)
            .filter((o) => content.includes(o.uuid));

        // Get canvas, clear old selection
        const canvas = this.getCanvasProps();
        const oldObj = canvas.getObjects();
        canvas.discardActiveObject();

        // Checking element ids - if same, don't load new.
        const oldIds = oldObj.map((o) => o.uuid).sort();
        const newIds = newObj.map((o) => o.uuid).sort();
        const notEmpty = newIds.length > 0;
        if (isEqual(oldIds, newIds) && notEmpty) return;

        // Subset, fast delete elements from styling canvas
        if (arrayContains(oldIds, newIds) && notEmpty) {
            const toDelete = oldIds.filter((id) => !newIds.includes(id));
            toDelete.forEach((id) => {
                const elem = canvas.getItem(id);
                canvas.remove(elem);
            });

            if (newIds.length > 1) {
                canvas.resizeObjectsToFitCanvas();
                canvas.resetZoom();
            }

            canvas.requestRenderAll();
            return;
        }

        // Clear the selection to allow clean copying
        importCanvas.discardActiveObject();

        // Async clone elements onto canvas
        cloneList(newObj, (cloned) => {
            cloneAndFit(canvas, cloned);
            this.resize();
            canvas.resetZoom();
            loadSelection(importId, selection);
        });
    };

    getCanvasProps = () => {
        const { canvasId } = this.props;
        return getCanvas(canvasId);
    };

    updateSelection = () => {
        const canvas = this.getCanvasProps();
        customizeSelectionStyle(canvas);
        const active = canvas.getActiveObject();
        lockCanvasTransform(active);

        // Loading selection onto target
        const objects = canvas.getActiveObjects();
        let selection = objects.map((o) => o.uuid).sort();
        if (selection.length > 0) {
            loadSelection("Target", selection);
        }
    };

    clearCanvasSelection = () => {
        const canvas = this.getCanvasProps();
        canvas.discardActiveObject();
        canvas.requestRenderAll();
    };

    resize = () => {
        const { canvasId } = this.props;
        const canvas = this.getCanvasProps();
        if (!canvas) return;
        canvas.discardActiveObject();
        customizeCanvasStyle(canvas);
        canvas.requestRenderAll();
        const width = 8;
        const height = 12;
        resizeCanvas({ id: canvasId, canvas, width, height });
    };

    resetZoom = () => {
        const canvas = this.getCanvasProps();
        if (!canvas) return;
        canvas.resetZoom();
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

    // This requires the dispatch and canvasid to be in scope, which requires props.
    handleMouseDown = (opt) => {
        const canvas = this.getCanvasProps();
        const { dispatch } = this.props;
        let lastClick = this.lastClick;
        this.lastClick = Date.now();
        if (lastClick && this.lastClick - lastClick < 300) {
            var target = canvas.findTarget(opt);
            if (!target) return;
            dispatch(setFilter({ dirtySimilar: true }));
        }

        let evt = opt.e;
        if (evt.altKey === true) {
            canvas.isDragging = true;
            canvas.selection = false;
            canvas.lastPosX = evt.clientX;
            canvas.lastPosY = evt.clientY;
        } else if (opt.target == null) {
            loadSelection("Target", []);
        }
    };

    renderHead = () => {
        const { filter } = this.props;
        const { matched } = filter;

        return (
            <ListHead>
                Output
                <div className="float-right">
                    {matched && (
                        <Fragment>
                            <DimButton
                                children={<Icon name="lightbulb" />}
                                handleClick={this.toggleDarkMode}
                            />

                            <DimButton
                                children={"Download"}
                                handleClick={this.exportSVG}
                            />
                        </Fragment>
                    )}
                </div>
            </ListHead>
        );
    };

    render() {
        const head = this.renderHead();
        const { canvasId, filter, selection } = this.props;
        const noMatch = !filter.matched;
        const noSelect =
            !noMatch && filter.localCanvas && selection.length == 0;

        return (
            <div className="">
                {head}
                <div id={`parent-${canvasId}`}>
                    <canvas id={canvasId} />
                </div>

                {noSelect && (
                    <div
                        className="center padded"
                        onClick={this.handleCanvasScope}
                    >
                        No targets selected yet. Click to show all targets.
                    </div>
                )}
            </div>
        );
    }
}

StyleCanvas.defaultProps = {
    canvasId: "Styling", // name of this canvas
    importId: "Target", // which canvas we are styling
    selection: [],
    content: [],
};

export default StyleCanvas;
