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
            context.setPlayerId("");
            socket.emit('leave_room', { room_name: context.roomId, player_name: context.playerName }, (error, data) => {});
            navigate('/');
        } else {
            return;
        }
    };

    // Serverにルームに入るためのメッセージを送信
    useEffect(() => {
        socket.emit(SocketConst.EMIT.JOIN_ROOM, { room_name: context.roomId, player: context.playerName }, (error, data) => {
            if (error) {
                console.log(error);
                alert("room is full or error");
                navigate('/');
            } else {
                context.setRoomId(data.room_name);
                context.setPlayerName(data.player);
                context.setPlayerId(data.your_id);
                console.log("data set : ", data);
            }
        });
        //サーバーから現在ルームにいるプレイヤー一覧を受信
        socket.on('currentPlayers', (data) => {
            const players_ = []
            data.map((v) => {
                players_.push(v.player_name);
            })
            setPlayers(players_);
            //console.log("currentplayer",players_);
        });

        //サーバーからゲームの開始を受信
        socket.on('startGame', () => {
            navigate('/Game');
        });

        //サーバーとの接続が切れたときの処理
        socket.on('disconnect', () => {
            socket.emit('delete_data', { data: { room_name: context.roomId, player: context.playerName } });
            navigate('/');
        });
        return () => {
            // componentWillUnmount のタイミングで実行したい処理を記述
            socket.off("currentPlayers");
            socket.off('startGame');
          }
    }, []);

    return (
        <div className="room">
            <h1>Room:{context.roomId}</h1>
            {players.map((v) => (
                <p key={v} className="player-in-room">{v}</p>
            ))}
            <button onClick={leaveRoom} className="btn">leave the room</button>
        </div>
    );
}

export default Room;


