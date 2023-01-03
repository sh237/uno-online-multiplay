import { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useContext } from 'react';
import { GlobalContext, SocketContext } from './Context.js';

const Room=()=>{
    const context = useContext(GlobalContext);
    const socket = useContext(SocketContext);
    const navigate = useNavigate();  
    const clientId = context.clientId;
    const roomId = context.roomId;
    console.log(`clientId: ${clientId}  roomId: ${roomId}`);
    const [players, setPlayers] = useState([]);

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
    useEffect(() => {
        socket.emit(SocketConst.EMIT.JOIN_ROOM, { room_name: roomId, player: clientId}, (error, data) => {
            if (error) {
                console.log(error);
                alert("room is full or error");
                navigate('/');
            } else {
                current_information.room_name = data.room_name;
                current_information.player = data.player;
                console.log("data set : ", current_information);
            }
        });
    }, []);

    //サーバーとの接続が切れたときの処理
    socket.on('disconnect', () => {
        socket.emit('delete_data',{ data: { room_name: current_information.room_name, player: current_information.player}});
    });

    socket.on('currentPlayers', (data) => {
        const players_=[]
        data.map((v)=>{
            players_.push(v.player_name);
        })
        setPlayers(players_);
        console.log(players);
    });

    socket.on('startGame', () => {
        navigate('/Game');
    });

    return(
        <div className="Room">
            <h1>Room:{context.roomId}</h1>
            <ul>
                {players.map((v)=>(
                    <li key={v}>
                        {v}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Room;


