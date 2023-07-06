import { isEqual } from "lodash";

const initial = {
    Source: [],
    Target: [],
};

const selectionReducer = (state = initial, action) => {
    const { canvasId, selection } = action;
    const sortSelect = (selection || []).sort();

    if (isEqual(state[canvasId], sortSelect)) {
        return state;
    }

    switch (action.type) {
        case "SET_CANVAS_SELECTION":
            return { ...state, [canvasId]: sortSelect };

        case "CLEAR_CANVAS_SELECTION":
            return initial;

        default:
            return state;
    }
};

export default selectionReducer;
