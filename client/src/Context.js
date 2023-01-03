import { createContext, useState } from "react";

export const GlobalContext = createContext();

const Context = (props) => {
    const [clientId, setClientId] = useState("");
    const [roomId, setRoomId] = useState("");
    const value = {
        clientId,
        setClientId,
        roomId,
        setRoomId
    }
    return (
        <GlobalContext.Provider value={value}>
            {props.children}
        </GlobalContext.Provider>
    )
}
export default Context;