import React, { Component } from "react";
import { connect } from "react-redux";
import Thumbnail from "./Thumbnail.js";
import { uuidToIdx } from "../util.js";

class MatchDetail extends Component {
    hasMatchState = () => {
        return this.props.filter.matched;
    };

    getMatchState = () => {
        if (this.hasMatchState()) {
            return window.vst.MATCH_RESULTS;
        } else {
            return {};
        }
    };

    renderMatches = () => {
        let output = this.getMatchState();
        let { sourceTargetMap } = output;
        const sourceTargetPairs = Object.entries(sourceTargetMap);
        if (sourceTargetPairs.length === 0) return null;
        const sorter = (a, b) => b[1].length - a[1].length;
        const sorted = sourceTargetPairs.sort(sorter);

        return (
            <div className="full-width">
                <div className="row light-bg-highlight v-margin">
                    <div className="match-result match-source">
                        <h4 clasName="h-margin">Source</h4>
                    </div>
                    <div className="match-result match-source">
                        <h4 clasName="h-margin">Target</h4>
                    </div>
                </div>
                {sorted.map(this.renderSourceMatch)}
            </div>
        );
    };

    renderSourceMatch = (sourceMatch) => {
        let output = this.getMatchState();
        let nodeSimilarity = output.node_similarity;
        let [sm, targetMatches] = sourceMatch;
        let s = uuidToIdx(sm);
        targetMatches = targetMatches.sort((a, b) => {
            let aIdx = uuidToIdx(a);
            let a_score = nodeSimilarity[aIdx][s];
            let bIdx = uuidToIdx(b);
            let b_score = nodeSimilarity[bIdx][s];
            return b_score - a_score;
        });

        const key = `matched-elements: ${sm}`;
        return (
            <div key={key} className="row light-bg-highlight v-margin">
                <div className="match-result match-source">
                    <Thumbnail clickFocus={true} id={sm} />
                </div>
                {targetMatches.map((t) => this.renderTargetMatch(sm, t))}
            </div>
        );
    };

    renderTargetMatch = (sm, targetMatch) => {
        let output = this.getMatchState();
        let nodeSimilarity = output.node_similarity;
        let s = uuidToIdx(sm);
        let t = uuidToIdx(targetMatch);

        let targetWeightList = {
            shape: output.shape_similarity[t][s],
            color: output.color_similarity[t][s],
            text_style: output.text_style_similarity[t][s],
            type: output.type_similarity[t][s],
            size: output.size_similarity[t][s],
        };
        let weights = Object.entries(targetWeightList);
        weights = weights.sort((a, b) => b[1] - a[1]);

        // let gks = output.graphWalkScore[t][s].toFixed(2);
        let sim = nodeSimilarity[t][s].toFixed(2);
        weights.unshift(["node", sim]);

        return (
            <div
                draggable={true}
                key={`me: ${sm + targetMatch}`}
                className="match-result match-target yellow-bg-highlight"
            >
                {/* <p>Score: {gks}</p> */}
                {/* <span>Score: {gks}</span> */}
                {/* <select className="edge-reason dimmer" defaultValue={0}>
                    {weights.map((w) => (
                        <option key={`wl-${sm + targetMatch + w[0]}`}>
                            {w[0]}: {w[1]}
                        </option>
                    ))}
                </select> */}
                <Thumbnail
                    canvasId="Target"
                    clickFocus={true}
                    id={targetMatch}
                />
            </div>
        );
    };

    render() {
        const { matched } = this.props.filter;
        if (!matched) {
            return <p>No Match Information</p>;
        } else {
            return this.renderMatches();
        }
    }
}

MatchDetail.defaultProps = {
    filter: {},
};

function mapStateToProps(state) {
    const { filter } = state;
    return { filter };
}

const ConnectMatchDetail = connect(mapStateToProps)(MatchDetail);

export default ConnectMatchDetail;
