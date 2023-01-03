const { init } = require('./room_data');
const Room = require('./room_data');
const User = require('./user_data');

module.exports = (io) => {
    const SocketConst = {
        EMIT: {
          JOIN_ROOM: 'join-room',
          // RECEIVER_CARD: 'receiver-card',
          FIRST_PLAYER: 'first-player',
          // COLOR_OF_WILD: 'color-of-wild',
          // SHUFFLE_WILD: 'shuffle-wild',
          // NEXT_PLAYER: 'next-player',
          // PLAY_CARD: 'play-card',
          // DRAW_CARD: 'draw-card',
          // PLAY_DRAW_CARD: 'play-draw-card',
          // CHALLENGE: 'challenge',
          // PUBLIC_CARD: 'public-card',
          // SAY_UNO_AND_PLAY_CARD: 'say-uno-and-play-card',
          // POINTED_NOT_SAY_UNO: 'pointed-not-say-uno',
          // SPECIAL_LOGIC: 'special-logic',
          // FINISH_TURN: 'finish-turn',
          // FINISH_GAME: 'finish-game',
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
              if(room != null){// ルームが存在する場合
                if(room.number_of_player >= 4){ //ルームが満員の場合
                  console.log("room is full");
                  callback("room is full", null);
                  return;
                }else{
                  room.number_of_player = room.number_of_player + 1;
                  room.players_info.push({player_name: payload.player, socket_id: socket.id});
                  //room.orderにroom.players_infoのplayerに該当するidを追加
                  let player_id = room.players_info.find((player) => {
                    return player.player_name == payload.player;
                  })._id;
                  room.order.push(player_id);
                  if(room.number_of_player == 4){
                    console.log("room is full");
                    socket.join(room.room_name);
                    //ルームに4人揃ったらゲームを始める
                    room = initDeck(room);
                    room.save((error, room) => {
                      if (error) {
                        console.error(error);
                        return;
                      }
                    });

                    setTimeout(() => {
                      io.sockets.in(room.room_name).emit(SocketConst.EMIT.FIRST_PLAYER, {first_player: room.order[room.current_player], first_card : room.current_field, play_order : room.order });
                    }, 1000);

                  }else{
                    console.log("room is not full");
                    room.save((error, room) => {
                      if (error) {
                        console.error(error);
                        return;
                      }
                      socket.join(room.room_name);
                      console.log("room", room);
                      const res = { room_name: payload.room_name, player: payload.player, your_id : socket.id, total_turn : 1000, white_wild : "bind_2" };
                      callback(null, res);
                    });
                  }
                }
              }else{
                Room.create({room_name: payload.room_name, number_of_player: 1, is_reverse:false, current_player:0, players_info:{player_name: payload.player, socket_id: socket.id}},
                  (error) => {
                  if (error) {
                    console.log(error);
                  } else {
                    console.log('Success!');
                    socket.join(payload.room_name);
                    const res = { room_name: payload.room_name, player: payload.player, your_id : socket.id, total_turn : 1000, white_wild : "bind_2" };
                    callback(null, res);
                  }
                });

                setTimeout(() => {
                  Room.findOne({room_name: payload.room_name}, (error, room) => {
                    if (error) {
                      console.error(error);
                      return;
                    }
                    if(room != null){
                      // orderの追加 (orderにはplayerのidを入れる必要があるが、players_infoを作成した後で無いとidが取得できないので、ここで追加する)
                      let player_id = room.players_info.find((player) => {
                        return player.player_name == payload.player;
                      })._id;
                      room.order.push(player_id);
                      room.save((error, room) => {
                        if (error) {
                          console.error(error);
                          return;
                        }
                      });
                      console.log(room);
                    }
                  });
                }, 1000);  // 1 秒待つ
                    
                console.log("create new room");
              }
          });
        });
      });

  //既存のRoomデータのdeckやcurrent_fieldやcurrent_playerを初期化する関数
  initDeck = (room) =>{
    console.log("initDeck");
    if(room != null){
      let deck = [];
      for(let c=0; c<4; c++){
        let color = "";
        switch(c){
          case 0:
            color = Color.RED;
            break;
          case 1:
            color = Color.YELLOW;
            break;
          case 2:
            color = Color.GREEN;
            break;
          case 3:
            color = Color.BLUE;
            break;
        }
        //数字カード76枚の設定
        for(let n=1; n<20; n++){
          deck.push({color: color, special: null, number: n%10});
        }
        //ドロー2 8枚の設定
        for(let n=0; n<2; n++){
          deck.push({color: color, special: Special.DRAW_2, number: null});
        }
        //リバース 8枚の設定
        for(let n=0; n<2; n++){
          deck.push({color: color, special: Special.REVERSE, number: null});
        }
        //スキップ 8枚の設定
        for(let n=0; n<2; n++){
          deck.push({color: color, special: Special.SKIP, number: null});
        }
      }
      //ワイルドカード 4枚の設定
      for(let n=0; n<4; n++){
        deck.push({color: null, special: Special.WILD, number: null});
      }
      //ワイルドドロー4 4枚の設定
      for(let n=0; n<4; n++){
        deck.push({color: null, special: Special.WILD_DRAW_4, number: null});
      }
      //シャッフルワイルドカード 1枚の設定
      deck.push({color: null, special: Special.SHUFFLE_WILD, number: null});
      //白いワイルドカード 3枚の設定
      for(let n=0; n<3; n++){
        deck.push({color: null, special: Special.WHITE_WILD, number: null});
      }
      room.deck = deck;
      //ランダムにorderを並び替える
      room.order = shuffle(room.order);
      room.current_player = 0;
      //current_fieldをdeckからランダムに取り出す
      console.log("room deck length : " + room.deck.length)
      room.current_field = room.deck.splice(Math.floor(Math.random() * room.deck.length), 1)[0];
      console.log("room deck remaining : " + room.deck.length);
      console.log("room current_field : " + room.current_field);

      return room;
    }
  }
  const shuffle = ([...array]) => {
    for (let i = array.length - 1; i >= 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }


}



