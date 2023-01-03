import { createContext, useState } from "react";

export const GlobalContext = createContext();
export const SocketContext = createContext();

const Context = (props) => {
    const io = require('socket.io-client');
    const port = 3002;
    const socket = io(`http://localhost:${port}`);
    const [playerName, setPlayerName] = useState("");
    const [roomId, setRoomId] = useState("");
    const [playerId, setPlayerId] = useState("");
    const value = {
        playerName,
        setPlayerName,
        roomId,
        setRoomId,
        playerId,
        setPlayerId
    }
    //サーバーとの接続を受信
    socket.on('connection', () => {
        console.log('connect');
    });
    return (
        <GlobalContext.Provider value={value}>
            <SocketContext.Provider value={socket}>
                {props.children}
            </SocketContext.Provider>
        </GlobalContext.Provider>
    )
}
export default Context;