import React, { useState, useEffect, useRef } from 'react';
import { useContext } from 'react';
import { GlobalContext, SocketContext } from './Context.js';
import { useNavigate } from "react-router-dom";

function Game() {
  const context = useContext(GlobalContext);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const SocketConst = {
    EMIT: {
      RECEIVER_CARD: 'receiver-card',
      FIRST_PLAYER: 'first-player',
      COLOR_OF_WILD: 'color-of-wild',
      SHUFFLE_WILD: 'shuffle-wild',
      NEXT_PLAYER: 'next-player',
      PLAY_CARD: 'play-card',
      DRAW_CARD: 'draw-card',
      PLAY_DRAW_CARD: 'play-draw-card',
      CHALLENGE: 'challenge',
      PUBLIC_CARD: 'public-card',
      SAY_UNO_AND_PLAY_CARD: 'say-uno-and-play-card',
      SAY_UNO_AND_PLAY_DRAW_CARD: 'say-uno-and-play-draw-card',
      POINTED_NOT_SAY_UNO: 'pointed-not-say-uno',
      SPECIAL_LOGIC: 'special-logic',
      FINISH_TURN: 'finish-turn',
      FINISH_GAME: 'finish-game',
      NOTIFY_CARD: 'notify-card',
      TIME_OUT: 'time-out',
    },
  };
  const Special = {
    SKIP: 'skip',
    REVERSE: 'reverse',
    DRAW_2: 'draw_2',
    WILD: 'wild',
    WILD_DRAW_4: 'wild_draw_4',
    WILD_SHUFFLE: 'wild_shuffle',
    WHITE_WILD: 'white_wild',
  };
  
  const Color = {
    RED: 'red',
    YELLOW: 'yellow',
    GREEN: 'green',
    BLUE: 'blue',
    BLACK: 'black',
    WHITE: 'white',
  };
  
  const DrawReason = {
    DRAW_2: 'draw_2',
    WILD_DRAW_4: 'wild_draw_4',
    BIND_2: 'bind_2',
    NOTING: 'nothing',
  };
  const SPECIAL_LOGIC_TITLE = '○○○○○○○○○○○○○○○○○○○○○○○○○○○○';
  const ARR_COLOR = [Color.RED, Color.YELLOW, Color.GREEN, Color.BLUE];
  const TIME_DELAY = 10;
  const [myCards, setMyCards] = useState([]);
  const [playersList, setPlayersList] = useState([]);
  const [playersCardList,setPlayersCardList] = useState({});
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isSayUno, setIsSayUno] = useState(false);
  const [canPlayDrawCard,setCanPlayDrawCard] = useState(false);
  const [canSelectColor,setCanSelectColor] = useState(false);
  const [isChallenge,setIsChallenge] = useState(false);
  const [pointedNotSayUnoResult,setPointedNotSayUnoResult] = useState("");
  const [sayUnoPlayer,setSayUnoPlayer] = useState("");
  const [countSpecialLogic,setCountSpecialLogic] = useState(10);
  const [fieldCard, setFieldCard] = useState({ color: "", special: "", number: "" });
  const [time, setTime] = useState(100);
  const [challengeResult, setChallengeResult] = useState("");
  const [displayPublicCard, setDisplayPublicCard] = useState({});
  const refTime = useRef(time);
  const refIsMyTurn = useRef(isMyTurn);
  const [playerNames, setPlayerNames] = useState({});

  useEffect(() => {
    refTime.current = time;
  }, [time]);
  useEffect(() => {
    refIsMyTurn.current = isMyTurn;
  }, [isMyTurn]);

  /**
  * 共通エラー処理
  * @param {string} event イベント名
  * @param {object} err エラーオブジェクト
  * @returns
  */
  function handleError(event, err) {
    if (!err) {
      return;
    }
    console.log(`${event} event failed!`);
    console.log(err);
  }
  useEffect(()=>{
    console.log("socket",socket);
    //サーバーからゲームの初期設定を受信
    socket.on(SocketConst.EMIT.FIRST_PLAYER, (dataRes) => {
      if(context.playerId===dataRes.first_player){
        // setIsMyTurn(true);
      }
      setFieldCard(dataRes.first_card);
      setPlayersList(dataRes.play_order);
      const playOrder=dataRes.play_order;
      const result = playOrder.indexOf(context.playerId);
      if(result!=-1){
        playOrder.splice(result,1);
      }
      const playersCardList_={}
      setPlayerNames(dataRes.player_names);
      playOrder.forEach((v) => {
        if(v!=context.playerId);
        playersCardList_[v]=[-1,-1,-1,-1,-1,-1,-1];
      });
      setPlayersCardList(playersCardList_);
    });

    socket.on(SocketConst.EMIT.NOTIFY_CARD,(dataRes)=>{
      console.log("NOTIFY_CARD",dataRes);
      setPlayersCardList((prevState) => {
        Object.keys(dataRes.cards).forEach((id)=>{
          if(id!=context.playerId){
            prevState[id]=[...Array(dataRes.cards[id])].map(() => -1);
          }
        })
        delete prevState[context.playerId];
        return prevState;
      });
      setFieldCard(dataRes.current_field);
    });

    socket.on(SocketConst.EMIT.TIME_OUT,(dataRes)=>{

    });

    //サーバーからカードを受け取る
    socket.on(SocketConst.EMIT.RECEIVER_CARD, (dataRes) => {
      console.log("on:receive-card-event", dataRes);
      if(Array.isArray(dataRes.cards_receive)){
        setMyCards((prevState)=>([...prevState,...dataRes.cards_receive]));
      }else{
        setMyCards((prevState)=>([...prevState,dataRes.cards_receive]));
      }
    });
    
    socket.on(SocketConst.EMIT.COLOR_OF_WILD, () => {
      //色を選ばせる処理
      setCanSelectColor(true);
    });
    
    socket.on(SocketConst.EMIT.SHUFFLE_WILD, (dataRes) => {
      //多分ここでカード枚数(playersCardList)壊れる
      if(Array.isArray(dataRes.cards_receive)){
        setMyCards([...dataRes.cards_receive]);
      }else{
        setMyCards([dataRes.cards_receive]);
      }
    });
    
    socket.on(SocketConst.EMIT.PLAY_CARD, (dataRes) => {
      console.log("on:PLAY_CARD",dataRes);
      setFieldCard(dataRes.card_play);
      if (dataRes.player === context.playerId && dataRes.card_play){
        setMyCards((prevState)=>{
          const index = prevState.findIndex((card) => {
            return card.color == dataRes.card_play.color && card.special == dataRes.card_play.special && card.number == dataRes.card_play.number;
          });
          if(index!==-1){
            const arr = [...prevState];
            arr.splice(index, 1);
            return arr;
          }else{
            return prevState;
          }
        });
      }// }else if (dataRes.player !== context.playerId && dataRes.card_play){
      //   setPlayersCardList((prevState) => {
      //     const arr = prevState[dataRes.player];
      //     arr.shift();
      //     return { ...prevState, [dataRes.player]: arr };
      //   });
      // }
    });
    
    socket.on(SocketConst.EMIT.DRAW_CARD, (dataRes) => {
      console.log("on:DRAW_CARD",dataRes);
      if(dataRes.player===context.playerId && dataRes.can_play_draw_card){
          //はいかいいえの応答をユーザーから受け付ける処理
          setCanPlayDrawCard(true);
      }// }else if(dataRes.player!==context.playerId && dataRes.is_draw){
      //   setPlayersCardList((prevState) => {
      //     const arr = prevState[dataRes.player];
      //     arr.push(0);
      //     return { ...prevState, [dataRes.player]: arr };
      //   });
      // }
    });
    
    socket.on(SocketConst.EMIT.PLAY_DRAW_CARD, (dataRes) => {
      console.log("on:PLAY_DRAW_CARD",dataRes);
      setFieldCard(dataRes.card_play);
      if (dataRes.player === context.playerId && dataRes.is_play_card){
        setMyCards((prevState)=>{
          const index = prevState.findIndex((card) => {
            return card.color == dataRes.card_play.color && card.special == dataRes.card_play.special && card.number == dataRes.card_play.number;
          });
          if(index!==-1){
            const arr = [...prevState];
            arr.splice(index, 1);
            return arr;
          }else{
            return prevState;
          }
        });
      }// }else if (dataRes.player !== context.playerId && dataRes.card_play){
      //   setPlayersCardList((prevState) => {
      //     const arr = prevState[dataRes.player];
      //     arr.shift();
      //     return { ...prevState, [dataRes.player]: arr };
      //   });
      // }
    });
    
    socket.on(SocketConst.EMIT.CHALLENGE, (dataRes) => {
      if (dataRes.is_challenge) {
        if (dataRes.is_challenge_success) {
          console.log(`${dataRes.challenger} challenge successfully!`);
          setChallengeResult(`${dataRes.challenger} challenge successfully!`);
        } else {
          console.log(`${dataRes.challenger} challenge failed!`);
          setChallengeResult(`${dataRes.challenger} challenge failed!`);
        }
      } else {
        console.log(`${dataRes.challenger} no challenge.`);
        setChallengeResult(`${dataRes.challenger} no challenge.`);
      }
      setTimeout(()=>{
        setChallengeResult("");
      },10000);
    });
    
    socket.on(SocketConst.EMIT.PUBLIC_CARD, (dataRes) => {
      console.log(`Public card of player ${dataRes.card_of_player}.`);
      console.log(dataRes.cards);
      setDisplayPublicCard(dataRes);
      setTimeout(()=>{
        setDisplayPublicCard({});
      },5000);
      // setPlayersCardList((prevState) => {
      //   prevState[dataRes.card_of_player]=dataRes.cards;
      //   return { ...prevState};
      // });
    });
    
    socket.on(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD, (dataRes) => {
      //この時もplaycardイベント変えるならsetFieldとかは必要ない
      if(dataRes.yell_uno){
        setSayUnoPlayer(`${dataRes.player} yell UNO.`);
        setTimeout(()=>{
          setSayUnoPlayer("");
        },5000);
      }
      if (dataRes.player === context.playerId && dataRes.card_play){
        setMyCards((prevState)=>{
          const index = prevState.findIndex((card) => {
            return card.color == dataRes.card_play.color && card.special == dataRes.card_play.special && card.number == dataRes.card_play.number;
          });
          if(index!==-1){
            const arr = [...prevState];
            arr.splice(index, 1);
            return arr;
          }else{
            return prevState;
          }
        });
      }
    });

    socket.on(SocketConst.EMIT.SAY_UNO_AND_PLAY_DRAW_CARD, (dataRes) => {
      if (dataRes.player === context.playerId && dataRes.card_play){
        setMyCards((prevState)=>{
          const index = prevState.findIndex((card) => {
            return card.color == dataRes.card_play.color && card.special == dataRes.card_play.special && card.number == dataRes.card_play.number;
          });
          if(index!==-1){
            const arr = [...prevState];
            arr.splice(index, 1);
            return arr;
          }else{
            return prevState;
          }
        });
      }
    });
    
    socket.on(SocketConst.EMIT.POINTED_NOT_SAY_UNO, (dataRes) => {
      console.log("on:POINTED_NOT_SAY_UNO",dataRes);
      if(dataRes.have_say_uno){
        setPointedNotSayUnoResult(`${dataRes.player} have say UNO.`);
      }else{
        setPointedNotSayUnoResult(`${dataRes.player} no say UNO.`);
      }
      setTimeout(()=>{
        setPointedNotSayUnoResult("");
      },5000);
    });
    
    socket.on(SocketConst.EMIT.FINISH_TURN, (dataRes) => {
      context.setWinner(dataRes.winner);
      navigate('/Finish');
    });
    
    socket.on(SocketConst.EMIT.FINISH_GAME, (dataRes) => {
      // console.log(dataRes);
      // console.log(`Winner of game ${dataRes.winner}, turn win is ${dataRes.turn_win}.`);
      context.setWinner(dataRes.winner);
      navigate('/Finish');
    });
    
    socket.on(SocketConst.EMIT.NEXT_PLAYER, async (dataRes) => {
      console.log("on:NEXT_PLAYER",dataRes);
      setMyCards(dataRes.card_of_player);
      if(dataRes.must_call_draw_card){
        if(dataRes.draw_reason==DrawReason.WILD_DRAW_4){
          setIsChallenge(true);
        }else{
          sendDrawCard();
        }
      }else{
        setIsMyTurn(true);
        timer();
      }
      setFieldCard(dataRes.card_before);
    });
    return () => {
      socket.off(SocketConst.EMIT.FIRST_PLAYER);
      socket.off(SocketConst.EMIT.RECEIVER_CARD);
      socket.off(SocketConst.EMIT.COLOR_OF_WILD);
      socket.off(SocketConst.EMIT.RECEIVER_CARD);
      socket.off(SocketConst.EMIT.PLAY_CARD);
      socket.off(SocketConst.EMIT.DRAW_CARD);
      socket.off(SocketConst.EMIT.PLAY_DRAW_CARD);
      socket.off(SocketConst.EMIT.CHALLENGE);
      socket.off(SocketConst.EMIT.PUBLIC_CARD);
      socket.off(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD);
      socket.off(SocketConst.EMIT.POINTED_NOT_SAY_UNO);
      socket.off(SocketConst.EMIT.FINISH_TURN);
      socket.off(SocketConst.EMIT.NEXT_PLAYER);
      socket.off(SocketConst.EMIT.NOTIFY_CARD);
      socket.off(SocketConst.EMIT.TIME_OUT);
      socket.off(SocketConst.EMIT.SHUFFLE_WILD);
      socket.off(SocketConst.EMIT.SPECIAL_LOGIC);
      socket.off(SocketConst.EMIT.FINISH_GAME); 
    }
  },[context.playerId]);

  
  
  //イベント送信用
  function sendColorOfWild(data) {
    console.log("emit:COLOR_OF_WILD");
    socket.emit(SocketConst.EMIT.COLOR_OF_WILD, data, (err) => {
      handleError(SocketConst.EMIT.COLOR_OF_WILD, err);
    });
  }
  
  function sendPlayCard(data) {
    console.log("emit:PLAY_CARD");
    socket.emit(SocketConst.EMIT.PLAY_CARD, data, (err) => {
      handleError(SocketConst.EMIT.PLAY_CARD, err);
    });
  }
  
  function sendDrawCard() {
    console.log("emit:sendDrawCard");
    socket.emit(SocketConst.EMIT.DRAW_CARD, {}, (err) => {
      handleError(SocketConst.EMIT.DRAW_CARD, err);
    });
  }
  
  function sendPlayDrawCard(data) {
    console.log("emit:sendPlayDrawCard");
    socket.emit(SocketConst.EMIT.PLAY_DRAW_CARD, data, (err) => {
      handleError(SocketConst.EMIT.PLAY_DRAW_CARD, err);
    });
  }

  function sendSayUnoAndPlayDrawCard(){
    socket.emit(SocketConst.EMIT.SAY_UNO_AND_PLAY_DRAW_CARD, {}, (err) => {
      handleError(SocketConst.EMIT.SAY_UNO_AND_PLAY_DRAW_CARD, err);
    });
  }
  
  function sendSayUnoPlayCard(data) {
    console.log(data);
    socket.emit(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD, data, (err) => {
      handleError(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD, err);
    });
  }

  function sendPointedNotSayUno(data) {
    console.log("emit:POINTED_NOT_SAY_UNO", data);
    socket.emit(SocketConst.EMIT.POINTED_NOT_SAY_UNO, data, (err) => {
      handleError(SocketConst.EMIT.POINTED_NOT_SAY_UNO, err);
    });
  }
  
  function sendChallenge(data) {
    console.log(`${SocketConst.EMIT.CHALLENGE} dataReq: `, data);
    socket.emit(SocketConst.EMIT.CHALLENGE, data, (err) => {
      handleError(SocketConst.EMIT.CHALLENGE, err);
    });
  }
  
  function sendSpecialLogic(data) {
    console.log(`${SocketConst.EMIT.SPECIAL_LOGIC} dataReq: `, data);
    socket.emit(SocketConst.EMIT.SPECIAL_LOGIC, data, (err) => {
      handleError(SocketConst.EMIT.SPECIAL_LOGIC, err);
    });
  }

  //
  function selectCard(v) {
    //console.log(v.special===Special.WILD , v.special===Special.WILD_DRAW_4 , v.special===Special.WILD_SHUFFLE , v.special===Special.WHITE_WILD , v.color===fieldCard.color , v.number===fieldCard.number);
    //自分のターンじゃない
    if(!isMyTurn){
      console.log("not my turn");
      return;
    }
    //カードが適切かの処理
    if(!(v.special===Special.WILD || v.special===Special.WILD_DRAW_4 || v.special===Special.WILD_SHUFFLE || v.special===Special.WHITE_WILD || v.color===fieldCard.color || (v.number!==null && fieldCard.number!==null && v.number===fieldCard.number) || (v.special!==null && fieldCard.special!==null && v.special===fieldCard.special))){
      console.log("invalid play card");
      return;
    }
    //カードを出せないように
    setIsMyTurn(false);
    //emit
    if (isSayUno){
      sendSayUnoPlayCard({ "card_play": { "number": v.number, "color": v.color, "special": v.special } });
    }else{
      sendPlayCard({ "card_play": { "number": v.number, "color": v.color, "special": v.special } });
    }
    setIsSayUno(false);
  };

  function drawCard() {
    setIsMyTurn(false);
    if(isMyTurn){
      sendDrawCard();
    }
  }
  //引いたカードを出すか出さないかの処理
  function whetherPlayDrawCard(v){
    setCanPlayDrawCard(false);
    const data = { is_play_card: v };
    console.log("myCards.length: " + myCards.length);
    console.log("isSayUno: " + isSayUno);
    console.log("v: " + v);
    if(myCards.length==2 && isSayUno && v){
      sendSayUnoAndPlayDrawCard();
    }
    sendPlayDrawCard(data);
  }
  //color-of-wildの色を選ぶ処理
  function selectColor(v){
    setCanSelectColor(false);
    const colorOfWild = ARR_COLOR[v];
    const data = { color_of_wild: colorOfWild };
    sendColorOfWild(data);
  }

  function onSpecialLogic(){
    if(countSpecialLogic==0){
      return
    }
    setCountSpecialLogic((prevState)=>(prevState-1));
    sendSpecialLogic({title:SPECIAL_LOGIC_TITLE});
  }

  function onPointedNotSayUno(v){
    const data = {target:v}
    sendPointedNotSayUno(data);
  }

  function whetherChallenge(v){
    const data={is_challenge:v};
    sendChallenge(data);
    setIsChallenge(false);
  }

  function timer(){
    console.log("timer start");
    setTime(100);
    const timerId = setInterval(()=>{
      if(refTime.current===-1){
        setIsMyTurn(false);
        console.log("EMIT.TIME_OUT");
        socket.emit(SocketConst.EMIT.TIME_OUT , {}, (err) => {
          handleError(SocketConst.EMIT.TIME_OUT, err);
        });
        clearInterval(timerId);
        setTime(100);
      }else if(!refIsMyTurn.current){
        clearInterval(timerId);
        setTime(100);
      }else if(refTime.current===0){
        setIsMyTurn(false);
        setTime(refTime.current-1);
      }else{
        setTime(refTime.current-1);
      }
    },1000);
  }

  return (
    <div className="game">
      <div className="field" style={{zIndex:"10"}}>
        <div className="Deck">
          <div onClick={drawCard} className="card black">
            <div className="ellipse red">
              <p className="logo solid-shadow">uno</p>
            </div>
          </div>
          <div className={`card ${fieldCard.color} `}>
            <div className="ellipse">
              {(fieldCard.number || fieldCard.number==0) && <p className="number solid-shadow">{fieldCard.number}</p>}
              {fieldCard.special=="draw_2" && <div>
                <p className={`special-${fieldCard.special}-1`}></p>
                <p className={`special-${fieldCard.special}-2`}></p>
              </div>}
              {fieldCard.special=="skip" && <div>
                <p className={`special-${fieldCard.special}-1`}></p>
                <p className={`special-${fieldCard.special}-2`}></p>
              </div>}
              {fieldCard.special=="reverse" && <div>
                <p className={`special-${fieldCard.special}-1`}></p>
                <p className={`special-${fieldCard.special}-2`}></p>
                <p className={`special-${fieldCard.special}-3`}></p>
                <p className={`special-${fieldCard.special}-4`}></p>
              </div>}
              {fieldCard.special=="wild_draw_4" && <div style={{height:'40px'}}>
                <p className={`special-${fieldCard.special}-1 yellow`}></p>
                <p className={`special-${fieldCard.special}-2 blue`}></p>
                <p className={`special-${fieldCard.special}-3 red`}></p>
                <p className={`special-${fieldCard.special}-4 green`}></p>
              </div>}
              {fieldCard.special=="wild" && <div style={{height:'40px'}}>
                <p className={`special-${fieldCard.special}-1 red`}></p>
                <p className={`special-${fieldCard.special}-2 blue`}></p>
                <p className={`special-${fieldCard.special}-3 yellow`}></p>
                <p className={`special-${fieldCard.special}-4 green`}></p>
              </div>}
              {fieldCard.special=="white_wild" && <div>
                <p className={`special-${fieldCard.special}`}></p>
              </div>}
              {fieldCard.special=="wild_shuffle" && <div>
                <p className={`special-${fieldCard.special} solid-shadow`}>shuffle</p>
              </div>}
            </div>
          </div>
          <div>
            <p style={{marginTop:"0"}}>My turn : {isMyTurn ? "true" : "false"}</p>
            <p style={{marginTop:"0"}}>say uno:{isSayUno ? "true" : "false"}</p>
            <p style={{marginTop:"0",color:'red'}}>Count Down : {time!==-1 ? time : 0}</p>
          </div>
        </div>

        <button onClick={()=>{setIsSayUno(!isSayUno)}}>say uno</button>
        {challengeResult && <p style={{color:"red"}}>{challengeResult}</p>}
        {sayUnoPlayer && <div>
          <p style={{color:"red"}}>{sayUnoPlayer}</p>
        </div>}
        
        <div>
          {pointedNotSayUnoResult && <div>
            <p style={{color:"red"}}>{pointedNotSayUnoResult}</p>
          </div>}
        </div>
        {canPlayDrawCard && <div>
          <p style={{color:"red"}}>Do you play the card you drew?</p>
          <button onClick={()=>{whetherPlayDrawCard(true)}}>yes</button>
          <button onClick={()=>{whetherPlayDrawCard(false)}}>no</button>
        </div>}
        {canSelectColor && <div>
          <p style={{color:"red"}}>Select color</p>
          <button onClick={()=>{selectColor(0)}}>red</button>
          <button onClick={()=>{selectColor(1)}}>yellow</button>
          <button onClick={()=>{selectColor(2)}}>gleen</button>
          <button onClick={()=>{selectColor(3)}}>blue</button>
        </div>}
        {isChallenge && <div>
          <p style={{color:"red"}}>Do you challenge?</p>
          <button onClick={()=>{whetherChallenge(true)}}>yes</button>
          <button onClick={()=>{whetherChallenge(false)}}>no</button>
        </div>}
      </div>

      <div className="player1 player-card">
        {myCards.map((v,i) => (
          <div onClick={() => selectCard(v)} key={i} className={`card card-hover ${v.color || "black"}`} style={{marginLeft:"-30px",zIndex:i+1}}>
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
              {v.special=="wild_draw_4" && <div style={{height:'40px'}}>
                <p className={`special-${v.special}-1 yellow`}></p>
                <p className={`special-${v.special}-2 blue`}></p>
                <p className={`special-${v.special}-3 red`}></p>
                <p className={`special-${v.special}-4 green`}></p>
              </div>}
              {v.special=="wild" && <div style={{height:'40px'}}>
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

      {Object.keys(playersCardList).map((key,i) => (
        <div className={`player${i+2} `}>
          <div style={{marginBottom:'10px'}}>
            <p style={{display:'inline',marginRight:'30px'}}>ID : {playerNames[key]}</p>
            <button style={{display:'inline-block'}} onClick={()=>{onPointedNotSayUno(key)}}>pointed not say uno</button>
          </div>
        <div key={i} className={`player-card`}>
          {playersCardList[key].map((v,i)=>(
            <div className="card black" style={{marginBottom:"-60px",marginLeft:"-30px",zIndex:i+1}}>
              <div className="ellipse red">
                <p className="logo solid-shadow">uno</p>
              </div>
            </div>
          ))}
        </div>
        </div>
      ))}
          
      {Object.keys(displayPublicCard).length>0 && <div id="fullOverlay">
        <h2 style={{color:"red"}}>Card of player {displayPublicCard.card_of_player}</h2>
        <div className="player-card">
        {displayPublicCard.cards.map((v,i) => (
            <div key={i} className={`card ${v.color || "black"}`}>
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
                {v.special=="wild_draw_4" && <div style={{height:'40px'}}>
                  <p className={`special-${v.special}-1 yellow`}></p>
                  <p className={`special-${v.special}-2 blue`}></p>
                  <p className={`special-${v.special}-3 red`}></p>
                  <p className={`special-${v.special}-4 green`}></p>
                </div>}
                {v.special=="wild" && <div style={{height:'40px'}}>
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
      </div>}
    </div>
  )
}

export default Game;
