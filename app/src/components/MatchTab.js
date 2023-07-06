import React, { Component, Fragment } from "react";
import { connect } from "react-redux";
import ListHead from "./ListHead.js";
import MatchCorrection from "./MatchCorrection.js";

class MatchTab extends Component {
    render() {
        const { matched } = this.props.filter;
        return (
            <Fragment>
                <ListHead className={"bot-margin"}>Customization</ListHead>
                {matched && <MatchCorrection />}
            </Fragment>
        );
    }
}

MatchTab.defaultProps = {
    className: "sticky full-width white-background",
    autoMatch: false,
};

function mapStateToProps(state) {
    const { filter } = state;
    return { filter };
}

const ConnectMatchTab = connect(mapStateToProps)(MatchTab);

export default ConnectMatchTab;
