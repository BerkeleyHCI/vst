// util.js

import { googleFonts } from "./utils/google-fonts.js";
import hasher from "object-hash";
import DEFINED_TYPES from "./utils/definedTypes.js";
import mfabric from "fabric";
import { setFilter } from "./actions/index.js";
const { fabric } = mfabric;

export const canvasColor = {
    bright: "rgb(240, 240, 240)",
    dark: "rgb(50, 50, 50)",
};

export function getCanvas(canvasId) {
    if (!window.canvas || !window.canvas[canvasId]) {
        return false;
    } else {
        return window.canvas[canvasId];
    }
}

export function uuidToIdx(uuid) {
    let nodeIdx = -1;
    const results = window.vst.MATCH_RESULTS;
    nodeIdx = results.source_graph.nodes.findIndex((n) => n.uuid === uuid);
    if (nodeIdx >= 0) return nodeIdx;
    nodeIdx = results.target_graph.nodes.findIndex((n) => n.uuid === uuid);
    if (nodeIdx >= 0) return nodeIdx;
}

export function loadSelection(canvasId, ids = []) {
    const canvas = getCanvas(canvasId);
    if (!canvas) return;

    canvas.discardActiveObject();
    const objects = canvas.getObjects() || [];
    const targets = objects.filter((o) => ids.includes(o.uuid));

    let target;
    if (targets.length === 1) {
        target = targets[0];
    } else if (targets.length > 0) {
        target = new fabric.ActiveSelection(targets, { canvas });
        target.setCoords();
    } else if (targets.length === 0) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        return;
    }

    if (target) {
        canvas.setActiveObject(target);
        canvas.requestRenderAll();
    }
}

export const objectHash = (object) => {
    if (object == null) object = {};
    return hasher(object);
};

export const resizeCanvas = ({ id, canvas, width, height }) => {
    //  https: //stackoverflow.com/questions/17270168/fabricjs-always-center-object-on-canvas

    const CANVAS_W = width;
    const CANVAS_H = height;
    const CANVAS_WH_RATIO = CANVAS_W / CANVAS_H;

    const canvas_div = document.getElementById(`parent-${id}`);
    if (!canvas_div) return;

    const orig_w = canvas.width;
    const w = canvas_div.offsetWidth;
    const h = w / CANVAS_WH_RATIO;
    if (w === orig_w) return; // no update needed

    canvas.setWidth(w);
    canvas.setHeight(h);

    let i;
    const factor = w / orig_w;
    const objects = canvas.getObjects();
    for (i in objects) {
        const scaleX = objects[i].scaleX;
        const scaleY = objects[i].scaleY;
        const left = objects[i].left;
        const top = objects[i].top;

        const tempScaleX = scaleX * factor;
        const tempScaleY = scaleY * factor;
        const tempLeft = left * factor;
        const tempTop = top * factor;

        objects[i].scaleX = tempScaleX;
        objects[i].scaleY = tempScaleY;
        objects[i].left = tempLeft;
        objects[i].top = tempTop;

        objects[i].setCoords();
    }
    canvas.requestRenderAll();
    canvas.calcOffset();
};

export const arrayContains = (a, b) => {
    // Check whether array a contains all elements of array b
    return b.every((val) => a.includes(val));
};

// Correction method: take in a source element
export const fixSourceTarget = (sourceId, targetIds, dispatch) => {
    if (!window.vst || !window.vst.MATCH_RESULTS) return;
    let results = window.vst.MATCH_RESULTS;
    let fixes = window.vst.MATCH_FIXES || [];

    let oldTargetMatch = {};
    targetIds.forEach((t) => {
        if (results.targetSourceMap[t] == sourceId) return;
        results.sourceTargetMap[sourceId].push(t);
        let oldSource = results.targetSourceMap[t];
        oldTargetMatch[t] = oldSource;
        let oldSTMap = results.sourceTargetMap[oldSource];
        let filterST = oldSTMap.filter((id) => id !== t);
        results.sourceTargetMap[oldSource] = filterST;
        results.targetSourceMap[t] = sourceId;
    });

    // Logging corrected matches
    window.vst.MATCH_RESULTS = results;
    dispatch(setFilter({ dirtyStyle: true }));
    fixes.push({ sourceId, targetIds, oldTargetMatch });
    window.vst.MATCH_FIXES = fixes;
};

export const customizeCanvasStyle = (canvas) => {
    if (canvas != null) {
        // https://stackoverflow.com/questions/38821807/
        canvas.preserveObjectStacking = true;
        canvas.enableRetinaScaling = true;
        canvas.defaultCursor = "crosshair";
        canvas.hoverCursor = "pointer";

        // Custom drag selection style.
        canvas.selectionColor = "rgba(255, 0, 0, 0.1)";
        canvas.selectionBorderColor = "grey";
        canvas.selectionLineWidth = 0.5;
    }
};

export const customizeSelectionStyle = (canvas) => {
    let target = canvas;
    if (canvas.getActiveObject) target = target.getActiveObject(); // singular!
    if (target != null) {
        target.set({ borderColor: "#fbb802", cornerColor: "#fbb802" });
        target.cornerColor = "red";
        target.cornerStrokeColor = "red";
        target.borderColor = "rgba(255, 0, 0, 0.5)";
        target.hasRotatingPoint = false;
        target.cornerSize = 2;
        target.padding = 2;
    }
};

export const getType = (name, value) => {
    if (!name) return false;
    if (isObject(value)) {
        return "object";
    } else if (DEFINED_TYPES[name]) {
        return DEFINED_TYPES[name];
    } else if (isColor(name, value)) {
        return "color";
    } else if (isNumber(value)) {
        return "number";
    } else if (isString(value)) {
        return "string";
    } else {
        // console.warn(`Unknown type: `, { name, value });
        return false;
    }
};

export const isNumber = (test) => {
    return typeof test == "number";
};

export const isString = (test) => {
    return typeof test === "string";
};

export const isObject = (test) => {
    return typeof test === "object" && !Array.isArray(test) && test !== null;
};

export const lockCanvasTransform = (target) => {
    if (target != null) {
        // target.lockMovementX = true;
        // target.lockMovementY = true;
        target.lockScalingX = true;
        target.lockScalingY = true;
        target.lockUniScaling = true;
        target.lockRotation = true;
        target.hasControls = false;
    }
};

// Disallow movement - https://github.com/fabricjs/fabric.js/wiki/Preventing-object-modification
export const lockCanvasMovement = (target) => {
    // return; // re-enable movement
    if (target != null) {
        target.lockMovementX = true;
        target.lockMovementY = true;
        target.lockScalingX = true;
        target.lockScalingY = true;
        target.lockUniScaling = true;
        target.lockRotation = true;
        target.hasControls = false;
    }
};

// Re enable movement to allow for animation
export const unlockCanvasMovement = (target) => {
    if (target != null) {
        target.lockMovementX = false;
        target.lockMovementY = false;
        target.lockScalingX = false;
        target.lockScalingY = false;
        target.lockUniScaling = false;
        target.lockRotation = false;
    }
};

export const getXMLParser = () => {
    var parseXml;
    if (typeof window.DOMParser != "undefined") {
        parseXml = function (xmlStr) {
            return new window.DOMParser().parseFromString(xmlStr, "text/xml");
        };
    } else if (
        typeof window.ActiveXObject != "undefined" &&
        new window.ActiveXObject("Microsoft.XMLDOM")
    ) {
        parseXml = function (xmlStr) {
            var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async = "false";
            xmlDoc.loadXML(xmlStr);
            return xmlDoc;
        };
    } else {
        throw new Error("No XML parser found");
    }

    return parseXml;
};

export const getMaxMinStep = (name) => {
    let mms = {};

    // General
    if (name === "opacity") mms = { min: 0, max: 1, step: 0.01 };
    if (name === "padding") mms = { min: 0, max: 100, step: 1 };

    return mms;
};

export const cloneAndFit = (
    canvas,
    objects,
    options = { PERCENT_FILL: 90 },
    callback
) => {
    const { activeObj, PERCENT_FILL } = options;

    canvas.clear();
    canvas.backgroundColor = canvasColor.bright;

    // Fixing correction for semi-active offset.
    if (activeObj && activeObj._objects != null) {
        const activeIds = activeObj._objects.map((o) => o.uuid);
        objects = objects.map((o) => {
            if (activeIds.includes(o.uuid)) {
                o.set({
                    left: activeObj.left + activeObj.width / 2 + o.left,
                    top: activeObj.top + activeObj.height / 2 + o.top,
                });
            }

            return o;
        });
    }

    const svg = fabric.util.groupSVGElements(objects, options);

    // One object scaling seems to be off, special case
    let obj_width, obj_height;
    if (objects.length === 1) {
        obj_width = objects[0].width;
        obj_height = objects[0].height;
    } else {
        obj_width = svg.getScaledWidth();
        obj_height = svg.getScaledHeight();
    }

    const w_ratio = canvas.width / obj_width;
    const h_ratio = canvas.height / obj_height;
    const min_ratio = (PERCENT_FILL / 100) * Math.min(w_ratio, h_ratio);
    svg.scale(min_ratio);
    canvas.add(svg);
    svg.center();
    if (objects.length > 1) svg._restoreObjectsState();
    let items = svg._objects || [];
    if (objects.length > 1) canvas.remove(svg);

    for (let i = 0; i <= items.length; i++) {
        let item = items[i];
        if (!item) continue;
        canvas.add(item);
        item.setCoords();
    }

    canvas.calcOffset();

    // Selection
    if (callback) callback();
};

export const cloneList = (items = [], callback) => {
    items = items.filter((i) => !!i);
    const promises = items.map(
        (item) =>
            new Promise((resolve) => {
                item.clone((clone) => resolve(clone), ["uuid", "zOrder"]);
            })
    );

    Promise.all(promises).then(callback);
};

export const uniq = (a) => {
    let seen = {};
    return a.filter(function (item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
};

export const isColor = (name, value) => {
    if (name === "fill" || name === "stroke") {
        return true;
    }

    // Is a number, not a color
    if (!isNaN(value)) return false;

    // Otherwise, test color formats
    value = String(value).trim();
    var s = new Option().style;
    if (s.color == value) return true;
    if (name.toLowerCase().includes("color")) return true;
    if (/^#[0-9A-F]{6}$/i.test(value)) return true;
    if (/^#[0-9A-F]{3}$/i.test(value)) return true;
    if (/^rgb(.*)$/i.test(value)) return true;
    if (/^rgba(.*)$/i.test(value)) return true;
    return false;
};

// Handling color interpolation
// https://codepen.io/njmcode/pen/axoyD/?editors=0010
// Converts a #ffffff hex string into an [r,g,b] array
export const h2r = function (hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [
              parseInt(result[1], 16),
              parseInt(result[2], 16),
              parseInt(result[3], 16),
          ]
        : null;
};

// Inverse of the above
export const r2h = function (rgb) {
    return (
        "#" +
        ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2])
            .toString(16)
            .slice(1)
    );
};

// Interpolates two [r,g,b] colors and returns an [r,g,b] of the result
// Taken from the awesome ROT.js roguelike dev library at
// https://github.com/ondras/rot.js

export const interpolateColor = function (color1, color2, factor) {
    if (arguments.length < 3) {
        factor = 0.5;
    }
    var result = color1.slice();
    for (var i = 0; i < 3; i++) {
        result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
    }
    return result;
};

export const hex2Lux = (hex) => {
    const rgb = h2r(hex);
    const hsl = rgb2hsl(rgb);
    return hsl[2];
};

const rgb2hsl = function (color) {
    var r = color[0] / 255;
    var g = color[1] / 255;
    var b = color[2] / 255;

    var max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    var h,
        s,
        l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
            default:
                break;
        }
        h /= 6;
    }

    return [h, s, l];
};

function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
}

const hsl2rgb = function (color) {
    var l = color[2];

    if (+color[1] === 0) {
        l = Math.round(l * 255);
        return [l, l, l];
    } else {
        var s = color[1];
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        var r = hue2rgb(p, q, color[0] + 1 / 3);
        var g = hue2rgb(p, q, color[0]);
        var b = hue2rgb(p, q, color[0] - 1 / 3);
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
};

export const interpolateHSL = function (color1, color2, factor) {
    if (arguments.length < 3) {
        factor = 0.5;
    }
    var hsl1 = rgb2hsl(color1);
    var hsl2 = rgb2hsl(color2);
    for (var i = 0; i < 3; i++) {
        hsl1[i] += factor * (hsl2[i] - hsl1[i]);
    }
    return hsl2rgb(hsl1);
};

export const loadFont = async (font) => {
    let trimFont = "";
    try {
        // We already have the font, done
        trimFont = font.split(":")[0];
        trimFont = trimFont.replace(/\+/g, " ");
        if (window.isFontAvailable(trimFont)) {
            return;
        }
    } catch (e) {
        // console.log("Issue w/ loadFont", font, trimFont);
    }

    // Throws some not loaded issues. Finicky.
    let x;
    if (trimFont in googleFonts) {
        // console.log("Testing loadFont", font, trimFont);
        x = 1;
    } else {
        console.log("Ignore loadFont", font, trimFont);
        return;
    }

    // The world of fonts is paved with gold.
    // This may time out the site if already available
    try {
        console.log("Loading Google font: " + font, x);
        window.WebFont.load({
            ...window.WebFontConfig,
            timeout: 2000, // Set the timeout to two seconds
            google: { families: [font] },
        });
    } catch (e) {
        console.log(e.message, font);
    }
};

export const loadFonts = (fonts) => {
    // The world of fonts is paved with gold.
    try {
        const filterFonts = fonts.filter((font) =>
            document.fonts.check(`10px ${font}`)
        );
        if (filterFonts.length == 0) return;
        console.log("Loading Google font: " + filterFonts);
        window.WebFont.load({
            google: { families: filterFonts },
            // timeout: 2000, // Set the timeout to two seconds
        });
    } catch (e) {
        console.log(e.message, fonts);
    }
};
