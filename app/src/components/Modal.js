import React, { Component } from "react";
import Modal from "react-modal";
import { connect } from "react-redux";
import { setModal } from "../actions/index.js";

class MyModal extends Component {
    closeModal = () => {
        const { dispatch } = this.props;
        dispatch(setModal({ modalOpen: false, modalContent: "" }));
    };

    render() {
        const { modalOpen, modalContent, modalTitle } = this.props;
        return (
            <Modal
                onRequestClose={this.closeModal}
                className="Modal__Bootstrap modal-dialog"
                isOpen={modalOpen}
            >
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">{modalTitle}</h4>
                        <button
                            type="button"
                            onClick={this.closeModal}
                            className="close"
                        >
                            <span aria-hidden="true">&times;</span>
                            <span className="sr-only">Close</span>
                        </button>
                    </div>
                    <div className="modal-body">{modalContent}</div>
                </div>
            </Modal>
        );
    }
}

MyModal.defaultProps = {
    modalTitle: "Preview Transfer",
    modalContent: "",
    modalStatus: false,
};

const mapStateToProps = (state) => {
    const { modalData } = state;
    const { modalOpen, modalContent, modalTitle } = modalData;
    return { modalOpen, modalContent, modalTitle };
};

const ConnectMyModal = connect(mapStateToProps)(MyModal);

export default ConnectMyModal;
