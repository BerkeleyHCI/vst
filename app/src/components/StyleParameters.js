import React, { Component, Fragment } from "react";
import { connect } from "react-redux";
import { groupBy, isEqual, debounce } from "lodash";
import { fabric } from "fabric";
import tinycolor from "tinycolor2";
import Parameter from "./Parameter.js";
import Button from "./Button.js";
import Input from "./Input.js";
import ClickBinding from "./ClickBinding.js";
import GroupThumbnail from "./GroupThumbnail.js";
import VALID_FIELDS from "../utils/validFields.js";
import { objectHash, getType, isObject } from "../util.js";
import { getCanvas, getMaxMinStep } from "../util.js";
import {
    setPreview,
    updatePreview,
    clearPreview,
    setFilter,
} from "../actions/index.js";

class StyleParameters extends Component {
    constructor(props) {
        super(props);
        this.state = {
            params: [],
            hotfixing: false,
            showHidden: false,
            sourceObjects: [],
            targetObjects: [],
            targetSelection: [],
        };
    }

    componentDidMount = () => {
        setTimeout(() => {
            this.scheduleMount({ first: true });
        }, 500); // force to style after first load
    };

    componentDidUpdate() {
        this.scheduleUpdate();
    }

    scheduleMount = (options = {}) => {
        const { first, targetFilter } = options;
        if (first) {
            this.clearPreview();
        }

        let interval = setInterval(() => {
            const sourceCanvas = getCanvas("Source");
            const targetCanvas = getCanvas("Target");
            if (!sourceCanvas || !targetCanvas) return;
            if (sourceCanvas.getObjectIds().length == 0) return;
            if (targetCanvas.getObjectIds().length == 0) return;
            console.log("Loading style parameters...");
            const objectIds = this.gatherObjectIds();
            this.gatherParams(objectIds);
            this.previewStyle({ targetFilter });
        }, 100);

        const clearInt = () => clearInterval(interval);
        setTimeout(clearInt, 1000);
    };

    gatherObjectIds = () => {
        const sourceCanvas = getCanvas("Source");
        const targetCanvas = getCanvas("Target");
        const sourceObjects = sourceCanvas.getObjectIds();
        const targetObjects = targetCanvas.getObjectIds();
        this.setState({ sourceObjects, targetObjects });
        return { sourceObjects, targetObjects };
    };

    gatherParams = (objectIds) => {
        const { sourceObjects, targetObjects } = objectIds;
        const targetParams = this.processParameters(targetObjects, "Target");
        const sourceParams = this.processParameters(sourceObjects, "Source");
        const params = this.mergePList(sourceParams, targetParams);
        this.setState({ params });
    };

    scheduleUpdate = () => {
        let { dispatch, givenId, filter } = this.props;
        const targets = this.getTargets();
        let oldTargets = this.state.targetSelection;

        if (this.state.hotfixing) {
            this.applyStyle("Styling");
            this.setState({ hotfixing: false });
            return;
        }

        // Recompute style from new match
        const equalTargets = isEqual(targets.sort(), oldTargets.sort());
        const dirty = filter.dirtyStyle;
        if (!dirty && equalTargets) return;

        // Mark not to enter infinite nesting.
        if (dirty) {
            this.scheduleMount({ targetFilter: true });
            dispatch(setFilter({ dirtyStyle: false }));
            return;
        }

        // Wait for the thumbnail to load, then customize it.
        let interval = setInterval(() => {
            const canvas = getCanvas(givenId);
            if (canvas) {
                let options = { hotfix: !dirty };
                this.previewStyle(options);
                clearInt();
            }
        }, 100);

        this.setState({ targetSelection: targets });
        const clearInt = () => clearInterval(interval);
        setTimeout(clearInt, 500);
    };

    // Reset the parent state filters back to baseSValue
    previewReset = () => {
        this.previewStyle({ reset: true });
    };

    // Apply ALL OF the copied parameters to the preview canvas.
    previewCopyAll = () => {
        this.previewStyle();
    };

    // Apply the copied parameters to the preview canvas.
    previewStyle = (
        options = { reset: false, hotfix: false, targetFilter: false }
    ) => {
        const { targetSelection } = this.props;
        // console.log({ options });
        const { reset, hotfix, targetFilter } = options;

        if (hotfix) {
            this.applyStyle("Styling");
            return;
        }

        let valueKey;
        if (reset) {
            valueKey = "baseTValue";
        } else {
            valueKey = "baseSValue";
        }

        const params = this.getFilteredParams();
        const objects = this.getObjectHash();
        if (params.length == 0 || !objects) return;

        let preview = {};
        params.forEach((param) => {
            const { name, patterns } = param;

            // Don't auto copy text
            if (name == "text") return;

            // Update parent grouping container style.
            let targets = param.patterns.map((p) => p.target);
            if (targetFilter) {
                targets = targets.filter((t) => targetSelection.includes(t));
            }

            if (targets.length == 0) return;
            let targetIdHash = objectHash(targets);
            const pName = `${name}_${targetIdHash}`;
            let paramValue = param[valueKey];

            // Updating individual element styles.
            preview[pName] = paramValue;
            patterns.forEach((pattern) => {
                if (targetFilter && !targetSelection.includes(pattern.target))
                    return;
                preview[`${name}_${pattern.target}`] = paramValue;
                const elem = objects[pattern.target];
                this.tryStyling(elem, name, paramValue);
            });

            // this.scheduleMount({ hotfix: true });
        });

        this.updatePreview(preview);

        const canvas = getCanvas(this.props.givenId);
        // if (canvas.zoom != 1) {
        //     canvas.resizeObjectsToFitCanvas();
        //     canvas.resetZoom();
        // }
        canvas.requestRenderAll();
    };

    tryStyling = (elem, name, value) => {
        let debug = true;
        if (!elem || !name) return;
        const initial = elem[name];
        if (initial === value) return;

        const setFabricType = (fObj) => {
            if (fObj.type == "gradient") {
                return new fabric.Gradient(fObj.value);
            } else if (fObj.type == "pattern") {
                return new fabric.Pattern(fObj.value);
            } else {
                console.error("unhandled fObj", fObj);
                return fObj;
            }
        };

        if (isObject(value)) {
            // console.log({ value });
            value = setFabricType(value);
            if (isEqual(elem[name], value)) return;
        }

        // These fields should not be set to null or 0
        const badNull = ["fontFamily", "fontSize", "lineHeight", "opacity"];
        if (badNull.includes(name)) {
            if (value == null || value == 0) return;
        }

        try {
            const canvas = getCanvas(this.props.givenId);
            elem.set(name, value);
            canvas.requestRenderAll();
        } catch {
            elem.set(name, initial);
            if (debug) console.error({ name, value, elem });
        }
    };

    applyStyle = (canvasId = "Target") => {
        // Paint the target elements with updated params.
        console.log("Apply Style:", canvasId);
        const { localStyle } = this.props.filter;
        const { preview, targetSelection } = this.props;
        const targetObjects = this.getObjectHash(canvasId);
        const targetRender = canvasId === "Target";

        Object.entries(preview).forEach((param) => {
            const [name, target] = param[0].split("_");
            if (
                !targetRender ||
                !localStyle ||
                targetSelection.includes(target)
            ) {
                const value = param[1];
                const elem = targetObjects[target];
                this.tryStyling(elem, name, value);
            }
        });

        // Dont change attributes that throw and issue on render.
        // Reset them to original value, add warning (non-repeat if poss)
        try {
            const canvas = getCanvas(canvasId);
            canvas.renderAll();
        } catch (e) {
            console.log(e);
        }

        if (targetRender) {
            this.scheduleMount();
        }
    };

    getObjectHash = (canvasId = this.props.givenId) => {
        const canvas = getCanvas(canvasId);
        if (!canvas) return {};
        let targetObjects = {};
        canvas.getObjects().forEach((o) => (targetObjects[o.uuid] = o));
        return targetObjects;
    };

    getTargets = () => {
        const { localCanvas } = this.props.filter;
        if (localCanvas) {
            // Use selected objects for styling
            return this.props.targetSelection;
        } else {
            // Use entire canvas for styling
            return this.state.targetObjects;
        }
    };

    toggleShowHidden = () => {
        let { showHidden } = this.state;
        this.setState({ showHidden: !showHidden });
    };

    setPreview = (preview) => {
        const { dispatch } = this.props;
        dispatch(setPreview(preview));
    };

    updatePreview = (args) => {
        const { dispatch } = this.props;
        dispatch(updatePreview(args));
    };

    // Update children preview params
    updatePreviewParam = (parameter) => {
        let preview = {};
        const { name, targets, value } = parameter;
        let targetIdHash = objectHash(targets);
        preview[`${name}_${targetIdHash}`] = value;
        targets.forEach((target) => {
            preview[`${name}_${target}`] = value;
        });

        this.updatePreview(preview);
        this.setState({ hotfixing: true });
    };

    bounceUpdateParam = debounce(this.updatePreviewParam, 200, {
        leading: true,
        trailing: false,
    });

    clearPreview = () => {
        const { dispatch } = this.props;
        dispatch(clearPreview());
    };

    // Take in a list of element ids and canvas
    // Return { [elem.uuid]: {trimmed parameters},...}
    processParameters = (elemIds, canvasId) => {
        // console.log({ elemIds, canvasId })
        const canvas = getCanvas(canvasId);
        if (!canvas) return [];

        let procParams = { params: {}, active: [] };

        // Getting elements in the group
        const objects = canvas.getObjects() || [];
        const active = objects.filter((o) => elemIds.includes(o.uuid));
        if (!active || active.length === 0) return procParams;

        const hashDump = (acc, cur) => {
            acc[cur[0]] = cur[1];
            return acc;
        };

        const fullParams = active
            .map(Object.entries)
            .map((o) => o.reduce(hashDump, {}));

        let trimParams = {};
        const MATCHES = ["cach", "global"];
        const MINC = (k) => !MATCHES.some((m) => k.toLowerCase().includes(m));
        fullParams.forEach((pList) => {
            const filtered = Object.keys(pList)
                .filter((key) => key[0] !== "_")
                .filter(MINC)
                .filter((key) => VALID_FIELDS.includes(key))
                .reduce((obj, key) => {
                    obj[key] = pList[key];
                    return obj;
                }, {});

            trimParams[pList.uuid] = filtered;
        });

        // console.log("trimParams", trimParams);
        return { params: trimParams, active };
    };

    // Take in two lists of parameters for source and target.
    // Return [{mergedParam},...]
    // mergedParam: { name, patterns: [sValue, tValue, source, target] }
    mergePList = (source, target) => {
        // console.log({ source, target });
        let pList = [];

        const getFabricType = (obj) => {
            if (!obj) {
                return null;
            } else if (Array.isArray(obj.gradientTransform)) {
                return "gradient";
            } else if (obj.source && obj.source.tagName == "CANVAS") {
                return "pattern";
            } else if (obj.type == "pattern") {
                return "pattern";
            } else {
                console.log({ obj });
                return null;
            }
        };
        const shorten = (name, value) => {
            const pType = getType(name, value);

            // const start = value;
            if (pType == "color") {
                if (!value) {
                    value = "transparent";
                } else if (value == "transparent") {
                    value = "transparent";
                } else {
                    return tinycolor(value).toHexString();
                }
            }

            if (pType == "object") {
                const obj = value.toObject ? value.toObject() : value;
                return { type: getFabricType(value), value: obj };
            }

            if (pType == "number") {
                if (value) {
                    value = +value.toFixed(2);
                } else {
                    value = 0;
                }
            }

            // console.log({ pType, start, value });
            return value;
        };

        // Enumerate over all target matches, attach source
        // Reattach elements that match to the param for preview.
        pList = Object.entries(target.params).map((tp) => {
            try {
                let targetId = tp[0];
                let sourceId =
                    window.vst.MATCH_RESULTS.targetSourceMap[targetId];
                let fullProps = JSON.parse(
                    JSON.stringify(source.params[sourceId])
                );

                Object.keys(fullProps).forEach((k) => (fullProps[k] = null));
                fullProps = Object.assign(fullProps, tp[1]);
                return Object.entries(fullProps).map((tpl) => {
                    const [name, value] = tpl;
                    let param = getMaxMinStep(name);
                    let rawSValue = source.params[sourceId][name];
                    param.name = name;
                    let tValue = shorten(name, value);
                    let sValue = shorten(name, rawSValue);
                    param.baseTValue = tValue;
                    param.baseSValue = sValue;
                    let pattern = {};
                    pattern.tValue = tValue;
                    pattern.sValue = sValue;
                    pattern.target = targetId;
                    pattern.source = sourceId;
                    param.patterns = [pattern];
                    return param;
                });
            } catch (e) {
                console.log(e);
            } // eslint-disable-line no-empty
        });

        // Also want to include any unique target-only attributes.
        // console.log({ pList });

        // Merge property listings that have similar matches.
        // Group similar source nameValues into patterns
        pList = pList.flat();
        pList = groupBy(pList, (p) => {
            if (isObject(p.patterns[0].tValue)) {
                let target = JSON.stringify(p.patterns[0].tValue);
                let source = JSON.stringify(p.patterns[0].sValue);
                return `${p.name} ${target} ${source}`;
            } else {
                return `${p.name} ${p.patterns[0].tValue} ${p.patterns[0].sValue}`;
            }
        });
        pList = Object.values(pList).map((p) =>
            p.reduce((acc, cur) => {
                if (!acc) acc = cur;
                else acc.patterns.push(cur.patterns[0]);
                return acc;
            }, false)
        );

        // Filter out equal source-target values
        pList = pList.map((p) => {
            if (p.baseSValue === p.baseTValue) p.sameValue = true;
            return p;
        });

        // Sort the parameter lists
        pList = pList.sort((a, b) => {
            if (a.sameValue === b.sameValue) {
                return a.name.localeCompare(b.name);
            } else {
                return a.sameValue ? 1 : -1;
            }
        });

        // Filter out image (pattern) fills - not supported yet
        pList = pList.filter(
            (p) =>
                p.name != "fill" ||
                (p.baseSValue.type !== "pattern" &&
                    p.baseTValue.type !== "pattern")
        );

        return pList || [];
    };

    getCurrentValue = (pName) => {
        const { preview } = this.props;
        return preview[pName];
    };

    handleFilterSelection = () => {
        const { dispatch, filter } = this.props;
        const localStyle = !filter.localStyle;
        dispatch(setFilter({ localStyle }));
    };

    getFilteredParams = () => {
        const { targetSelection, filter } = this.props;
        const { params } = this.state;

        if (!params) return [];

        // Clone object to avoid mutating state
        let modParams = JSON.parse(JSON.stringify(params));

        // Get locality scoping, filter out params for objects not shown
        const isTarget = (p) => targetSelection.includes(p.target);
        if (filter.localStyle) {
            modParams = modParams
                .map((param) => {
                    param.patterns = param.patterns.filter(isTarget);
                    return param;
                })
                .filter((param) => param.patterns.length > 0);
        }

        return modParams;
    };

    renderPropertyList = () => {
        // Conditional state update
        const { givenId } = this.props;
        let { showHidden } = this.state;

        // Clone object to avoid mutating state
        let modParams = this.getFilteredParams();
        return modParams.map((param) => {
            let targets = param.patterns.map((p) => p.target);
            let targetIdHash = objectHash(targets);
            const pName = `${param.name}_${targetIdHash}`;
            let parentClass = "clearfix ";
            let hideSimilar = !showHidden && param.sameValue;
            if (hideSimilar) parentClass += " hidden";
            let empty = param.patterns.length === 0;
            if (empty) parentClass += " hidden";
            const previewValue = this.getCurrentValue(pName);

            return (
                <div
                    className={parentClass}
                    key={`preview-parameter-parent-${targetIdHash}-${param.name}`}
                >
                    <ClickBinding
                        className="inline"
                        canvasId={"Target"}
                        ids={targets}
                    >
                        <GroupThumbnail
                            pre={`preview-small-${targetIdHash}-${param.name}`}
                            canvasId={"Target"}
                            className="no-margin float-left group-thumbnail "
                            group={targets}
                        />
                    </ClickBinding>
                    <Parameter
                        {...param}
                        value={previewValue}
                        target={targetIdHash}
                        targets={targets}
                        updateParameter={this.updatePreviewParam}
                        // updateParameter={this.bounceUpdateParam} // helps with color dragging, breaks numeric inputs
                        canvasId={givenId}
                    />
                </div>
            );
        });
    };

    handleStyleScope = () => {
        const { dispatch, filter } = this.props;
        const localStyle = !filter.localStyle;
        dispatch(setFilter({ localStyle }));
    };

    handleCanvasScope = () => {
        const { dispatch, filter } = this.props;
        const localCanvas = !filter.localCanvas;
        dispatch(setFilter({ localCanvas }));
    };

    render() {
        const { filter, targetSelection } = this.props;
        const { showHidden } = this.state;
        let pList = this.renderPropertyList();
        const showChild = showHidden ? " = " : " ≠  ";
        let filterText;
        const { localStyle, localCanvas } = filter;
        const scopeText = localCanvas ? "Show All" : "Show Targets";
        if (localStyle) {
            filterText = "Show All Styles";
        } else {
            filterText = "Filter By Selection";
        }

        const noSelect =
            filter.matched && filter.localStyle && targetSelection.length == 0;

        return (
            <Fragment>
                <hr className="dim" />
                {noSelect && (
                    <div
                        className="center padded"
                        onClick={this.handleStyleScope}
                    >
                        No targets selected yet. Click to show all target
                        styles.
                    </div>
                )}

                <div className="tiny clearfix mp-paramlist">
                    <div>
                        <div className="float-right">
                            <Button
                                className="small btn dimmer"
                                handleClick={this.previewReset}
                                children="Copy None"
                            />
                            <Button
                                className="small btn dimmer"
                                handleClick={this.previewCopyAll}
                                children="Copy All"
                            />
                        </div>
                        <div className={"clearfix animation-param no-hl"}>
                            <div>
                                <Button
                                    className="small btn dimmer"
                                    handleClick={this.toggleShowHidden}
                                    children={showChild}
                                />

                                <Button
                                    className="small btn dimmer"
                                    children={scopeText}
                                    handleClick={this.handleCanvasScope}
                                />

                                <Button
                                    className="small btn dimmer"
                                    handleClick={this.handleFilterSelection}
                                    children={filterText}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="clearfix">
                        <div className={"float-right"}>
                            <Input
                                className={"mp-header disabled noselect"}
                                readOnly={true}
                                disabled={true}
                                value="Source"
                            />
                            <Input
                                className={"mp-header disabled noselect"}
                                readOnly={true}
                                disabled={true}
                                value="Target"
                            />
                            <Input
                                className={"mp-header disabled noselect"}
                                readOnly={true}
                                disabled={true}
                                value="Current"
                            />
                            <Input
                                className={"mp-header disabled noselect"}
                                readOnly={true}
                                disabled={true}
                                value="Copied"
                            />
                        </div>
                    </div>

                    {pList}
                </div>
            </Fragment>
        );
    }
}

StyleParameters.defaultProps = {
    canvasId: "Target", // Which canvas you should apply edits to.
    givenId: "Styling", // Target canvasID for preview
    targetSelection: [],
    Target: [],
};

function mapStateToProps(state) {
    const { filter, selection, preview } = state;
    const { Target } = selection;
    return {
        filter,
        preview,
        targetSelection: Target,
    };
}

const ConnectStyleParameters = connect(mapStateToProps)(StyleParameters);

export default ConnectStyleParameters;
