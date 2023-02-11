const Room = require('../room_data');
const { session } = require('../app');
const { SocketConst, Special, runTransaction, getNextPlayer, getPreviousPlayer, insideInitDeck, shuffle } = require('./socket-io-common');

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
      socket.on(SocketConst.EMIT.JOIN_ROOM,async(payload, callback) => {
        await runTransaction( joinRoom,[session, payload, callback, socket, socket.id]);
    });
  });


  const joinRoom = async (session, payload, callback, socket, socket_id) => {
    let is_game_started = false;
    let is_draw2_last_played = false;
    let is_wild_last_played = false;
    let room = await Room.findOne({room_name: payload.room_name}).session(session);
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
          is_draw2_last_played, is_wild_last_played = initDeck(room);
          console.log("initDeck Result", is_draw2_last_played, is_wild_last_played);
          is_game_started = true;
        }else{
          console.log("room is not full");
          await room.save({session},(error, room) => {
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
      room = await Room.create({room_name: payload.room_name, number_of_player: 1, is_reverse:false, current_player:0, players_info:{player_name: payload.player, socket_id: socket_id},number_card_play: 1,number_turn_play:1, uno_declared:[], is_draw4_last_played:false, is_draw2_last_played:false});
      setTimeout(() => {
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
          socket.join(room.room_name);
          io.sockets.in(room.room_name).emit('currentPlayers',room.players_info);
          });
          const res = { room_name: payload.room_name, player: payload.player, your_id : player_id, total_turn : 1000, white_wild : "bind_2" };
          callback(null, res);
        }
        }, 1000);
      console.log("created new room");
    }
    if(is_game_started){
      io.sockets.in(room.room_name).emit('startGame',"startGame");
      //ゲームを始める データの書き込みをする時間を1秒作る
      var player = room.players_info.find((player) => {
        return player.player_name == payload.player;
      });
      setTimeout(async() => {
          let player_id = player._id;
          const res = { room_name: room.room_name, player: room.player, your_id : player_id, total_turn : 1000, white_wild : "bind_2" };
          callback(null, res);

          //各プレイヤーのidと名前の対応を作成
          let player_id_name_map = {};
          room.players_info.forEach((player) => {
            player_id_name_map[player._id] = player.player_name;
          });
          //誰がはじめにカードを出すか、カードを出す順番を告知する
          // if(!is_wild_last_played && !is_draw2_last_played){
          io.sockets.in(room.room_name).emit(SocketConst.EMIT.FIRST_PLAYER, {first_player: room.order[room.current_player], first_card : room.current_field, play_order : room.order, player_names : player_id_name_map });
          console.log("EVENT EMIT (" + getNextPlayer(room).player_name + "): FIRST_PLAYER to room ");
          // }
          //それぞれにカードを配る。
          distributeCards(room);

          setTimeout(async() => {
            // let is_must_call_draw_card = checkMustCallDrawCard(room, room.room_name, room.order[room.current_player]);
            let is_must_call_draw_card = false;
            var player = room.players_info.find((player) => {
              return player._id == room.order[room.current_player];
            });
            //各プレイヤーの手札の枚数を配列に保存 形式は、{player_id : number_of_cards, player_id : number_of_cards, ...}というjson形式
            let number_card_of_player = {};
            room.players_info.forEach((player) => {
              number_card_of_player[player._id] = player.cards.length;
            });
            if(is_draw2_last_played){
              is_must_call_draw_card = true;
              room.is_draw2_last_played = true;
            }
            else if(is_wild_last_played){
              io.to(player.socket_id).emit(SocketConst.EMIT.COLOR_OF_WILD, {});
              console.log("before waitForChangeColor");
              // await waitForChangeColor(room, player, 'join-room', socket, session);

              room.is_waiting_for_wild = true;
              // socket.on(SocketConst.EMIT.COLOR_OF_WILD, async(data) => {
              //   console.log("EVENT ON   (" + player.player_name + "): COLOR_OF_WILD color : " + data.color_of_wild);
              //   console.log("socket._events: "+JSON.stringify(socket._events));
              //   //もしsocket.onでCOLOR_OF_WILDが登録されていたら
              //   room.current_field.color = data.color_of_wild;
              //   //全プレイヤーに全プレイヤーの手札の枚数を通知する。
              //   let number_card_of_player = {};
              //   room.players_info.forEach((player) => {
              //   number_card_of_player[player._id] = player.cards.length;
              //   });
              //   if(room.winners.length > 0){
              //   room.winners.forEach((winner) => {
              //       number_card_of_player[winner] = 0;
              //   });
              //   }
              //   socket.to(room.room_name).emit(SocketConst.EMIT.NOTIFY_CARD, {cards:number_card_of_player, current_field:room.current_field});
              //   console.log("EVENT EMIT (" + player.player_name +"): NOTIFY_CARD to room " + JSON.stringify(number_card_of_player));

              // });

              console.log("after waitForChangeColor");
              // let next_next_player = room.players_info.find((player) => {
              //   if(room.is_reverse){
              //     return player._id == room.order[(room.current_player - 2 + room.players_info.length) % room.players_info.length];
              //   }else{
              //     return player._id == room.order[(room.current_player + 2) % room.players_info.length];
              //   }
              // });
              // io.to(getNextPlayer(room)._id).emit(SocketConst.EMIT.NEXT_PLAYER, { next_player : next_next_player, before_player : player, card_before : room.current_field, card_of_player : player.cards, must_call_draw_card : is_must_call_draw_card, turn_right : !room.is_reverse, number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});
              // console.log("EVENT EMIT (" + player.player_name + "): NEXT_PLAYER to room");
              await room.save();
              return;
            }
            let current_player_soket_id = room.players_info.find((player) => {
              return player._id == room.order[room.current_player];
            }).socket_id;
            await room.save();
            io.to(current_player_soket_id).emit(SocketConst.EMIT.NEXT_PLAYER, { next_player : getNextPlayer(room), before_player : getPreviousPlayer(room), card_before : room.current_field, card_of_player : player.cards, must_call_draw_card : is_must_call_draw_card, turn_right : !room.is_reverse, number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});
          },100);
        }, 100);
      is_game_started = false;
    }
  };
  


  //既存のRoomデータのdeckやcurrent_fieldやcurrent_playerを初期化する関数
  const initDeck = (room) =>{
    insideInitDeck(room);
    //一時的にコメントアウト
    // room.order = shuffle(room.order);
    room.current_player = 0;
    //current_fieldをdeckの一番上のカードにする
    room.current_field = room.deck.shift();
    // room.current_field = {color:null,special:"wild",number:null};
    //もしワイルドドロー4、シャッフルワイルド、白いワイルドだったら、それ以外が出るまでdeckから引く。
    //ワイルドドロー4、シャッフルワイルド、白いワイルドの場合にはdeckのランダムな位置に入れる。
    while(room.current_field.special == Special.WILD_DRAW_4 || room.current_field.special == Special.WILD_SHUFFLE || room.current_field.special == Special.WHITE_WILD){
      //ワイルドドロー4、シャッフルワイルド、白いワイルドの場合にはdeckのランダムな位置に入れる。
      let random_index = Math.floor(Math.random() * room.deck.length);
      room.deck.splice(random_index, 0, room.current_field);
      room.current_field = room.deck.shift();
    }
    if(room.current_field.special == Special.REVERSE){
      room.is_reverse = !room.is_reverse;
      room.current_player = room.players_info.length - 1;
    }
    else if(room.current_field.special == Special.SKIP){
      room.current_player = (room.current_player + 1) % room.players_info.length;
    }
    else if(room.current_field.special == Special.DRAW_2){
      return true, false;
    }
    else if(room.current_field.special == Special.WILD){
      return false, true;
    }
      
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
      for(let j=0; j<2; j++){
        let card = room.deck.splice(Math.floor(Math.random() * room.deck.length), 1)[0];
        room.players_info[i].cards.push(card);
      }
    }

    // room.save((error, room) => {
    //   if (error) {
    //     console.error(error);
    //     return;
    //   }
    // });
    for(let i=0; i<room.order.length; i++){
      let player_id = room.order[i];
      let player = room.players_info.find((player) => {
        return player._id == player_id;
      });
      io.to(player.socket_id).emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive:player.cards});
    }
  }
}