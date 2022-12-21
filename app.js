var createError = require('http-errors');
var express = require('express');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');
var path = require('path');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');

// var cookieParser = require('cookie-parser');
// var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const { Socket } = require('dgram');

const PORT = process.env.PORT || 5000
var app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());


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
  socket.on(SocketConst.EMIT.JOIN_ROOM,(payload, callback) => {
    let numberOfUsersInRoom = getUsersInRoom(payload.room_name).length;
    const { error, newUser} = addUser({
      id: socket.id,
      player: payload.player,
      room_name: payload.room_name
    });
    if(error)
      return callback(error);
    
    socket.join(newUser.room_name);
    io.to(newUser.room_name).emit(SocketConst.EMIT.JOIN_ROOM, { room_name: newUser.room_name, player: newUser.player });
    const res = { room_name: newUser.room_name, player: payload.player, your_id : socket.id, total_turn : 1000, white_wild : "bind_2" };
    callback(null, res);
  });

  socket.on(SocketConst.EMIT.PLAY_CARD,(payload, callback) => {
    const user = getUser(socket.id);
    io.to(user.room_name).emit(SocketConst.EMIT.PLAY_CARD, { player: user.player, card_play: payload.card_play });
  });

  socket.on(SocketConst.EMIT.DRAW_CARD,(payload, callback) => {
    const user = getUser(socket.id);
    io.to(user.room_name).emit(SocketConst.EMIT.DRAW_CARD, { player: user.player, is_draw: true, can_play_draw_card: true});
  });

  socket.on()
});


server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));



