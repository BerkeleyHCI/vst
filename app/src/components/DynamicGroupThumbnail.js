import React, { Component } from "react";
import CanvasStaticBase from "./CanvasStaticBase.js";
import { isEqual } from "lodash";
import {
    cloneAndFit,
    cloneList,
    resizeCanvas,
    getCanvas,
    loadSelection,
    arrayContains,
} from "../util.js";

class DynamicGroupThumbnail extends Component {
    constructor(props) {
        super(props);
        this.state = { darkMode: false };
    }

    componentDidMount = () => {
        const id = this.props.givenId;
        let canvas = new CanvasStaticBase(id);
        window.addEventListener("resize", this.resize);
        if (!window.canvas) window.canvas = {};
        window.canvas[id] = canvas;
        this.scheduleUpdate();
        this.resize();
    };

    componentWillUnmount = () => {
        window.removeEventListener("resize", this.resize);
    };

    componentDidUpdate = () => {
        this.scheduleUpdate();
    };

    scheduleUpdate = () => {
        // Wait for the thumbnail to load, then customize it.
        const importId = this.props.canvasId;
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
        const { group, canvasId, active, selection } = this.props;
        const importId = canvasId;
        const canvas = this.getCanvasProps();
        const importCanvas = getCanvas(importId);
        if (!canvas || !importCanvas) return;

        // Getting elements in the group
        let newObj = [];
        if (active) {
            newObj = active;
        } else {
            const objects = importCanvas.getObjects();
            objects.forEach((o) => {
                if (o != null && group.includes(o.uuid)) newObj.push(o);
            });
        }

        // Get canvas, clear old selection
        const oldObj = canvas.getObjects();

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

            canvas.resizeObjectsToFitCanvas();
            return;
        }

        // Clear the selection to allow clean copying
        importCanvas.discardActiveObject();

        // Async clone elements onto canvas
        cloneList(newObj, (cloned) => {
            cloneAndFit(canvas, cloned);
            this.resize();
            canvas.resizeObjectsToFitCanvas();
            loadSelection(importId, selection);
        });
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

    getCanvasProps = () => {
        const { givenId } = this.props;
        return getCanvas(givenId);
    };

    resize = () => {
        const { width, height, givenId } = this.props;
        const id = givenId;
        const canvas = this.getCanvasProps();
        if (!canvas) return;
        resizeCanvas({ id, canvas, width, height });
    };

    render() {
        const { className, givenId } = this.props;
        const id = givenId;
        return (
            <div className={className} id={`parent-${id}`}>
                <canvas id={id} />
            </div>
        );
    }
}

DynamicGroupThumbnail.defaultProps = {
    className: "canvas-container",
    canvasId: "Source",
    givenId: "DynamicGroup",
    active: false,
    group: [],
    height: 80,
    width: 80,
};

export default DynamicGroupThumbnail;
