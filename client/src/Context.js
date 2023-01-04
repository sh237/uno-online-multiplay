import { createContext, useState,useEffect } from "react";

export const GlobalContext = createContext();
export const SocketContext = createContext();

const Context = (props) => {
    const io = require('socket.io-client');
    const port = 3002;
    const [playerName, setPlayerName] = useState("");
    const [roomId, setRoomId] = useState("");
    const [socket, setSocket] = useState();
    const [playerId, setPlayerId] = useState("");
    const value = {
        playerName,
        setPlayerName,
        roomId,
        setRoomId,
        playerId,
        setPlayerId
    }
    useEffect(() => {
        const socket_ = io(`http://localhost:${port}`);
        //サーバーとの接続を受信
        socket_.on('connection', () => {
            console.log('connect');
        });
        setSocket(socket_);
        return () => {
            socket_.off();
        };
    }, []);

    return (
        <GlobalContext.Provider value={value}>
            <SocketContext.Provider value={socket}>
                {props.children}
            </SocketContext.Provider>
        </GlobalContext.Provider>
    )
}
export default Context;