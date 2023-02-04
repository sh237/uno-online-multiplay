const Room = require('../room_data');
const { SocketConst, Special, Color, DrawReason, checkMustCallDrawCard, shuffle } = require('./socket-io-common');

module.exports = (io) => {

    io.on('connection', socket => {
      //ルームから抜ける処理
      socket.on('leave_room', (data) => {
        console.log('leave_room');

        //Roomからplayerを削除
        Room.findOne(
          { room_name: data.room_name }, (error, room) => {
            if (error) {
              console.error(error);
              return;
            }
            if(room != null){
              // player_nameに一致するplayerを探す
              let player = room.players_info.find((player) => {
                return player.player_name == data.player_name;
              });
              // players_infoにおけるplayerのindexを探す
              let players_info_index = room.players_info.indexOf(player);
              // orderにおけるplayerのindexを探す
              let order_index = room.order.indexOf(player.player_name);
              // players_infoからplayerを削除
              room.players_info.splice(players_info_index, 1);
              // orderからplayerを削除
              room.order.splice(order_index, 1);
              // number_of_playerを減らす
              room.number_of_player -= 1;
              // roomを保存
              room.save((error, room) => {
                if (error) {
                  console.error(error);
                  return;
                }else{
                  //ルームから抜ける
                  socket.leave(data.room_name);
                  //ソケットを切断
                  //socket.disconnect();
                  io.sockets.in(room.room_name).emit('currentPlayers',room.players_info);
                }
              });
            }
          });
        });
              

      socket.on("connect", () => {
        console.log("New client connected");
        console.log("socket.id", socket.id);
    
      });
        
      //クライアントが切断したときの処理
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
              room.number_of_player -= 1;
              // roomを保存
              room.save((error, room) => {
                if (error) {
                  console.error(error);
                  return;
                }
                io.sockets.in(room.room_name).emit('currentPlayers',room.players_info);
              });
            }
          }
        );
      });

      //ルームに参加する処理
      socket.on(SocketConst.EMIT.JOIN_ROOM,(payload, callback) => {
        let is_game_started = false;
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
                initDeck(room);
                is_game_started = true;
              }else{
                console.log("room is not full");
                room.save((error, room) => {
                if (error) {
                  console.error(error);
                  return;
                }
                socket.join(room.room_name);
                io.sockets.in(room.room_name).emit('currentPlayers',room.players_info);
                setTimeout(() => {
                  const res = { room_name: payload.room_name, player: payload.player, your_id : player_id, total_turn : 1000, white_wild : "bind_2" };
                  callback(null, res);
                }, 1000);
                });
              }
            }
          }else{
            //ルームが存在しない場合
            Room.create({room_name: payload.room_name, number_of_player: 1, is_reverse:false, current_player:0, players_info:{player_name: payload.player, socket_id: socket.id},number_card_play: 1,number_turn_play:1, uno_declared:[], is_draw4_last_played:false, is_draw2_last_played:false},
              (error) => {
              if (error) {
                console.log(error);
                return;
              } else {
                console.log('Success!');
                socket.join(payload.room_name);
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
                  io.sockets.in(room.room_name).emit('currentPlayers',room.players_info);
                  });
                  const res = { room_name: payload.room_name, player: payload.player, your_id : player_id, total_turn : 1000, white_wild : "bind_2" };
                  callback(null, res);
                }
              });
            }, 1000);  // 1 秒待つ
            console.log("created new room");
          }
          if(is_game_started){
            io.sockets.in(room.room_name).emit('startGame',"startGame");
            //ゲームを始める データの書き込みをする時間を1秒作る
            setTimeout(() => {
              Room.findOne({room_name: payload.room_name}, (error, room) => {
                if (error) {
                  console.error(error);
                  return;
                }
                let player_id = room.players_info.find((player) => {
                  return player.player_name == payload.player;
                })._id;
                const res = { room_name: room.room_name, player: room.player, your_id : player_id, total_turn : 1000, white_wild : "bind_2" };
                callback(null, res);
                //誰がはじめにカードを出すか、カードを出す順番を告知する
                io.sockets.in(room.room_name).emit(SocketConst.EMIT.FIRST_PLAYER, {first_player: room.order[room.current_player], first_card : room.current_field, play_order : room.order });
                //それぞれにカードを配る。
                distributeCards(room);

                setTimeout(() => {
                  let is_must_call_draw_card = checkMustCallDrawCard(room, room.room_name, room.order[room.current_player]);
                  //各プレイヤーの手札の枚数を配列に保存 形式は、{player_id : number_of_cards, player_id : number_of_cards, ...}というjson形式
                  let number_card_of_player = {};
                  room.players_info.forEach((player) => {
                    number_card_of_player[player._id] = player.cards.length;
                  });
                  let current_player_soket_id = room.players_info.find((player) => {
                    return player._id == room.order[room.current_player];
                  }).socket_id;
                  let player = room.players_info.find((player) => {
                    return player._id == room.order[room.current_player];
                  });
                  if(room.is_reverse){
                    io.to(current_player_soket_id).emit(SocketConst.EMIT.NEXT_PLAYER, { next_player : room.order[(room.current_player > 0 ? room.current_player - 1 : 3)], before_player : room.order[(room.current_player < 3 ? room.current_player + 1 : 0)], card_before : room.current_field, card_of_player : player.cards, must_call_draw_card : is_must_call_draw_card, turn_right : !room.is_reverse, number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});
                  }else{
                    io.to(current_player_soket_id).emit(SocketConst.EMIT.NEXT_PLAYER, { next_player : room.order[(room.current_player < 3 ? room.current_player + 1 : 0)], before_player : room.order[(room.current_player > 0 ? room.current_player - 1 : 3)], card_before : room.current_field, card_of_player : player.cards, must_call_draw_card : is_must_call_draw_card, turn_right : !room.is_reverse, number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});
                  }
                },2000);
              });
            }, 1000);
            is_game_started = false;
          }
      });


    });
  });

  //既存のRoomデータのdeckやcurrent_fieldやcurrent_playerを初期化する関数
  const initDeck = (room) =>{
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
    deck.push({color: null, special: Special.WILD_SHUFFLE, number: null});
    //白いワイルドカード 3枚の設定
    for(let n=0; n<3; n++){
      deck.push({color: null, special: Special.WHITE_WILD, number: null});
    }
    room.deck = deck;
    //ランダムにdeckとorderを並び替える
    room.deck = shuffle(room.deck);
    //要削除
    room.deck.push({color: null, special: Special.WILD_SHUFFLE, number: null});

    //一時的にコメントアウト
    // room.order = shuffle(room.order);
    room.current_player = 0;
    //current_fieldをdeckからランダムに取り出す
    room.current_field = room.deck.splice(Math.floor(Math.random() * room.deck.length), 1)[0];
    room.save((error, room) => {
      if (error) {
        console.error(error);
        return;
      }
    });
  }


  //カードを配る関数
  const distributeCards = (room) => {
    //カードを配る
    for(let i=0; i<room.order.length; i++){
      for(let j=0; j<7; j++){
        let card = room.deck.splice(Math.floor(Math.random() * room.deck.length), 1)[0];
        room.players_info[i].cards.push(card);
      }
    }

    room.save((error, room) => {
      if (error) {
        console.error(error);
        return;
      }
    });
    for(let i=0; i<room.order.length; i++){
      let player_id = room.order[i];
      let player = room.players_info.find((player) => {
        return player._id == player_id;
      });
      io.to(player.socket_id).emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive:player.cards});
    }
  }
}