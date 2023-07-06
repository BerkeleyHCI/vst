import React, { Component } from "react";
import { fabric } from "fabric";
import { cloneAndFit, cloneList, objectHash } from "../util.js";
import { isEqual } from "lodash";
import { canvasColor } from "../util.js";

class GroupThumbnail extends Component {
    componentDidMount = () => {
        const { group, pre } = this.props;
        const id = pre + objectHash(group);
        const mountInterval = setInterval(() => {
            const base = fabric.util.getById(id);
            if (base) {
                clearInterval(mountInterval);
                let staticCanvas = new fabric.StaticCanvas(base);
                staticCanvas.backgroundColor = canvasColor.bright;
                this.canvas = staticCanvas;
                this.scheduleUpdate();
            }
        }, 300);
    };

    componentDidUpdate = () => {
        this.scheduleUpdate();
    };

    scheduleUpdate = () => {
        const canvas = this.canvas;
        if (!canvas) return;

        const { group, canvasId } = this.props;
        if (!window.canvas[canvasId]) return;

        // Check if dimensions are different => auto-reload.
        const { height, width } = this.props;
        let auto = canvas.height !== height || canvas.width !== width;
        if (auto) {
            canvas.backgroundColor = canvasColor.bright;
            canvas._setBackstoreDimension("height", height);
            canvas._setBackstoreDimension("width", width);
            canvas.setDimensions([], { cssOnly: false });
            canvas.calcOffset();
        }

        // Check animation status
        const myCanvas = window.canvas[canvasId];
        if (!myCanvas) return;

        // Getting elements in the group
        const objects = myCanvas.getObjects();
        let active = [];
        if (this.props.active) {
            active = this.props.active;
        } else {
            objects.forEach((o) => {
                if (o != null && group.includes(o.uuid)) active.push(o);
            });
        }

        // Checking element ids - if same, don't load new.
        const render = canvas.getObjects();
        const renderIds = render.map((o) => o.uuid).sort();
        const activeIds = active.map((o) => o.uuid).sort();
        if (!auto && isEqual(renderIds, activeIds)) return;

        // Async clone elements onto canvas
        cloneList(active, (cloned) => {
            cloneAndFit(canvas, cloned);
        });
    };

    render() {
        // return null
        const { pre, group, height, width, className } = this.props;
        const id = pre + objectHash(group);
        return (
            <canvas
                id={id}
                height={height}
                width={width}
                className={className}
            />
        );
    }
}

GroupThumbnail.defaultProps = {
    height: 25,
    width: 60,
    canvasId: "Source",
    className: "group-thumbnail",
    group: [],
    active: false,
    pre: "",
};

export default GroupThumbnail;
