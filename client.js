const io = require('socket.io-client');

const port = 5000;
const socket = io(`http://localhost:${port}`);

const clientId = process.argv[2];
const roomId = process.argv[3];
console.log(`clientId: ${clientId}  roomId: ${roomId}`);

const SocketConst = {
    EMIT: {
      JOIN_ROOM: 'join-room',
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

  
socket.on('connection', () => {
  console.log('connect');
});

// Serverからメッセージを受信
socket.on('server_to_client', (data) => {
  console.log(JSON.stringify(data.message));
});

var current_information = {room_name:"",player:""}

// Serverにメッセージを送信
socket.emit(SocketConst.EMIT.JOIN_ROOM, { room_name: roomId, player: clientId}, (error, data) => {
    if (error) {
        console.log(error);
    } else {
        current_information.room_name = data.room_name;
        current_information.player = data.player;
        console.log("data set : ", current_information);
    }
});

//サーバーとの接続が切れたときの処理
socket.on('disconnect', () => {
    socket.emit('delete_data',{ data: { room_name: current_information.room_name, player: current_information.player}});
});