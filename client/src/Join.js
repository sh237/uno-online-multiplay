import { useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useContext } from 'react';
import { GlobalContext } from './Context.js';

const Join = () => {
    const context = useContext(GlobalContext);
    const navigate = useNavigate();
    function joinRoom() {
        const client_ = context.clientId.replace(/\s+/g, "");
        const room_ = context.roomId.replace(/\s+/g, "");
        //英数字チェックはできてない
        if (!context.clientId || !context.roomId) {
            alert("何か入力してください");
            return;
        } else if (client_!=context.clientId || room_!=context.roomId) {
            alert("スペースは含まないでください");
            return;
        }
        navigate('/Room')
    };
    return (
        <div className="Join">
            <h1>Welcome</h1>
            <p>enter id</p>
            <input value={context.clientId} onChange={(event) => context.setClientId(event.target.value)} />
            <p>enter room id</p>
            <input value={context.roomId} onChange={(event) => context.setRoomId(event.target.value)} />
            <br></br>
            
            <button onClick={joinRoom}>
                Join Room
            </button>

        </div>
    );
}

export default Join;
