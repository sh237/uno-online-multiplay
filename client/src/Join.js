import { useNavigate } from "react-router-dom";
import ReactDOM from 'react-dom'
import { useContext, createRef } from 'react';
import { GlobalContext } from './Context.js';

const Join = () => {
    const context = useContext(GlobalContext);
    const navigate = useNavigate();
    const textInput = createRef();
    function joinRoom() {
        const player_ = context.playerName.replace(/\s+/g, "");
        const room_ = context.roomId.replace(/\s+/g, "");
        //英数字チェックはできてない
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
        <div className="Join">
            <h1>Welcome</h1>
            <p>enter id</p>
            <input 
                value={context.playerName} 
                autoFocus={true}
                onChange={(event) => context.setPlayerName(event.target.value)} 
                onKeyDown={(e) => onKeyDown1(e.key)} 
            />
            <p>enter room id</p>
            <input 
            value={context.roomId} 
            onChange={(event) => context.setRoomId(event.target.value)}
            ref={textInput}
            onKeyDown={(e) => onKeyDown2(e.key)} 
            />
            <br></br>

            <button onClick={joinRoom}>
                Join Room
            </button>

        </div>
    );
}

export default Join;
