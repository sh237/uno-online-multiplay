import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useContext } from 'react';
import { GlobalContext, SocketContext } from './Context.js';

const Room = () => {
    const context = useContext(GlobalContext);
    const socket = useContext(SocketContext);
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const SocketConst = {
        EMIT: {
            JOIN_ROOM: 'join-room',
        },
    };

    function leaveRoom() {
        const result = window.confirm('Are you sure?');
        if (result) {
            socket.emit('leave_room', { room_name: context.roomId, player_name: context.clientId }, (error, data) => {});
            navigate('/');
        } else {
            return;
        }
    };

    // Serverからメッセージを受信
    socket.on('server_to_client', (data) => {
        console.log(JSON.stringify(data.message));
    });

    // Serverにルームに入るためのメッセージを送信
    useEffect(() => {
        socket.emit(SocketConst.EMIT.JOIN_ROOM, { room_name: context.roomId, player: context.clientId }, (error, data) => {
            if (error) {
                console.log(error);
                alert("room is full or error");
                navigate('/');
            } else {
                context.setRoomId(data.room_name);
                context.setClientId(data.player);
                console.log("data set : ", context.roomId, context.clientId);
            }
        });
    }, []);

    //サーバーから現在ルームにいるプレイヤー一覧を受信
    socket.on('currentPlayers', (data) => {
        const players_ = []
        data.map((v) => {
            players_.push(v.player_name);
        })
        setPlayers(players_);
        console.log(players);
    });

    //サーバーからゲームの開始を受信
    socket.on('startGame', () => {
        navigate('/Game');
    });

    return (
        <div className="Room">
            <h1>Room:{context.roomId}</h1>
            <button onClick={leaveRoom}>
                leave the room
            </button>
            <ul>
                {players.map((v) => (
                    <li key={v}>
                        {v}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Room;


