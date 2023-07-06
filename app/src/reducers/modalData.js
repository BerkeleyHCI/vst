const modalData = (state = {}, action) => {
    const { modalOpen, modalContent, modalTitle } = action;
    switch (action.type) {
        case "SET_MODAL":
            return { modalOpen, modalContent, modalTitle };
        default:
            return state;
    }
};

export default modalData;
