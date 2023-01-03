const io = require('socket.io-client');
const { SocketConst, Special, Color, DrawReason, checkMustCallDrawCard } = require('./socket-io-common');

const port = 5000;
const socket = io(`http://localhost:${port}`);

const clientId = process.argv[2];
const roomId = process.argv[3];
console.log(`clientId: ${clientId}  roomId: ${roomId}`);

  

var current_information = {room_name:"",player:""}

socket.on('connection', (socket) => {
    console.log('a user connected');
    socket.on(SocketConst.EMIT.FIRST_PLAYER, (data) => {
      console.log('first_player');
      console.log('in');
      console.log(data);
  });
});

socket.on(SocketConst.EMIT.FIRST_PLAYER, (data) => {
    console.log('first_player');
    console.log(data);
});
socket.on(SocketConst.EMIT.RECEIVER_CARD, (data) => {
    console.log('receiver_card');
    console.log(data);
});
socket.on(SocketConst.EMIT.NEXT_PLAYER, (data) => {
    console.log('next_player');
    console.log(data);
    socket.emit('leave_room', { room_name: current_information.room_name, player_name: current_information.player}, (error, data) => {});
});


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