import React, { Component, Fragment } from "react";
import { connect } from "react-redux";
import Modal from "react-modal";
import Canvas from "./Canvas.js";
import MyModal from "./Modal.js";
import NavigationBar from "./NavigationBar.js";
import MatchTab from "./MatchTab.js";
import StyleTab from "./StyleTab.js";
import StyleParameters from "./StyleParameters.js";
import "../style/app.css";
import "../style/toastr.css";
import "../utils/fontAvailable.js";

const appElement = document.getElementById("root");
Modal.setAppElement(appElement);

class App extends Component {
    constructor(props) {
        super(props);
        this.state = { webfont: false };
    }

    componentDidMount = () => {
        let fontInt = setInterval(() => {
            if (window.WebFont && window.WebFont.load) {
                clearInterval(fontInt);
                console.log("WebFont Ready");
                this.setState({ webfont: true });
            }
        }, 100);
    };

    render() {
        const { filter } = this.props;
        return (
            <div className="app">
                <NavigationBar />
                <MyModal />
                <div className="page-container v-margin row">
                    {this.state.webfont ? (
                        <Fragment>
                            <div className={`col-md-${3}`}>
                                <Canvas canvasId="Source" />
                            </div>

                            <div className={`col-md-${3}`}>
                                <Canvas canvasId="Target" />
                            </div>

                            <div className={`col-md-${3}`}>
                                <StyleTab />
                            </div>

                            <div className={`col-md-${3}`}>
                                <MatchTab />
                                {filter.matched && <StyleParameters />}
                            </div>
                        </Fragment>
                    ) : (
                        "loading"
                    )}
                </div>
            </div>
        );
    }
}

function mapStateToProps(state) {
    const { filter } = state;
    return { filter };
}

const ConnectApp = connect(mapStateToProps)(App);

export default ConnectApp;
