import { useNavigate } from "react-router-dom";
import { useContext, createRef } from 'react';
import { GlobalContext } from './Context.js';

const Join = () => {
    const context = useContext(GlobalContext);
    const navigate = useNavigate();
    const textInput = createRef();
    function joinRoom() {
        const player_ = context.playerName.replace(/\s+/g, "");
        const room_ = context.roomId.replace(/\s+/g, "");
        if(!(player_.match(/^[A-Za-z0-9]*$/) && room_.match(/^[A-Za-z0-9]*$/))){
            alert("use alphabet or number");
            return;
        }
        if (!context.playerName || !context.roomId) {
            alert("enter something");
            return;
        } else if (player_ != context.playerName || room_ != context.roomId) {
            alert("don't include space");
            return;
        }
        navigate('/Room')
    };
    function onKeyDown1(e){
        if(e==="Enter"){
            textInput.current.focus();
        }
    }
    function onKeyDown2(e){
        if(e==="Enter"){
            joinRoom();
        }
    }
    return (
        <div className="join">
            <div className="login">
                <h1>Welcome</h1>
                <input 
                    value={context.playerName}
                    placeholder="useer name" 
                    autoFocus={true}
                    onChange={(event) => context.setPlayerName(event.target.value)} 
                    onKeyDown={(e) => onKeyDown1(e.key)} 
                />
                <br/>
                <input 
                value={context.roomId} 
                placeholder="room id"
                onChange={(event) => context.setRoomId(event.target.value)}
                ref={textInput}
                onKeyDown={(e) => onKeyDown2(e.key)} 
                />
                <br></br>

                <button onClick={joinRoom} className="btn">
                    Join Room
                </button>
            </div>
      </div>
    );
}

export default Join;
