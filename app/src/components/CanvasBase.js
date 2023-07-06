import { fabric } from "fabric";

import {
    loadFont,
    // loadFonts,
    canvasColor,
    customizeCanvasStyle,
    getXMLParser,
} from "../util.js";
import { throttle } from "lodash";

//override toObject of fabric.Pattern
// https://stackoverflow.com/questions/49664514/fabricjs-saving-and-loading-dynamic-patterns-from-json-patternsourcecanvas
let toFixed = fabric.util.toFixed;
fabric.Pattern.prototype.toObject = function (propertiesToInclude) {
    let NUM_FRACTION_DIGITS = fabric.Object.NUM_FRACTION_DIGITS,
        source,
        object;
    if (typeof this.source === "function") {
        source = String(this.source);
    } else if (typeof this.source.src === "string") {
        source = this.source.src;
    } else if (typeof this.source === "object" && this.source.toDataURL) {
        source = this.source.toDataURL();
    }
    object = {
        type: "pattern",
        source: source,
        repeat: this.repeat,
        crossOrigin: this.crossOrigin,
        offsetX: toFixed(this.offsetX, NUM_FRACTION_DIGITS),
        offsetY: toFixed(this.offsetY, NUM_FRACTION_DIGITS),
        patternTransform: this.patternTransform
            ? this.patternTransform.concat()
            : null,
    };
    fabric.util.populateWithProperties(this, object, propertiesToInclude);
    return object;
};

fabric.Object.prototype.objectCaching = false;
fabric.Object.prototype.noScaleCache = true;
// fabric.Object.prototype.statefullCache = false;
// fabric.Object.prototype.needsItsOwnCache = false;

class CanvasBase extends fabric.Canvas {
    async loadImage(url) {
        return new Promise((resolve) => {
            return fabric.Image.fromURL(url, resolve);
        });
    }

    async loadPatterns(data) {
        const parser = getXMLParser();
        const parsed = parser(data);

        let fabricPatterns = {};
        let promises = Array.from(parsed.getElementsByTagName("pattern")).map(
            async (pattern) => {
                const [useRule] = Array.from(
                    pattern.getElementsByTagName("use")
                );

                if (!useRule) return;
                let imgId = useRule.getAttributeNS(
                    "http://www.w3.org/1999/xlink",
                    "href"
                );

                if (!imgId) return;
                if (imgId.startsWith("#")) imgId = imgId.substring(1);
                const imgElem = parsed.getElementById(imgId);
                let fabricImage;
                if (imgElem) {
                    fabricImage = await this.loadImage(imgElem.href.baseVal);
                }

                if (fabricImage) {
                    fabricPatterns[pattern.id] = fabricImage;
                } else {
                    console.error("No image found for pattern", pattern);
                }
            }
        );
        return Promise.all(promises).then(() => {
            return fabricPatterns;
        });
    }

    loadSVGData = async (data) => {
        console.log("Loading from SVG");
        this.clear();
        const fabricPatterns = await this.loadPatterns(data);
        this.min_ratio = 1.0;

        fabric.loadSVGFromString(data, (objects, options) => {
            const patternObjs = objects.filter(
                (o) =>
                    o.fill &&
                    typeof o.fill == "string" &&
                    o.fill.includes("url")
            );

            patternObjs.forEach((obj) => {
                const patternName = obj.fill
                    .trim()
                    .replace("url(#", "")
                    .replace(")", "");
                const img = fabricPatterns[patternName];
                if (img) {
                    img.scaleToHeight(obj.height);
                    let patternSourceCanvas = new fabric.StaticCanvas();
                    patternSourceCanvas.add(img);
                    patternSourceCanvas.setDimensions({
                        width: img.width,
                        height: img.height,
                    });
                    patternSourceCanvas.renderAll();
                    let pattern = new fabric.Pattern({
                        source: patternSourceCanvas.getElement(),
                    });
                    obj.fill = pattern;
                    this.renderAll();
                } else {
                    console.error("No image found for", obj);
                }
            });

            return this.resizeObjectsToFitCanvas(objects, {
                ...options,
                isSvg: true,
            });
        }),
            { crossOrigin: "anonymous" };
    };

    loadDirectJSON = (data) => {
        console.log("Loading from JSON");
        this.clear();
        try {
            const VST_STATE = JSON.parse(data);
            this.loadFromJSON(VST_STATE, () => {
                this.resizeObjectsToFitCanvas();
                customizeCanvasStyle(this);
            });
        } catch (e) {
            console.error(e, "Error loading JSON");
        }
    };

    resizeObjectsToFitCanvas = (objects, options = {}) => {
        const { isSvg } = options;
        if (!objects) objects = this.getObjects();
        if (!isSvg) {
            this.discardActiveObject();
            this.requestRenderAll();
        }

        if (objects.length < 1) return;

        const padding = 0.95; // lower is more padding

        // Grouping scaling zoom method only works with greater than 1 object
        const [obj] = objects;

        if (objects.length == 1 && obj.width > 0) {
            this.add(obj);
            const w_ratio = this.getWidth() / obj.width;
            const h_ratio = this.getHeight() / obj.height;
            const min_ratio = Math.min(w_ratio, h_ratio);
            obj.scale(padding * min_ratio);
            obj.center();
            obj.setCoords();
            this.resetZoom();
            this.restoreBg();
            this.requestRenderAll();
            return;
        }

        if (!this.min_ratio) {
            this.min_ratio = 1.0;
        }

        const svg = fabric.util.groupSVGElements(objects, options);
        const w_ratio = this.getWidth() / svg.getScaledWidth();
        const h_ratio = this.getHeight() / svg.getScaledHeight();
        const min_ratio = padding * Math.min(w_ratio, h_ratio);
        this.min_ratio *= min_ratio;
        svg.scale(min_ratio);
        this.add(svg);
        svg.center();
        svg._restoreObjectsState();
        let items = svg._objects;
        this.remove(svg);
        this.clear();

        let z = 0;
        this.toLoad = {};
        items.forEach((item) => {
            if (!item) return;
            if (item.type == "text" || item.type == "itext")
                item = this.processText(item);
            this.add(item);
            item.setCoords();
            item.zOrder = z++;
        });

        let toLoad = Object.keys(this.toLoad);
        toLoad.forEach((font) => loadFont(font));
        customizeCanvasStyle(this);
        this.calcOffset();
        this.restoreBg();
        this.setViewportTransform([1, 0, 0, 1, 0, 0]);
        this.requestRenderAll();
    };

    // Getting access to a specific item by Id.
    getItem = (id) => {
        let object = null;
        let objects = this.getObjects();
        for (let i = 0, len = this.size(); i < len; i++) {
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

    processText = (text) => {
        // Try to do something about the imported font.
        try {
            let fontList = `${text.fontFamily}`.split(","); // can have many fonts
            fontList.forEach((f) => {
                const orig_f = f;
                f = f.replace(/([a-z])([A-Z])/g, "$1+$2");
                f = f.replace(/-/g, ":");
                f = f.replace(/'/g, "");
                f = f.trim();
                this.toLoad[f] = true;

                // if the font has a split version, append the cleaned 'base' to the font as a backup
                if (f.includes(":")) {
                    let base_f = orig_f.replace(/([a-z])([A-Z])/g, "$1 $2");
                    let parts = base_f.split("-");
                    let base = parts[0].trim();
                    if (orig_f.endsWith(base)) return;
                    let newText = `${orig_f}, ${base}`;
                    text.set("fontFamily", newText);

                    if (parts.length == 1) return;
                    let style = parts[1].trim();
                    if (style.includes("Light"))
                        text.set("fontWeight", "light");
                    if (style.includes("Bold")) text.set("fontWeight", "bold");
                    if (style.includes("Italic"))
                        text.set("fontStyle", "italic");
                }
            });
        } catch (e) {
            console.error(e);
        }

        return text;
    };

    resetZoom = (options = {}) => {
        const { notify } = options;
        if (notify) window.toastr.success(`Reset canvas zoom`);
        this.resizeObjectsToFitCanvas(false);
        this.setViewportTransform([1, 0, 0, 1, 0, 0]);
        this.requestRenderAll();
    };

    // Zooming with mouse wheel
    handleScroll = (opt) => {
        let delta = opt.e.deltaY;
        let zoom = this.getZoom();
        zoom = zoom + delta / 100;
        if (zoom > 12) zoom = 12;
        if (zoom < 0.25) zoom = 0.25;
        this.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
        this.requestRenderAll();
        this.throttleRender();
    };

    // Throttling zoom render redraws
    throttleRender = throttle(this.requestRenderAll, 100);

    handleMouseOver = (opt) => {
        if (this.isDragging) {
            let e = opt.e;
            this.viewportTransform[4] += e.clientX - this.lastPosX;
            this.viewportTransform[5] += e.clientY - this.lastPosY;
            this.requestRenderAll();
            this.lastPosX = e.clientX;
            this.lastPosY = e.clientY;
        }
    };

    // Not used because we need to unset the selection when the background is clicked.
    // This requires the dispatch and canvasid to be in scope, which requires props.
    handleMouseDown = (opt) => {
        let lastClick = this.lastClick;
        this.lastClick = Date.now();
        if (lastClick && this.lastClick - lastClick < 500) {
            var target = this.findTarget(opt);
            if (!target) return;
        }
        let evt = opt.e;
        if (evt.altKey === true) {
            this.isDragging = true;
            this.selection = false;
            this.lastPosX = evt.clientX;
            this.lastPosY = evt.clientY;
        }
    };

    handleMouseMove = (opt) => {
        if (this.isDragging) {
            let e = opt.e;
            this.viewportTransform[4] += e.clientX - this.lastPosX;
            this.viewportTransform[5] += e.clientY - this.lastPosY;
            this.requestRenderAll();
            this.lastPosX = e.clientX;
            this.lastPosY = e.clientY;
        }
    };

    handleMouseUp = () => {
        this.isDragging = false;
        this.selection = true;
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

export default CanvasBase;
