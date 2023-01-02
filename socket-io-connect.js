const Room = require('./room_data');
const User = require('./user_data');

module.exports = (io) => {
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
        
        socket.on('disconnect', () => {
          console.log('Client disconnected');
          Room.findOne(
            { players_info: { $elemMatch: { socket_id: socket.id } } }, (error, room) => {
              if (error) {
                console.error(error);
                return;
              }
              if(room != null){
                // socket_idに対応するplayerを探す
                let player = room.players_info.find((player) => {
                  return player.socket_id == socket.id;
                });
                // playerのindexを探す
                let players_info_index = room.players_info.indexOf(player);
                // playerのindexを探す
                let order_index = room.order.indexOf(player.player_name);
                // players_infoからplayerを削除
                room.players_info.splice(players_info_index, 1);
                // orderからplayerを削除
                room.order.splice(order_index, 1);
                // number_of_playerを減らす
                room.number_of_player = room.number_of_player - 1;
                // roomを保存
                room.save((error, room) => {
                  if (error) {
                    console.error(error);
                    return;
                  }
                });
              }
            }
          );
        });
                  
        console.log("New client connected");
        console.log("socket.id", socket.id);
      
        socket.on(SocketConst.EMIT.JOIN_ROOM,(payload, callback) => {
          console.log("payload", payload);
      
            Room.findOne({room_name: payload.room_name}, (error, room) => {
              if (error) {
                console.error(error);
                return;
              }
              if(room != null){
                // ルームが存在する場合
                if(room.number_of_player >= 4){
                  console.log("room is full");
                  callback("room is full", null);
                  return;
                }else{
                  console.log("room is not full");
                  room.number_of_player = room.number_of_player + 1;
                  room.order.push(payload.player);
                  room.players_info.push({player_name: payload.player, socket_id: socket.id});
                  room.save((error, room) => {
                    if (error) {
                      console.error(error);
                      return;
                    }
                    console.log("room", room);
                    const res = { room_name: payload.room_name, player: payload.player, your_id : socket.id, total_turn : 1000, white_wild : "bind_2" };
                    callback(null, res);
                  });
                }
              }else{
                Room.create({room_name: payload.room_name, number_of_player: 1, is_reverse:false, current_player:0, order:[payload.player], players_info:{player_name: payload.player, socket_id: socket.id}},
                  (error) => {
                  if (error) {
                    console.log(error);
                  } else {
                    console.log('Success!');
                    const res = { room_name: payload.room_name, player: payload.player, your_id : socket.id, total_turn : 1000, white_wild : "bind_2" };
                    callback(null, res);
                  }
                });
      
                //1秒待ってからデータを取得する
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

}