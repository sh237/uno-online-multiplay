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
      POINTED_NOT_SAY_UNO: 'pointed-not-say-uno',
      SPECIAL_LOGIC: 'special-logic',
      FINISH_TURN: 'finish-turn',
      FINISH_GAME: 'finish-game',
    },
  };
  const [myCards, setMyCards] = useState([]);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isNext, setIsNext] = useState(false);
  const [isSayUno, setIsSayUno] = useState(false);
  const [fieldCard, setFieldCard] = useState({ color: "", special: "", number: "" });

  //サーバーからゲームの初期設定を受信
  socket.on(SocketConst.EMIT.FIRST_PLAYER, (data) => {
    console.log("first-player-event", data);
    if(context.playerId===data.first_player){
      setIsMyTurn(true);
    }
    setFieldCard(data.first_card);
  });
  //サーバーからカードを受け取る
  socket.on(SocketConst.EMIT.RECEIVER_CARD, (data) => {
    console.log("receive-card-event", data);
    const myCards_ = [...myCards];
    data.cards.map((v) => {
      myCards_.push(v);
    });
    setMyCards(myCards_);
  });
  //
  socket.on(SocketConst.EMIT.COLOR_OF_WILD, (data) => {
    console.log("event", data);
  });
  //
  socket.on(SocketConst.EMIT.SHUFFLE_WILD, (data) => {
    console.log("event", data);
  });
  //
  socket.on(SocketConst.EMIT.NEXT_PLAYER, (data) => {
    console.log("event", data);
  });
  //
  socket.on(SocketConst.EMIT.PUBLIC_CARD, (data) => {
    console.log("event", data);
  });
  //
  socket.on(SocketConst.EMIT.FINISH_TURN, (data) => {
    console.log("event", data);
  });
  //
  socket.on(SocketConst.EMIT.FINISH_GAME, (data) => {
    console.log("event", data);
  });


  function selectCard(v) {
    console.log(v);
    setMyCards(
      myCards.filter((card) => (card !== v))
    );
    if (isSayUno){
      socket.emit(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD, { "card_play": { "number": v.number, "color": v.color, "special": v.special } });
    }else{
      socket.emit(SocketConst.EMIT.PLAY_CARD, { "card_play": { "number": v.number, "color": v.color, "special": v.special } });
    }
  };

  function drawCard() {
    socket.emit(SocketConst.EMIT.DRAW_CARD);
  }

  return (
    <div className="Game">
      <p>field card:{fieldCard.color} {fieldCard.special} {fieldCard.number}</p>
      <button onClick={drawCard}>
        draw card
      </button>
      <button onClick={()=>{setIsSayUno(!isSayUno)}}>
        say uno
      </button>
      <p>My turn : {isMyTurn}</p>
      <ul>
        {myCards.map(v => (
          <li onClick={() => selectCard(v)} key={v._id}>
            {v.color} {v.special} {v.number}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Game;
