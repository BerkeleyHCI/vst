const filter = (state = {}, action) => {
    const { type, filter } = action;
    switch (type) {
        case "SET_FILTER":
            if ("localStyle" in filter);
            if ("localCanvas" in filter);
            return { ...state, ...filter };
        default:
            return state;
    }
};

export default filter;
