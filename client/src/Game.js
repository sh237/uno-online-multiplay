import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { GlobalContext, SocketContext } from './Context.js';

function Game() {
  const context = useContext(GlobalContext);
  const socket = useContext(SocketContext);
  const SocketConst = {
    EMIT: {
      //JOIN_ROOM: 'join-room',
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
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isSayUno, setIsSayUno] = useState(false);
  const [canPlayDrowCard,setCanPlayDrowCard] = useState(false);
  const [canSelectColor,setCanSelectColor] = useState(false);
  const [displayPointedNotSayUno,setDisplayPointedNotSayUno] = useState(false);
  const [pointedNotSayUnoResult,setPointedNotSayUnoResult] = useState("");
  const [sayUnoPlayer,setSayUnoPlayer] = useState("");
  const [countSpecialLogic,setCountSpecialLogic] = useState(10);
  const [winner, setWinner] = useState("");
  const [fieldCard, setFieldCard] = useState({ color: "", special: "", number: "" });
  const [playersCardList,setPlayersCardList] = useState({});

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
        setIsMyTurn(true);
      }
      setFieldCard(dataRes.first_card);
      setPlayersList(dataRes.play_order);
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
          let index = prevState.findIndex((card) => {
            return card.color == dataRes.card_play.color && card.special == dataRes.card_play.special && card.number == dataRes.card_play.number;
          });
          if(index!==-1){
            const arr = [...prevState];
            arr.splice(index, 1);
            return arr;
          }else{
            return prevState;
          }
        })
      }
    });
    
    socket.on(SocketConst.EMIT.DRAW_CARD, (dataRes) => {
      console.log("on:DRAW_CARD",dataRes);
      if(dataRes.player===context.playerId && dataRes.can_play_draw_card){
          //はいかいいえの応答をユーザーから受け付ける処理
          setCanPlayDrowCard(true);
      }
    });
    
    socket.on(SocketConst.EMIT.PLAY_DRAW_CARD, (dataRes) => {
      console.log("on:PLAY_DRAW_CARD",dataRes);
      if (dataRes.player === context.playerId && dataRes.card_play && dataRes.is_play_card){
        setMyCards(myCards.filter((card) => (card !== dataRes.card_play)));
      }
    });
    
    socket.on(SocketConst.EMIT.CHALLENGE, (dataRes) => {
      // if (dataRes.is_challenge) {
      //   if (dataRes.is_challenge_success) {
      //     console.log(`${dataRes.challenger} challenge successfully!`);
      //   } else {
      //     console.log(`${dataRes.challenger} challenge failed!`);
      //   }
      // } else {
      //   console.log(`${dataRes.challenger} no challenge.`);
      // }
    });
    
    socket.on(SocketConst.EMIT.PUBLIC_CARD, (dataRes) => {
      // console.log(`Public card of player ${dataRes.card_of_player}.`);
      // console.log(dataRes.cards);
    });
    
    socket.on(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD, (dataRes) => {
      //この時もplaycardイベント変えるならsetFieldとかは必要ない
      if(dataRes.yell_uno){
        setSayUnoPlayer(`${dataRes.player} yell UNO.`);
      }
    });

    socket.on(SocketConst.EMIT.SAY_UNO_AND_PLAY_DRAW_CARD, (dataRes) => {
      
    });
    
    socket.on(SocketConst.EMIT.POINTED_NOT_SAY_UNO, (dataRes) => {
      console.log("on:POINTED_NOT_SAY_UNO",dataRes);
      if(dataRes.have_say_uno){
        setPointedNotSayUnoResult(`${dataRes.player} have say UNO.`);
      }else{
        setPointedNotSayUnoResult(`${dataRes.player} no say UNO.`);
      }
    });
    
    socket.on(SocketConst.EMIT.FINISH_TURN, (dataRes) => {
      setWinner(dataRes.winner);
    });
    
    socket.on(SocketConst.EMIT.FINISH_GAME, (dataRes) => {
      // console.log(dataRes);
      // console.log(`Winner of game ${dataRes.winner}, turn win is ${dataRes.turn_win}.`);
    });
    
    socket.on(SocketConst.EMIT.NEXT_PLAYER, async (dataRes) => {
      console.log("on:NEXT_PLAYER",dataRes);
      //setFieldCard(dataRes.card_before);
      setIsMyTurn(true);
      if(dataRes.must_call_draw_card){
        //draw2とかもこれでok?
        sendDrawCard();
      }else{
        if (dataRes.next_player===context.playerId){
          
        }
      }
      setPlayersCardList(dataRes.number_card_of_player);
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
    }
  },[context.playerId]);

  
  
  //イベント送信用
  function sendColorOfWild(data) {
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
    //console.log(v);
    //自分のターンじゃない
    if(!isMyTurn){
      console.log("not my turn");
      return;
    }
    //カードが適切かの処理
    if(!(v.special===Special.WILD || v.special===Special.WILD_DRAW_4 || v.special===Special.WILD_SHUFFLE || v.special===Special.WHITE_WILD || v.color===fieldCard.color || v.number===fieldCard.number)){
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
  };

  function drawCard() {
    if(isMyTurn){
      sendDrawCard();
    }
  }
  //引いたカードを出すか出さないかの処理
  function whetherDrawCard(v){
    setCanPlayDrowCard(false);
    const data = { is_play_card: v };
    if(myCards.length==2 && isSayUno){
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

  return (
    <div className="Game">
      <p>field card:{fieldCard.color} {fieldCard.special} {fieldCard.number}</p>
      <button onClick={drawCard}>draw card</button>
      <button onClick={()=>{setIsSayUno(!isSayUno)}}>say uno</button>
      <button onClick={() => onSpecialLogic()}>special logic {countSpecialLogic}</button>
      <p>My turn : {isMyTurn ? "true" : "false"}</p>
      <p>say uno:{isSayUno ? "true" : "false"}</p>
      {sayUnoPlayer && <div>
        <p>{sayUnoPlayer}</p>
        <button onClick={setSayUnoPlayer("")}>close</button>
      </div>}
      
      <div>
        <p>pointed not say uno</p>
        <button onClick={()=>{setDisplayPointedNotSayUno(!displayPointedNotSayUno)}}>{!displayPointedNotSayUno ? "open" : "close"}</button>
        {displayPointedNotSayUno && <div>
          <p>select target player</p>
          {playersList.map((v)=>{
            if(v!=context.playerId){
              return <button onClick={()=>{onPointedNotSayUno(v)}} key={v}>{v}</button>
            }
          })
          }
        </div>}
        {pointedNotSayUnoResult && <div>
          <p>{pointedNotSayUnoResult}</p>
          <button onClick={setPointedNotSayUnoResult("")}>close</button>
        </div>}
      </div>
      {canPlayDrowCard && <div>
        <p>Do you play the card you drew?</p>
        <button onClick={()=>{whetherDrawCard(true)}}>yes</button>
        <button onClick={()=>{whetherDrawCard(false)}}>no</button>
      </div>}
      {canSelectColor && <div>
        <p>Do you play the card you drew?</p>
        <button onClick={()=>{selectColor(0)}}>red</button>
        <button onClick={()=>{selectColor(1)}}>yellow</button>
        <button onClick={()=>{selectColor(2)}}>gleen</button>
        <button onClick={()=>{selectColor(3)}}>blue</button>
      </div>}
      <ul>
        {myCards.map((v,i) => (
          <li onClick={() => selectCard(v)} key={i}>
            {v.color} {v.special} {v.number}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Game;
