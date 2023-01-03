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
const io = socketio(server, {
  cors: {                      // corsモジュールでは上手くCORSできないため、Server作成時の引数にオプションを追加する
      origin: "*",
      methods: ["GET", "POST"],
  },});

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

var current_information = {room:"",player:""}

io.on('connection', socket => {
    socket.on("connect", () => {
      console.log("New client connected");
    });

    socket.on("disconnect", (reason) => {

      Room.findOne({room_name: current_information.room}, (error, room) => {
        if (error) {
          console.error(error);
          return;
        }
        if(room != null){

          var index = room.order.indexOf(current_information.player);
          room.order.splice(index, 1);

          Room.findOneAndUpdate(
            { room_name: current_information.room },
            {
              $set: {
                number_of_player :  room.number_of_player - 1,
                order: room.order,
              }
            },
            { new: true },
            (err, room) => {
              if (err) {
                console.log('Something went wrong:', room);
              } else {
                console.log('Document successfully deleted:', room);
              }
            }
          );
        }
      });
    console.log("Client disconnected");
    console.log("reason", reason);
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
          // ルームが存在する場合
          console.log("number_of_player", room.number_of_player);
          if(room.number_of_player >= 4){
            console.log("room is full");
            // callback("room is full", null);
            callback("room is full", null);
            return;
          }else{
            console.log("room is not full");
            console.log("room.number_of_player", room.number_of_player);

            Room.findOneAndUpdate(
              { room_name: payload.room_name },
              {
                $set: {
                  number_of_player :  room.number_of_player + 1,
                  order: room.order.concat(payload.player),
                }
              },
              { new: true },
              (err, room) => {
                if (err) {
                  console.log('Something went wrong:', room);
                } else {
                  console.log('Document successfully updated:', room);
                  const res = { room_name: payload.room_name, player: payload.player, your_id : socket.id, total_turn : 1000, white_wild : "bind_2" };
                  current_information.room = payload.room_name;
                  callback(null, res);
                }
              }
            );
          }
        }else{
          Room.create({room_name: payload.room_name, number_of_player: 1, is_reverse:false, current_player:0, order:[payload.player]},
            (error) => {
            if (error) {
              console.log(error);
            } else {
              console.log('Success!');
              const res = { room_name: payload.room_name, player: payload.player, your_id : socket.id, total_turn : 1000, white_wild : "bind_2" };
              current_information.room = payload.room_name;
              callback(null, res);
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
  });
});


server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));



