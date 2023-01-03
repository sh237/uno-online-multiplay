import { useNavigate } from "react-router-dom";
import { useContext } from 'react';
import { GlobalContext } from './Context.js';

const Join = () => {
    const context = useContext(GlobalContext);
    const navigate = useNavigate();
    function joinRoom() {
        const player_ = context.playerName.replace(/\s+/g, "");
        const room_ = context.roomId.replace(/\s+/g, "");
        //英数字チェックはできてない
        if (!context.playerName || !context.roomId) {
            alert("何か入力してください");
            return;
        } else if (player_ != context.playerName || room_ != context.roomId) {
            alert("スペースは含まないでください");
            return;
        }
        navigate('/Room')
    };
    return (
        <div className="Join">
            <h1>Welcome</h1>
            <p>enter id</p>
            <input value={context.playerName} onChange={(event) => context.setPlayerName(event.target.value)} />
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
