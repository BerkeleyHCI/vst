const parameters = (state = {}, action) => {
    const { preview, update, parameter } = action;

    switch (action.type) {
        case "SET_PREVIEW":
            return preview;

        case "UPDATE_PREVIEW":
            return { ...state, ...update };

        case "UPDATE_PREVIEW_PARAM":
            const { name, target } = parameter;
            const pName = `${name}_${target}`;
            return { ...state, [pName]: parameter };

        case "CLEAR_PREVIEW":
            return {};

        default:
            // console.error("Unknown action type: ", action.type);
            return state;
    }
};

export default parameters;
