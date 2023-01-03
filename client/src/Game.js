import React, { useState } from 'react';
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
  const [cards, setCards] = useState([]);
  const [isMyTurn, setIsMyTurn] = useState(false);

  socket.on(SocketConst.EMIT.FIRST_PLAYER, (data) => {
    console.log("first-player-event", data);
  })

  return (
    <div className="Game">

    </div>
  );
}

export default Game;
