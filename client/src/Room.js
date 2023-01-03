import { useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useContext } from 'react';
import { GlobalContext } from './Context.js';

const Room=()=>{
    const context = useContext(GlobalContext);
    const navigate = useNavigate();

    const io = require('socket.io-client');
    const port = 3002;
    const socket = io(`http://localhost:${port}`);
    const clientId = context.clientId;
    const roomId = context.roomId;
    console.log(`clientId: ${clientId}  roomId: ${roomId}`);

    const SocketConst = {
        EMIT: {
        JOIN_ROOM: 'join-room',
        },
    };

  
    socket.on('connection', () => {
        console.log('connect');
    });

    // Serverからメッセージを受信
    socket.on('server_to_client', (data) => {
        console.log(JSON.stringify(data.message));
    });

    let current_information = {room_name:"",player:""}

    // Serverにメッセージを送信
    socket.emit(SocketConst.EMIT.JOIN_ROOM, { room_name: roomId, player: clientId}, (error, data) => {
        if (error) {
            console.log(error);
        } else {
            current_information.room_name = data.room_name;
            current_information.player = data.player;
            console.log("data set : ", current_information);
        }
    });

    //サーバーとの接続が切れたときの処理
    socket.on('disconnect', () => {
        socket.emit('delete_data',{ data: { room_name: current_information.room_name, player: current_information.player}});
    });

    return(
        <div className="Room">
            <h1>Room:{context.roomId}</h1>
            
        </div>
    );
}

export default Room;


