const Room = require('../room_data');
const { SocketConst, Special, Color, DrawReason, checkMustCallDrawCard, shuffle } = require('./socket-io-common');

module.exports = (io) => {
  io.on('connection', socket => {

    socket.on(SocketConst.EMIT.DRAW_CARD, () => {
        Room.findOne(
          { players_info: { $elemMatch: { socket_id: socket.id } } }, (error, room) => {
            if (error) {
              console.error(error);
              return;
            }
            console.log("EVENT ON   (" + getPlayerNameBySocketId(room, socket.id) + "): DRAW_CARD");
            if(room != null){
              let player = room.players_info.find((player) => {
                return player.socket_id == socket.id;
              });
              //このプレイヤーがroom.binded_playersに含まれているかどうか確認、更新する
              let binded_player = room.binded_players.find((binded_player) => {
                return binded_player.player_id == player._id;
              });
              if(binded_player != null){
                if(binded_player.remain_turn == 2){
                  binded_player.remain_turn --;
                }else if(binded_player.remain_turn == 1){
                  //このプレイヤーをroom.binded_playersから削除する
                  room.binded_players = room.binded_players.filter((binded_player) => {
                    return binded_player.player_id != player._id;
                  });
                }
              }
              console.log("is_draw4 last played: " + room.is_draw4_last_played);
              console.log("is_draw4 last played: " + room.is_draw2_last_played);

              let is_forced_drawed = false;
              let is_playable = false;

              //場のカードがワイルドドロー4の場合
              // if(room.current_field.special == Special.WILD_DRAW_4 && room.is_draw4_last_played){
              if(room.is_draw4_last_played){
                console.log("draw4 called.");
                //ドロー4が最後に出されたかどうかを更新する
                room.is_draw4_last_played = false;
                //4枚ドローする
                let draw_card1 = room.deck.shift();
                let draw_card2 = room.deck.shift();
                let draw_card3 = room.deck.shift();
                let draw_card4 = room.deck.shift();
                //ドローしたカードをプレイヤーの手札に加える
                player.cards.push(draw_card1);
                player.cards.push(draw_card2);
                player.cards.push(draw_card3);
                player.cards.push(draw_card4);
                //次のプレイヤーにドローしたカードを通知する
                io.to(player.socket_id).emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive:[draw_card1, draw_card2, draw_card3, draw_card4], is_penalty:false});
                console.log("EVENT EMIT (" + player.player_name +"): DRAW_CARD to  "+player.player_name);
                io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:player._id, is_draw:true, can_play_draw_card:false});
                console.log("EVENT EMIT (" + player.player_name +"): DRAW_CARD to room");
                is_forced_drawed = true;
              }
              //場のカードがドロー2の場合
              // else if(room.current_field.special == Special.DRAW_2 && room.is_draw2_last_played){
              else if(room.is_draw2_last_played){
                console.log("draw2 called.");
                //ドロー2が最後に出されたかどうかを更新する
                room.is_draw2_last_played = false;
                let draw_card1 = room.deck.shift();
                let draw_card2 = room.deck.shift();

                player.cards.push(draw_card1);
                player.cards.push(draw_card2);

                socket.emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive:[draw_card1, draw_card2], is_penalty:false});
                console.log("EVENT EMIT (" + player.player_name + "): RECEIVER_CARD to "+player.player_name);
                io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:player._id, is_draw:true, can_play_draw_card:false});
                console.log("EVENT EMIT (" + player.player_name + "): DRAW_CARD to room");
                is_forced_drawed = true;
              }
              else{
                let draw_card = room.deck.shift();
                player.cards.push(draw_card);

                //ドローしたカードが場に出せるかを確認
                if(draw_card.special == Special.WHITE_WILD ||  draw_card.special == Special.WILD_DRAW_4 || draw_card.special == Special.WILD || draw_card.special == Special.WILD_SHUFFLE){
                  is_playable = true;
                }
                else if ((room.current_field.special != null && room.current_field.special == draw_card.special) || ((room.current_field.color != null) && room.current_field.color == draw_card.color) || ((room.current_field.number != null ) && room.current_field.number == draw_card.number)){
                  is_playable = true;
                }

                socket.emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive:draw_card});
                console.log("EVENT EMIT (" + player.player_name + "): RECEIVER_CARD to "+player.player_name);
                io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:player._id, is_draw:true, can_play_draw_card:is_playable});
              }
              if(!is_playable || is_forced_drawed){
                //next_playerイベントを発火させるための処理
                let next_player = getNextPlayer(room);
                updateCurrentPlayer(room);
                let next_next_player = getNextPlayer(room);
                let number_card_of_player = {};
                room.players_info.forEach((player) => {
                  number_card_of_player[player._id] = player.cards.length;
                });
                room.number_turn_play++;
                let is_must_call_draw_card = false;
                io.to(next_player.socket_id).emit(SocketConst.EMIT.NEXT_PLAYER, {next_player:next_next_player._id, before_player:player._id, card_before:room.current_field, card_of_player:next_player.cards, must_call_draw_card: is_must_call_draw_card, draw_reason:DrawReason.NOTING, turn_right:!room.is_reverse,  number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});
                console.log("EVENT EMIT (" + player.player_name + "): NEXT_PLAYER to " + next_player.player_name);
              }
              
              //saveする
              room.save();
            }
        });
    });

    socket.on(SocketConst.EMIT.PLAY_DRAW_CARD, (data) => {
      if(data.is_play_card){
        playCard(null, socket, SocketConst.EMIT.PLAY_DRAW_CARD);
      }
      //ここを実装する
      else{
        emitNextPlayer(null, null, DrawReason.NOTING, socket);
      }
    });

    socket.on(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD, (data) => {
      playCard(data.card_play, socket, SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD);
    });

    socket.on(SocketConst.EMIT.PLAY_CARD, (data) => {
      playCard(data.card_play, socket, SocketConst.EMIT.PLAY_CARD);
    });

    const getNextPlayer = (room) => {
      if(room.is_reverse){
        if(room.current_player == 0){
          return room.players_info.find((player) => player._id == room.order[3]);
        }else{
          return room.players_info.find((player) => player._id == room.order[room.current_player - 1]);
        }
      }else{
        if(room.current_player == 3){
          return room.players_info.find((player) => player._id == room.order[0]);
        }else{
          return room.players_info.find((player) => player._id == room.order[room.current_player + 1]);
        }
      }
    }

    const updateCurrentPlayer = (room) => {
      //current_playerを変更する
      if(room.is_reverse){
        if(room.current_player == 0){
          room.current_player = 3;
        }else{
          room.current_player = room.current_player - 1;
        }
      }else{
        if(room.current_player == 3){
          room.current_player = 0;
        }else{
          room.current_player = room.current_player + 1;
        }
      }
    };

    const waitForChangeColor = (room, player, reason) => {
      return new Promise((resolve, reject) => {
        let TIMEOUT = 3000000;
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timed out while waiting for change color event`));
        }, TIMEOUT);
    
        socket.on(SocketConst.EMIT.COLOR_OF_WILD, (data) => {
          console.log("EVENT ON   (" + player.player_name + "): COLOR_OF_WILD");
          clearTimeout(timeoutId);
          room.current_field.color = data.color_of_wild;
          //next_playerイベントを発火させるための処理
          let next_next_player = getNextPlayer(room);
          let next_player = room.players_info.find((player) => { return player._id == room.order[room.current_player]; });
          let number_card_of_player = {};
          room.players_info.forEach((player) => {
            number_card_of_player[player._id] = player.cards.length;
          });
          room.number_turn_play++;
          let is_must_call_draw_card = (reason == DrawReason.WILD_DRAW_4) ? true : false;
          io.to(next_player.socket_id).emit(SocketConst.EMIT.NEXT_PLAYER, {next_player:next_next_player._id, before_player:player._id, card_before:room.current_field, card_of_player:next_player.cards, must_call_draw_card:is_must_call_draw_card, draw_reason:reason, turn_right:!room.is_reverse,  number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});
          console.log("EVENT EMIT (" + player.player_name + "): NEXT_PLAYER to "+next_player.player_name);
          room.save();
          resolve(data);
        });
      });
    };

    const checkIfUnoDeclare = (room, socket_id) => {
    };

    //For debugging
    const getPlayerNameBySocketId = (room, socket_id) =>{
      let player = room.players_info.find((player) => player.socket_id == socket_id);
      return player.player_name;
    }

    const updateCurrentPlayerForSkip = (room) => {
      //次のプレイヤーをスキップする
      if(room.is_reverse){
        if(room.current_player == 0){
          room.current_player = 2;
        }else if(room.current_player == 1){
          room.current_player = 3;
        }else{
          room.current_player = room.current_player - 2;
        }
      }else{
        if(room.current_player == 2){
          room.current_player = 0;
        }else if(room.current_player == 3){
          room.current_player = 1;
        }else{
          room.current_player = room.current_player + 2;
        }
      }
    }

    const insideEmitNextPlayer = (room, player, reason) => {
      //next_playerイベントを発火させるための処理
      let next_next_player = getNextPlayer(room);
      let next_player = room.players_info.find((player) => { return player._id == room.order[room.current_player]; });
      next_player = room.players_info.find((player) => { return player._id == room.order[room.current_player]; });
      let number_card_of_player = {};
      room.players_info.forEach((player) => {
        number_card_of_player[player._id] = player.cards.length;
      });
      room.number_turn_play++;
      let is_must_call_draw_card = (reason == DrawReason.DRAW_2) ? true : false;
      io.to(next_player.socket_id).emit(SocketConst.EMIT.NEXT_PLAYER, {next_player:next_next_player._id, before_player:player._id, card_before:room.current_field, card_of_player:next_player.cards, must_call_draw_card:is_must_call_draw_card, draw_reason:reason, turn_right:!room.is_reverse,  number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});
      console.log("EVENT EMIT (" + player.player_name + "): NEXT_PLAYER to "+next_player.player_name);
      room.save();
    }

    const emitNextPlayer = (room, player, reason, socket) => {
      if(!room || !player){
        Room.findOne(
          { players_info: { $elemMatch: { socket_id: socket.id } } }, (error, room) => {
            if (error) {
              console.error(error);
              return;
            }
            if(room != null){
              let player = room.players_info.find((player) => {
                return player.socket_id == socket.id;
              });
              updateCurrentPlayer(room);
              insideEmitNextPlayer(room, player, reason);
            } 
          }
        ); 
      }else{
        insideEmitNextPlayer(room, player, reason);
      }
    }

    const playCard = (card_play, socket, socketEvent) => {
      Room.findOne(
        { players_info: { $elemMatch: { socket_id: socket.id } } }, (error, room) => {
          if (error) {
            console.error(error);
            return;
          }
          if(room != null){
            let player = room.players_info.find((player) => {
              return player.socket_id == socket.id;
            });
            if(socketEvent == SocketConst.EMIT.PLAY_DRAW_CARD){
              //プレイヤーの一番最後のカード
              card_play = player.cards[player.cards.length - 1];
            }
            //プレイヤーが持っているカードの中にこのカードがあるか確認する
            let index = player.cards.findIndex((card) => {
              return card.color == card_play.color && card.special == card_play.special && card.number == card_play.number;
            });
            if(index != -1){
              /*プレイヤーが持っているカードの中にこのカードがある場合、
              カードを場に出す*/
              let previous_color = room.current_field.color;
              room.current_field = card_play;
              room.number_card_play++;
              player.cards.splice(index,1);
              
              //場に出したカードがDRAW_2、WILD_DRAW_4の場合roomの値を更新
              if(card_play.special == Special.DRAW_2){
                room.is_draw2_last_played = true;
              }else if(card_play.special == Special.WILD_DRAW_4){
                room.is_draw4_last_played = true;
              }

              //カードを場に出したことをクライアントに通知する
              if (socketEvent == SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD){
                //room.uno_declaredにプレイヤーのidがあるか確認し、なければ追加する
                let index = room.uno_declared.findIndex((id) => { return id == player._id; });
                if(index == -1){
                  room.uno_declared.push(player._id);
                }
                io.sockets.in(room.room_name).emit(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD, {player:player._id, card_play:card_play, yell_uno:true});
                console.log("EVENT EMIT (" + player.player_name + "): SAY_UNO_AND_PLAY_CARD to room. PLAYED " + room.current_field);
              }
              else{1
                //room.uno_declaredにプレイヤーのidがあるか確認し、あれば削除する
                if(room.uno_declared.length > 0){
                  let index = room.uno_declared.findIndex((id) => {return id == player._id;});
                  if(index != -1){
                    room.uno_declared.splice(index,1);
                  }
                }
                if(socketEvent == SocketConst.EMIT.PLAY_CARD){
                  io.sockets.in(room.room_name).emit(socketEvent, {player:player._id, card_play:card_play});
                  console.log("EVENT EMIT (" + player.player_name + "): PLAY_CARD to room. PLAYED " + room.current_field);
                }
                else if(socketEvent == SocketConst.EMIT.PLAY_DRAW_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_DRAW_CARD, {player:player._id, card_play:card_play, is_play_card:true});
                  console.log("EVENT EMIT (" + player.player_name + "): PLAY_DRAW_CARD to room. PLAYED " + room.current_field);
                }
              }


              if(card_play.special == Special.DRAW_2){
                //next_playerイベントを発火させるための処理
                updateCurrentPlayer(room);
                emitNextPlayer(room, player, DrawReason.DRAW_2, socket);
              }
              else if(card_play.special == Special.SKIP){
                updateCurrentPlayerForSkip(room);
                emitNextPlayer(room, player, DrawReason.NOTING, socket);
              }
              else if(card_play.special == Special.REVERSE){
                //逆方向にする
                room.is_reverse = !room.is_reverse;
                updateCurrentPlayer(room);
                emitNextPlayer(room, player, DrawReason.NOTING, socket);
              }
              else if(card_play.special == Special.WILD){
                //色をクライアントに選ばせる
                socket.emit(SocketConst.EMIT.COLOR_OF_WILD, {});
                updateCurrentPlayer(room);
                waitForChangeColor(room, player, DrawReason.NOTING);
              }
              else if(card_play.special == Special.WILD_DRAW_4){
                //色をクライアントに選ばせる
                socket.emit(SocketConst.EMIT.COLOR_OF_WILD, {});
                updateCurrentPlayer(room);
                waitForChangeColor(room, player, DrawReason.WILD_DRAW_4);
              }
              else if(card_play.special == Special.WILD_SHUFFLE){
                //まず全プレイヤーの手札のカードを取得する
                let all_cards = [];
                for(let i = 0; i < room.players_info.length; i++){
                  all_cards = all_cards.concat(room.players_info[i].cards);
                }
                //all_cardsをシャッフルする
                all_cards = shuffle(all_cards);
                //各プレイヤーに配布されるカード枚数を計算する
                let temp = JSON.parse(JSON.stringify(room.players_info));//deepcopy
                //sorted_players_infoをroom.orderの順に並び替える
                let sorted_players_info = [];
                for(let i = 0; i < room.order.length; i++){
                  let player = temp.find((player) => player._id == room.order[i]);
                  sorted_players_info.push(player);
                }
                let next_player = getNextPlayer(room);
                let next_player_index = sorted_players_info.findIndex((player) => player._id == next_player._id);
                sorted_players_info.slice(next_player_index).concat(sorted_players_info.slice(0, next_player_index));
                for(let i = 0; i < all_cards.length; i++){
                  sorted_players_info[i % sorted_players_info.length].cards.push(all_cards[i]);
                }
                //各プレイヤーの手札を更新する (player._idが一致するものを探して、cardsを更新する)
                for(let i = 0; i < sorted_players_info.length; i++){
                  let player = room.players_info.find((player) => player._id == sorted_players_info[i]._id);
                  player.cards = sorted_players_info[i].cards;
                }
                //各プレイヤーに通知する。
                for(let i = 0; i < room.players_info.length; i++){
                  io.to(room.players_info[i].socket_id).emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive:room.players_info[i].cards, is_penalty:false});
                }
                //場の色は前の色にする
                room.current_field.color = previous_color;
                card_play.color = previous_color;
                updateCurrentPlayer(room);
                emitNextPlayer(room, player, DrawReason.NOTING, socket);
              }
              else if(card_play.special == Special.WHITE_WILD){
                //次のプレイヤーを取得する
                let next_player = getNextPlayer(room);
                //次のプレイヤーをroom.binded_playersに追加する
                room.binded_players.push({player_id:next_player._id, remain_turn : 2});
                //場の色は前の色にする
                room.current_field.color = previous_color;
                card_play.color = previous_color;
                updateCurrentPlayer(room);
                emitNextPlayer(room, player, DrawReason.NOTING, socket);
              }
              else if(card_play.special == null || card_play.number != null){
                updateCurrentPlayer(room);
                emitNextPlayer(room, player, DrawReason.NOTING, socket);
              }

            }else{
              /*プレイヤーが持っているカードの中にこのカードがない
              ペナルティを与える (2枚ドロー)
              2枚ドローする*/
              let draw_card1 = room.deck.shift();
              let draw_card2 = room.deck.shift();
              //ドローしたカードをプレイヤーの手札に加える
              player.cards.push(draw_card1);
              player.cards.push(draw_card2);

              //ドローしたことをクライアントに通知する
              socket.emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive: [draw_card1, draw_card2], is_penalty:true});
            }
          }
      });
    }
  });


}



