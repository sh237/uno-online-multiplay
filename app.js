var createError = require('http-errors');
var express = require('express');
const mongoose = require('mongoose');
const socketio = require('socket.io');
const Room = require('./room_data');
const User = require('./user_data');
const http = require('http');
const cors = require('cors');

const options = {
	useUnifiedTopology : true,
	useNewUrlParser : true
}

mongoose.connect('mongodb://127.0.0.1/test_db',options);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'DB connection error:'));
db.once('open', () => console.log('DB connection successful'));
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

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var roomsRouter = require('./routes/rooms');


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/rooms', roomsRouter );


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
  socket.on("connect", () => {
    console.log("New client connected");
  });
  console.log("New client connected");
  console.log("socket.id", socket.id);

  socket.on(SocketConst.EMIT.JOIN_ROOM,(payload, callback) => {
    console.log("payload", payload);

      Room.findOne({room_name: payload.room_name}, (error, room) => {
        if (error) {
          console.error(error);
          //create new room
          return;
        }
        if(room != null){
          // updateNumOfPlayer メソッドを呼び出す
          room.updateNumOfPlayer(payload.room_name);
          Room.findOneAndUpdate(
            { room_name: payload.room_name },
            {
              $set: {
                number_of_player :  room.number_of_player + 1
              }
            },
            { new: true },
            (err, room) => {
              if (err) {
                console.log('Something went wrong:', room);
              } else {
                console.log('Document successfully updated:', room);
              }
            }
          );

        }else{
          Room.create({room_name: payload.room_name, number_of_player: 1, is_reverse:false, current_player:0},
            (error) => {
            if (error) {
              console.log(error);
            } else {
              console.log('Success!');
            }
          });

          setTimeout(() => {
            Room.find((error, data) => {
              if (error) {
                console.log(error);
              } else {
                console.log(data);
              }
            });
          }, 1000);  // 1 秒待つ

          console.log("create new room");
        }
      });

    
    const res = { room_name: payload.room_name, player: payload.player, your_id : socket.id, total_turn : 1000, white_wild : "bind_2" };
    callback(null, res);
  });

});


server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));



