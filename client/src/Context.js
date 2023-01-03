import { createContext, useState } from "react";

export const GlobalContext = createContext();
export const SocketContext = createContext();

const Context = (props) => {
    const io = require('socket.io-client');
    const port = 3002;
    const socket = io(`http://localhost:${port}`);
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
            <SocketContext.Provider value={socket}>
                {props.children}
            </SocketContext.Provider>
        </GlobalContext.Provider>
    )
}
export default Context;