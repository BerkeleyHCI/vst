import React, { Component } from "react";
import { connect } from "react-redux";

import StyleCanvas from "./StyleCanvas.js";

class StyleTab extends Component {
    hasMatchState = () => {
        return (
            this.props.filter.matched &&
            window.vst.MATCH_RESULTS &&
            window.vst.MATCH_RESULTS.sourceTargetMap
        );
    };

    getTarget = () => {
        if (!this.props.filter.matched) return [];
        const { filter, selection } = this.props;
        const { localCanvas } = filter;
        if (localCanvas) {
            return selection["Target"];
        } else if (this.hasMatchState()) {
            return Object.keys(window.vst.MATCH_RESULTS.targetSourceMap).sort();
        } else {
            return [];
        }
    };

    // Compute what the source selection is from the unique values of the target element matches
    getSource = (targets) => {
        if (!this.props.filter.matched) return [];
        let source = {};
        targets.forEach((targetId) => {
            let sourceId = window.vst.MATCH_RESULTS.targetSourceMap[targetId];
            source[sourceId] = true;
        });

        return Object.keys(source);
    };

    render() {
        const { dispatch, filter } = this.props;
        const { selection } = this.props;
        let targetContent = this.getTarget();
        let targetSelection = selection["Target"];

        return (
            <StyleCanvas
                filter={filter}
                dispatch={dispatch}
                selection={targetSelection}
                content={targetContent}
            />
        );
    }
}

function mapStateToProps(state) {
    const { selection, preview, filter } = state;
    return { selection, preview, filter };
}

const ConnectSelectionList = connect(mapStateToProps)(StyleTab);

export default ConnectSelectionList;
