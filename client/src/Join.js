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
    //デバッグ用
    const myCards=[{color:"red",number:0},{color:"red",special:"draw_2"},{color:"blue",number:1},{color:"blue",special:"skip"},{color:"green",special:"reverse"},{special:"wild"},{color:"yellow",number:1},{color:"black",special:"wild_draw_4"}];//,{color:"red",number:1},{color:"red",number:1},{color:"red",number:1},{color:"red",number:1},{color:"red",number:1},{color:"red",number:1},{color:"red",number:1},{color:"red",number:1},{color:"red",number:1},{color:"red",number:1},{color:"red",number:1},{color:"red",number:1},{color:"red",number:1},{color:"red",number:1},];
    function selectCard(v){
        console.log(v);
    };
    const playersCardList={1:3,2:4,3:5,4:6};
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
            {/*デバッグ用 */}
            <div className="player1 player-card">
                {myCards.map((v,i) => (
                    <div onClick={() => selectCard(v)} key={i} className={`card card-hover ${v.color}`}>
                        <div className="ellipse">
                            {(v.number || v.number==0) && <p className="number solid-shadow">{v.number}</p>}
                            {v.special=="draw_2" && <div>
                                <p className={`special-${v.special}-1`}></p>
                                <p className={`special-${v.special}-2`}></p>
                            </div>}
                            {v.special=="skip" && <div>
                                <p className={`special-${v.special}-1`}></p>
                                <p className={`special-${v.special}-2`}></p>
                            </div>}
                            {v.special=="reverse" && <div>
                                <p className={`special-${v.special}-1`}></p>
                                <p className={`special-${v.special}-2`}></p>
                                <p className={`special-${v.special}-3`}></p>
                                <p className={`special-${v.special}-4`}></p>
                            </div>}
                            {v.special=="wild_draw_4" && <div>
                                <p className={`special-${v.special}-1 yellow`}></p>
                                <p className={`special-${v.special}-2 blue`}></p>
                                <p className={`special-${v.special}-3 red`}></p>
                                <p className={`special-${v.special}-4 green`}></p>
                            </div>}
                            {v.special=="wild" && <div>
                                <p className={`special-${v.special}-1 red`}></p>
                                <p className={`special-${v.special}-2 blue`}></p>
                                <p className={`special-${v.special}-3 yellow`}></p>
                                <p className={`special-${v.special}-4 green`}></p>
                            </div>}
                            {v.special=="white_wild" && <div>
                                <p className={`special-${v.special}`}></p>
                            </div>}
                            {v.special=="wild_shuffle" && <div>
                                <p className={`special-${v.special} solid-shadow`}>shuffle</p>
                            </div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* <div className="player2 player-card">
                {myCards.map((v,i) => (
                    <div className="card black">
                        <div className="ellipse red">
                            <p className="logo solid-shadow">uno</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="player3 player-card">
                {myCards.map((v,i) => (
                    <div className="card black">
                        <div className="ellipse red">
                            <p className="logo solid-shadow">uno</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="player4 player-card">
                {myCards.map((v,i) => (
                    <div className="card black">
                        <div className="ellipse red">
                            <p className="logo solid-shadow">uno</p>
                        </div>
                    </div>
                ))}
            </div> */}
      </div>
    );
}

export default Join;
