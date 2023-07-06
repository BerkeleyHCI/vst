import React, { Component, Fragment } from "react";
import { connect } from "react-redux";
import Button from "./Button.js";
import { setFilter } from "../actions/index.js";
import DynamicGroupThumbnail from "./DynamicGroupThumbnail.js";
import {
    uniq,
    arrayContains,
    fixSourceTarget,
    getCanvas,
    loadSelection,
    uuidToIdx,
} from "../util.js";
import { isEqual } from "lodash";

// create a mathjs instance
import { create, all } from "mathjs";
const math = create(all);

const initialThreshold = 0.1;
class MatchCorrection extends Component {
    constructor(props) {
        super(props);
        this.inRef = React.createRef();
        this.state = {
            Similar: [],
            threshold: initialThreshold,
            targetScores: {},
            targetScoreList: [],
            matchBy: "Overall",
        };
    }

    componentDidMount = () => {
        this.computeTargetScores();
    };

    componentDidUpdate = () => {
        this.setSimilar();
    };

    computeTargetScores = () => {
        let simTable;
        let targetScores = {};
        const results = window.vst.TARGET_SIMILARITY;
        const types = ["Overall", "Shape", "Color", "Size"];
        types.forEach((matchBy) => {
            switch (matchBy) {
                case "Overall": // Walks
                    simTable = results.node_similarity;
                    break;
                case "Shape":
                    simTable = results.shape_similarity;
                    break;
                case "Color":
                    simTable = results.color_similarity;
                    break;
                case "Size":
                    simTable = results.size_similarity;
                    break;
                case "Text":
                    simTable = results.text_style_similarity;
                    break;
                default:
                    simTable = results.graphWalkScore;
            }

            if (!simTable) simTable = [[1]];

            // Normalize the scores, from similarity to difference (higher = more different).
            let targetScore = simTable.map((t_col) => {
                const maxScore = math.max(t_col);
                const negScore = math.multiply(t_col, -1);
                return math.add(negScore, maxScore);
            });

            targetScores[matchBy] = targetScore;
        });

        this.setState({ targetScores }, this.setSimilar);
    };

    min = (arr) => {
        if (arr.length === 0) {
            return 0;
        } else {
            return math.min(arr);
        }
    };

    setSimilar = (opts = {}) => {
        const { thresholdChange } = opts;
        const { Similar } = this.state;
        const { dispatch, filter, Target } = this.props;

        if (Target.length === 0 && Similar.length > 0)
            return this.setState({ Similar: [], threshold: initialThreshold });
        if (Target.length === 0) return;

        const { matchBy, threshold, targetScores } = this.state;
        const results = window.vst.MATCH_RESULTS;

        // This is the distance between target-target
        let diffTable = targetScores[matchBy];
        let graph = results.target_graph;

        // For each selected target, get closest match
        const targetIdx = Target.map((t) => uuidToIdx(t));
        let minDiffScores = {};
        graph.nodes.forEach((node) => {
            const t = node.uuid;
            const t_idx = uuidToIdx(t);
            const targetInc = (_, i) => targetIdx.includes(i);
            const filterDiff = diffTable[t_idx].filter(targetInc);
            const t_min = this.min(filterDiff);
            minDiffScores[t] = t_min;
        });

        let lowFilter = (kv) => kv[1].toFixed(3) <= threshold;
        let lowScores = Object.entries(minDiffScores).filter(lowFilter);

        const newSimilar = lowScores.map((kv) => kv[0]).sort();
        const targetScoreList = Object.values(minDiffScores)
            .sort((a, b) => a - b)
            .map((n) => (n.toString().length > 5 ? n.toFixed(3) : n))
            .map((n) => +n);

        if (!isEqual(newSimilar, Similar)) {
            let threshold;
            if (thresholdChange) {
                threshold = this.state.threshold; // keep it
            } else {
                threshold = initialThreshold;
            }

            // targets changed, reset threshold
            this.setState({
                threshold,
                Similar: newSimilar,
                targetScoreList,
            });
        }

        if (!filter.dirtySimilar) return;

        if (isEqual(newSimilar, Target)) {
            this.addThreshold();
        } else {
            this.confirmSimilar();
        }

        dispatch(setFilter({ dirtySimilar: false }));
    };

    addThreshold = (rev) => {
        let { targetScoreList } = this.state;
        let oldThreshold = this.state.threshold;
        let minThreshold = math.min(targetScoreList);
        let maxThreshold = math.max(targetScoreList);
        let myFilter = (t) => t > oldThreshold;
        if (rev) {
            targetScoreList = [...targetScoreList].sort((a, b) => b - a);
            myFilter = (t) => t < oldThreshold;
        }

        let newBound = targetScoreList.find(myFilter) || 0;
        let threshold;
        if (rev) {
            threshold = Math.min(oldThreshold, newBound);
        } else {
            threshold = Math.max(oldThreshold, newBound);
        }

        threshold = Math.max(minThreshold, threshold);
        threshold = Math.min(maxThreshold, threshold);
        if (threshold == minThreshold) {
            window.toastr.warning("Min. similarity");
        } else if (threshold == maxThreshold) {
            window.toastr.warning("Max. similarity");
        }

        if (threshold !== oldThreshold) {
            this.setState({ threshold }, () =>
                this.setSimilar({ thresholdChange: true })
            );
        }
    };

    subThreshold = () => {
        this.addThreshold(true);
    };

    confirmFixSelection = (selection) => {
        const { confirm, Source, dispatch } = this.props;

        let pass = true;
        let empty = false;
        if (Source.length > 1) {
            window.toastr.warning("Max 1 source element per match allowed");
            pass = false;
        }
        if (Source.length < 1) {
            window.toastr.warning("Must include 1 source element");
            pass = false;
            empty = true;
        }
        if (selection.length < 1) {
            window.toastr.warning("Must include at least 1 target element");
            pass = false;
            empty = true;
        }
        let fullMatch = window.vst.MATCH_RESULTS.sourceTargetMap[Source[0]];
        if (!empty && arrayContains(fullMatch, selection)) {
            window.toastr.warning("Source and targets are already matched.");
            pass = false;
        }

        if (pass) {
            confirm(Source[0], selection, dispatch);
            loadSelection("Target", selection);
            window.toastr.success("Match corrected");
        } else {
            return;
        }
    };

    confirmTarget = () => {
        this.confirmFixSelection(this.props.Target);
    };

    confirmSimilar = () => {
        const { Similar } = this.state;
        loadSelection("Target", Similar);
    };

    handleMatchBy = (e) => {
        const matchBy = e.target.value;
        this.setState(
            { matchBy, threshold: initialThreshold },
            this.setSimilar
        );
    };

    getOriginal = () => {
        const { Target } = this.props;
        const otsMap = window.vst.MATCH_RESULTS.original_targetSourceMap;
        if (otsMap) {
            return uniq(Target.map((t) => otsMap[t])).sort();
        } else {
            console.error("No original target source map");
            return [];
        }
    };

    renderThumbnails = (ids, canvasId, pre = "") => {
        const { Target } = this.props;
        let elems = [];
        let objects = [];
        const canvas = getCanvas(canvasId);
        if (canvas) objects = canvas.getObjects();

        objects.forEach((object) => {
            if (ids.includes(object.uuid)) elems.push(object);
        });

        const given = pre ? pre : canvasId;
        return (
            <DynamicGroupThumbnail
                givenId={given + "Selection"}
                selection={Target}
                canvasId={canvasId}
                active={elems}
            />
        );
    };

    render() {
        const { Similar } = this.state;
        // const { Similar, targetScoreList } = this.state;
        const { Source, Target } = this.props;
        let className = "v-margin clearfix ";
        const sourceThumbs = this.renderThumbnails(Source, "Source");
        const targetThumbs = this.renderThumbnails(Target, "Target");
        const similarThumbs = this.renderThumbnails(
            Similar,
            "Target",
            "Similar"
        );

        return (
            <div className={className}>
                <div className="row thumbnail-row">
                    <div className="col-md-4">
                        <div>Source ({Source.length})</div>
                        {sourceThumbs}
                    </div>
                    <div className="col-md-4">
                        <div>Target ({Target.length})</div>
                        {targetThumbs}
                    </div>
                    <div className="col-md-4">
                        <div>
                            Similar ({Similar.length})
                            {/* <Select
                                className="dimmer float-right"
                                ref={this.inRef}
                                name={"ScoreType"}
                                handleChange={this.handleMatchBy}
                                options={[
                                    "Overall",
                                    // "Element",
                                    // "Shape",
                                    "Color",
                                    "Size",
                                    // "Text",
                                    // "Type",
                                ]}
                            /> */}
                        </div>
                        {similarThumbs}
                    </div>
                </div>

                <div className="dimmer">
                    <span className="">
                        <Button
                            className="btn dimmer"
                            handleClick={this.confirmTarget}
                            // children="Match Source—Target"
                        >
                            {/* <Icon name="transfer" /> */}
                            Transfer Source Style to Target
                        </Button>
                        {Target.length > 0 && (
                            <Fragment>
                                {/* Similarity: {Similar.length}/
                                {targetScoreList.length} */}
                                <div className="btn-group">
                                    <Button
                                        className="btn dimmer"
                                        handleClick={() => this.subThreshold()}
                                    >
                                        <em> — </em>
                                    </Button>
                                    <Button
                                        className="btn dimmer"
                                        handleClick={this.confirmSimilar}
                                        children="Set"
                                    />
                                    <Button
                                        className="btn dimmer"
                                        handleClick={() => this.addThreshold()}
                                        children=" ＋ "
                                    />
                                </div>
                            </Fragment>
                        )}
                    </span>
                </div>
            </div>
        );
    }
}

MatchCorrection.defaultProps = {
    confirm: fixSourceTarget,
    matched: false,
    Source: [],
    Target: [],
    filter: {},
};

function mapStateToProps(state) {
    const { filter, selection } = state;
    const { matched } = filter;
    const { Source, Target } = selection;
    return {
        filter,
        matched,
        Source,
        Target,
    };
}

const ConnectMatchCorrection = connect(mapStateToProps)(MatchCorrection);

export default ConnectMatchCorrection;
