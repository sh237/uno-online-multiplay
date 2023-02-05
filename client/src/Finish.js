import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useContext } from 'react';
import { GlobalContext, SocketContext } from './Context.js';

const Finish = () => {
    const navigate = useNavigate();
    const context = useContext(GlobalContext);
    return (
        <div className="finish">
            <h1>Winner</h1>
            <p>{context.winner}</p>
            <button onClick={()=>navigate('/')} className="btn">go to start page</button>
        </div>
    );
}
export default Finish;