import React, { Component } from "react";
import { connect } from "react-redux";
import Button from "./Button.js";
import {
    setModal,
    setFilter,
    clearSelection,
    clearPreview,
} from "../actions/index.js";
import MatchDetail from "./MatchDetail.js";
import VSTHelp from "./VSTHelp.js";
import VSTExamples from "./VSTExamples.js";

const projectURL = "https://jeremywrnr.com/vst";

class NavigationBar extends Component {
    componentDidMount = () => {
        document.addEventListener("keydown", this.handleShortcutKeys);
    };

    componentWillUnmount = () => {
        document.removeEventListener("keydown", this.handleShortcutKeys);
    };

    handleShortcutKeys = (event) => {
        const { key } = event;

        if (key === "Escape") this.handleEscape();
        if (key === "Backspace" || key === "Delete") return this.handleDelete();
        if (key === "?") return this.handleHelpModal();

        // Need to press command keys to trigger these shortcuts
        if (!event.ctrlKey && !event.metaKey) return;

        switch (key.toLowerCase()) {
            case "f": // for match fixes
                event.preventDefault();
                this.handleStyleScope();
                break;
            case "o": // open files
                event.preventDefault();
                this.handleExamplesModal();
                break;
            case "h": // show app help
                event.preventDefault();
                this.handleHelpModal();
                break;
            case "d": // document scoping
                event.preventDefault();
                this.handleCanvasScope();
                break;
            case "z": // reset zoom for both canvases
                event.preventDefault();
                this.handleZoom();
                break;
            case "m": // for match details
                event.preventDefault();
                this.handleMatchView();
                break;
            default:
                // console.log(`Unhandled shortcut key: ${key}`);
                return;
        }
    };

    handleCanvasScope = () => {
        const { dispatch, filter } = this.props;
        const localCanvas = !filter.localCanvas;
        dispatch(setFilter({ localCanvas }));
    };

    handleStyleScope = () => {
        const { dispatch, filter } = this.props;
        const localStyle = !filter.localStyle;
        dispatch(setFilter({ localStyle }));
    };

    handleDelete = () => {
        ["Source", "Target"].forEach((id) => {
            if (!window.canvas || !window.canvas[id]) return;
            const active = window.canvas[id].getActiveObjects();
            active.forEach((a) => window.canvas[id].remove(a));
            window.canvas[id].discardActiveObject();
            window.canvas[id].resizeObjectsToFitCanvas();
            window.canvas[id].resetZoom();
        });
    };

    handleEscape = () => {
        // Close any open modals when escape is pressed
        const { dispatch, modalData } = this.props;
        if (modalData.modalOpen) {
            dispatch(setModal({ modalOpen: false }));
        }
    };

    handleZoom = () => {
        window.toastr.info(`Reset canvas zoom`);
        window.canvas["Source"].resetZoom();
        window.canvas["Target"].resetZoom();
        window.canvas["Styling"].resetZoom();
    };

    // view detailed match view
    handleMatchView = () => {
        const hasMatchState = this.props.filter.matched;
        if (!hasMatchState) {
            window.toastr.warning("No Match Information");
            return null;
        }

        const { dispatch } = this.props;
        const modalTitle = "Matched Elements";
        const matchList = <MatchDetail />;
        const modalContent = (
            <div>
                <div className="v-margin full-width clearfix"></div>
                <div className="row">{matchList}</div>
            </div>
        );

        if (this.props.modalData.modalOpen) {
            dispatch(setModal({ modalOpen: false }));
        } else {
            dispatch(setModal({ modalOpen: true, modalTitle, modalContent }));
        }
    };

    // load state here.
    handleSVGLoad = (file) => {
        let reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            try {
                const data = reader.result;
                const id = "Target"; // Only allow custom targeting for now.
                window.canvas[id].loadSVGData(data);
                window.toastr.success(`Loaded: ${file.name}`);
            } catch (e) {
                console.error(e);
            }

            // Clear old matching information
            window.vst = {};
            this.props.dispatch(setFilter({ matched: false }));
        };
    };

    handleStateLoad = (file) => {
        const { dispatch } = this.props;
        // Clear old matching information
        window.vst = {};
        dispatch(setFilter({ matched: false }));
        dispatch(clearPreview());

        let reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            try {
                let json_object = JSON.parse(reader.result);
                this.handleStateLoadJSON(json_object);
            } catch (e) {
                console.error(e);
            }
        };
    };

    // format: { source: canvasJSON, target: canvasJSON, match: matchJSON } },
    handleStateLoadJSON = (json_object) => {
        const { dispatch } = this.props;
        try {
            const { source, target, match } = json_object;

            if (source) {
                window.canvas["Source"].loadDirectJSON(source);
            }

            if (target) {
                window.canvas["Target"].loadDirectJSON(target);
            }

            let saved = "Opened: Canvas";
            if (match) {
                const vst = JSON.parse(match);

                // Adding in original st/ts mappings
                if (!vst.original_sourceTargetMap) {
                    vst.original_sourceTargetMap =
                        vst.MATCH_RESULTS.sourceTargetMap;
                    vst.original_targetSourceMap =
                        vst.MATCH_RESULTS.targetSourceMap;
                }

                const match_json = JSON.stringify(vst);
                localStorage.setItem("VST_Match", match_json);
                window.vst = vst;
                dispatch(setFilter({ matched: true }));
                saved += " and Matches";
            }

            window.toastr.success(saved);
        } catch (e) {
            console.error(e);
        }
    };

    handleExampleJSON = (filename) => {
        // Clear old matching information
        const { dispatch } = this.props;
        window.vst = {};
        dispatch(setModal({ modalOpen: false }));
        dispatch(clearSelection());
        dispatch(clearPreview());
        dispatch(
            setFilter({
                matched: false,
                localCanvas: false,
                localStyle: false,
            })
        );
        window.toastr.info(`Starting load: ${filename}`);
        window
            .fetch(`examples/` + filename)
            .then(function (response) {
                return response.text();
            })
            .then((data) => {
                try {
                    // Unpack and Loading VST State
                    const parsed = JSON.parse(data);
                    this.handleStateLoadJSON(parsed);
                } catch (e) {
                    console.error(e);
                }

                window.toastr.success(`Loaded example: ${filename}`);
            })
            .catch(function (error) {
                window.toastr.error(`Loading error`);
                console.error(error);
            });
    };

    clearLocalState = () => {
        window.toastr.success(`Cleared`);
        const { dispatch } = this.props;
        window.vst = {};
        dispatch(setFilter({ dirtyCanvas: true, matched: false }));
        dispatch(clearSelection());
        dispatch(clearPreview());

        // Manually iterate over canvases and clear them
        ["Source", "Target", "Styling"].forEach((id) => {
            window.canvas[id].clear();
            window.canvas[id].brightenBg();
        });
    };

    handleHelpModal = () => {
        const { dispatch } = this.props;
        const modalTitle = "VST Help";
        const vstHelp = <VSTHelp />;
        const modalContent = (
            <div>
                <div className="v-margin full-width clearfix"></div>
                <div className="row">{vstHelp}</div>
            </div>
        );

        if (this.props.modalData.modalOpen) {
            dispatch(setModal({ modalOpen: false }));
        } else {
            dispatch(setModal({ modalOpen: true, modalTitle, modalContent }));
        }
    };

    handleExamplesModal = () => {
        const { dispatch } = this.props;
        const modalTitle = "Load Example";
        const vstHelp = (
            <VSTExamples handleExampleJSON={this.handleExampleJSON} />
        );

        const modalContent = (
            <div>
                <div className="v-margin full-width clearfix"></div>
                <div className="row">{vstHelp}</div>
            </div>
        );

        if (this.props.modalData.modalOpen) {
            dispatch(setModal({ modalOpen: false }));
        } else {
            dispatch(setModal({ modalOpen: true, modalTitle, modalContent }));
        }
    };

    render() {
        const { title } = this.props;
        return (
            <nav className="navbar navbar-dark sticky-top">
                <a href={projectURL} target="_blank" className="navbar-brand">
                    <span className="navbar-brand">{title}</span>
                </a>
                <ul className="navbar-nav mr-auto"></ul>

                <Button handleClick={this.handleExamplesModal}>Open</Button>
                <Button handleClick={this.clearLocalState}>Clear</Button>
                <Button handleClick={this.handleHelpModal}>Help</Button>
            </nav>
        );
    }
}

NavigationBar.defaultProps = {
    title: "VST",
};

function mapStateToProps(state) {
    return state;
}

const ConnectNavigationBar = connect(mapStateToProps)(NavigationBar);

export default ConnectNavigationBar;
