import { fabric } from "fabric";
import { canvasColor, customizeCanvasStyle } from "../util.js";

class CanvasStaticBase extends fabric.StaticCanvas {
    resizeObjectsToFitCanvas = (objects, options = {}) => {
        const { isSvg } = options;
        if (!objects) objects = this.getObjects();
        if (!isSvg) {
            this.requestRenderAll();
        }

        if (objects.length < 1) {
            return; // empty
        }

        const padding = 0.95; // lower is more padding

        // Grouping scaling zoom method only works with greater than 1 object
        const [obj] = objects;
        if (objects.length == 1 && obj.width > 0) {
            const w_ratio = this.getWidth() / obj.width;
            const h_ratio = this.getHeight() / obj.height;
            const min_ratio = Math.min(w_ratio, h_ratio);
            obj.scale(padding * min_ratio);
            obj.center();
            obj.setCoords();
            this.restoreBg();
            return;
        }

        const svg = fabric.util.groupSVGElements(objects, options);
        const w_ratio = this.getWidth() / svg.getScaledWidth();
        const h_ratio = this.getHeight() / svg.getScaledHeight();
        const min_ratio = Math.min(w_ratio, h_ratio);
        svg.scale(padding * min_ratio);
        this.add(svg);
        svg.center();
        svg._restoreObjectsState();
        let items = svg._objects;
        this.remove(svg);
        this.clear();

        let z = 0;
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (!item) continue;
            this.add(item);
            item.setCoords();
            item.zOrder = z++;
        }

        customizeCanvasStyle(this);
        this.calcOffset();
        this.restoreBg();
        this.setViewportTransform([1, 0, 0, 1, 0, 0]);
        this.requestRenderAll();
    };

    // Getting access to a specific item by Id.
    getItem = (id) => {
        var object = null;
        var objects = this.getObjects();
        for (var i = 0, len = this.size(); i < len; i++) {
            if (objects[i].uuid && objects[i].uuid === id) {
                object = objects[i];
                break;
            }
        }

        return object;
    };

    getObjectIds = () => {
        return this.getObjects().map((o) => o.uuid);
    };

    toggleDarkMode = () => {
        if (this.darkMode) {
            this.brightenBg();
        } else {
            this.darkenBg();
        }
    };

    brightenBg = () => {
        this.darkBG = false;
        this.backgroundColor = canvasColor.bright;
        this.requestRenderAll();
    };

    darkenBg = () => {
        this.darkBG = true;
        this.backgroundColor = canvasColor.dark;
        this.requestRenderAll();
    };

    restoreBg = () => {
        if (this.darkBG) {
            this.darkenBg();
        } else {
            this.brightenBg();
        }
    };
}

export default CanvasStaticBase;
