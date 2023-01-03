import { createContext, useState } from "react";

export const GlobalContext = createContext();
export const SocketContext = createContext();

const Context = (props) => {
    const io = require('socket.io-client');
    const port = 5000;
    const socket = io(`http://localhost:${port}`);
    const [clientId, setClientId] = useState("");
    const [roomId, setRoomId] = useState("");
    const value = {
        clientId,
        setClientId,
        roomId,
        setRoomId
    }
    //サーバーとの接続を受信
    socket.on('connection', () => {
        console.log('connect');
    });
    //サーバーとの接続が切れたときの処理
    socket.on('disconnect', () => {
        socket.emit('delete_data', { data: { room_name: roomId, player: clientId } });
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