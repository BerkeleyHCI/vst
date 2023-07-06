import React, { Component } from "react";
import { connect } from "react-redux";
import { loadSelection } from "../util.js";

class ClickBinding extends Component {
    onClick = (e) => {
        const { ids, canvasId, selection } = this.props;
        const { shiftKey } = e;
        if (shiftKey) {
            const oldSelect = selection[canvasId];
            const newSelect = oldSelect.filter((id) => !ids.includes(id));
            loadSelection(canvasId, newSelect);
        } else {
            loadSelection(canvasId, ids);
        }
    };

    render() {
        const { children, className } = this.props;
        return (
            <div onClick={this.onClick} className={className}>
                {children}
            </div>
        );
    }
}

ClickBinding.defaultProps = {
    className: "thumbnail-container",
    canvasId: "Source",
};

function mapStateToProps(state) {
    const { selection } = state;
    return { selection };
}

const ConnectClickBinding = connect(mapStateToProps)(ClickBinding);

export default ConnectClickBinding;
