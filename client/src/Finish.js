import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useContext } from 'react';
import { GlobalContext, SocketContext } from './Context.js';

const Finish = () => {
    const navigate = useNavigate();
    const context = useContext(GlobalContext);
    return (
        <div className="finish">
            <h1>Ranking</h1>
            {context.winner.rank.map((v) => (
                <p key={v} className="player-in-room">{v}</p>
            ))}
            <button
                onClick={()=>{
                    navigate('/');
                    context.setWinner("");
                }}
                className="btn"
            >
                go to start page
            </button>
        </div>
    );
}
export default Finish;