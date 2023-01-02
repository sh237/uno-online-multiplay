const Room = require('./room_data');

module.exports = (io) => {
    const SocketConst = {
        EMIT: {
        //   JOIN_ROOM: 'join-room',
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
      
    io.on('connection', socket => {
        // socket.on("connect", () => {
        //   console.log("New client connected");
      
        // });
        
    });
}

