const Room = require('../room_data');
const { SocketConst, Special, Color, DrawReason, checkMustCallDrawCard, shuffle } = require('./socket-io-common');

module.exports = (io) => {
  io.on('connection', socket => {
    socket.on(SocketConst.EMIT.DRAW_CARD, () => {
        //soket_idからルーム、プレイヤーの検索を行う
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
              console.log('inside draw card');
              //ドローできるのかサーバー側でも確認
              console.log('checkMustCallDrawCard', checkMustCallDrawCard(room, room.room_name, player._id));
              //ドローする
              let draw_card = room.deck.shift();
              //ドローしたカードをプレイヤーの手札に加える
              player.cards.push(draw_card);

              //ドローしたカードが場に出せるかを確認
              let is_playable = false;
              if(draw_card.special == Special.WHITE_WILD ||  draw_card.special == Special.WILD_DRAW_4 || draw_card.special == Special.WILD || draw_card.special == Special.WILD_SHUFFLE || room.current_field.special == draw_card.special || room.current_field.color == draw_card.color || room.current_field.number == draw_card.number){
                is_playable = true;
              }

              //saveする
              room.save();
              socket.emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive:draw_card});
              io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:player._id, is_draw:true, can_play_draw_card:is_playable});
            }
          });
        });

        socket.on(SocketConst.EMIT.PLAY_DRAW_CARD, (data) => {
          if(data.is_play){
            playCard(data.card_play, socket, SocketConst.EMIT.PLAY_DRAW_CARD);
          }else{
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
                  //next_playerイベントを発火させるための処理
                  let next_player = getNextPlayer(room);
                  updateCurrentPlayer(room);
                  let next_next_player = getNextPlayer(room);
                  let number_card_of_player = {};
                  room.players_info.forEach((player) => {
                    number_card_of_player[player._id] = player.cards.length;
                  });
                  room.number_turn_play++;
                  io.to(next_player.socket_id).emit(SocketConst.EMIT.NEXT_PLAYER, {next_player:next_next_player._id, before_player:player._id, card_before:room.current_field, card_of_player:next_player.cards, must_call_draw_card:checkMustCallDrawCard(room, room.room_name, next_player._id), draw_reason:DrawReason.NOTING, turn_right:!room.is_reverse,  number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});

                }
              });
          }

        });

        socket.on(SocketConst.EMIT.PLAY_CARD, (data) => {
          //data: {card_play:{color:String,special:String,number:Number}}
          //まずこのカードをプレイできるのか確認する
          //soket_idからルーム、プレイヤーの検索を行う
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

    const waitForChangeColor = (room) => {
      return new Promise((resolve, reject) => {
        let TIMEOUT = 300000;
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timed out while waiting for change color event`));
        }, TIMEOUT);
    
        socket.on(SocketConst.EMIT.COLOR_OF_WILD, (data) => {
          clearTimeout(timeoutId);
          room.current_field.color = data.color_of_wild;
          resolve(data);
        });
      });
    };

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
            //プレイヤーが持っているカードの中にこのカードがあるか確認する
            let index = player.cards.findIndex((card) => {
              return card.color == card_play.color && card.special == card_play.special && card.number == card_play.number;
            });
            console.log("index:" + index);
            if(index != -1){
              //プレイヤーが持っているカードの中にこのカードがある
              //カードを場に出す
              let previos_color = room.current_field.color;
              room.current_field = card_play;
              room.number_card_play++;
              //カードをプレイヤーの手札から削除する
              player.cards.splice(index,1);
              //出したカードが数字ならなにもしない、特殊なら処理を行う

              if(card_play.special == Special.DRAW_2){
                //2枚ドローする
                let draw_card1 = room.deck.shift();
                let draw_card2 = room.deck.shift();
                //ドローしたカードを次のプレイヤーの手札に加える
                //次のプレイヤーを取得する
                let next_player = getNextPlayer(room);
                updateCurrentPlayer(room);

                next_player.cards.push(draw_card1);
                next_player.cards.push(draw_card2);
                
                //カードを場に出したことをクライアントに通知する
                if(socketEvent == SocketConst.EMIT.PLAY_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:card_play});
                }else if (socketEvent == SocketConst.EMIT.PLAY_DRAW_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_DRAW_CARD, {player:player._id, card_play:card_play, is_play_card:true});
                }
                io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:next_player._id, is_draw:true, can_play_card:false, reason:DrawReason.DRAW_TWO});
                //次のプレイヤーにドローしたカードを通知する
                io.to(next_player.socket_id).emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive:[draw_card1, draw_card2],is_penalty:false});

                //next_playerイベントを発火させるための処理
                let next_next_player = getNextPlayer(room);
                next_player = room.players_info.find((player) => { return player._id == room.order[room.current_player]; });
                let number_card_of_player = {};
                room.players_info.forEach((player) => {
                  number_card_of_player[player._id] = player.cards.length;
                });
                room.number_turn_play++;
                io.to(next_player.socket_id).emit(SocketConst.EMIT.NEXT_PLAYER, {next_player:next_next_player._id, before_player:player._id, card_before:room.current_field, card_of_player:next_player.cards, must_call_draw_card:checkMustCallDrawCard(room, room.room_name, next_player._id), draw_reason:DrawReason.DRAW_2, turn_right:!room.is_reverse,  number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});

                //saveする
                room.save();
              }
              else if(card_play.special == Special.SKIP){
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

                //カードを場に出したことをクライアントに通知する
                if(socketEvent == SocketConst.EMIT.PLAY_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:card_play});
                }else if (socketEvent == SocketConst.EMIT.PLAY_DRAW_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_DRAW_CARD, {player:player._id, card_play:card_play, is_play_card:true});
                }

                //next_playerイベントを発火させるための処理
                let next_next_player = getNextPlayer(room);
                let next_player = room.players_info.find((player) => { return player._id == room.order[room.current_player]; });
                let number_card_of_player = {};
                room.players_info.forEach((player) => {
                  number_card_of_player[player._id] = player.cards.length;
                });
                room.number_turn_play++;
                io.to(next_player.socket_id).emit(SocketConst.EMIT.NEXT_PLAYER, {next_player:next_next_player._id, before_player:player._id, card_before:room.current_field, card_of_player:next_player.cards, must_call_draw_card:checkMustCallDrawCard(room, room.room_name, next_player._id), draw_reason:DrawReason.NOTING, turn_right:!room.is_reverse,  number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});

                //saveする
                room.save();
              }
              else if(card_play.special == Special.REVERSE){
                //逆方向にする
                room.is_reverse = !room.is_reverse;
                //current_playerを変更する
                updateCurrentPlayer(room);
                //カードを場に出したことをクライアントに通知する
                if(socketEvent == SocketConst.EMIT.PLAY_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:card_play});
                }else if (socketEvent == SocketConst.EMIT.PLAY_DRAW_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_DRAW_CARD, {player:player._id, card_play:card_play, is_play_card:true});
                }

                //next_playerイベントを発火させるための処理
                let next_next_player = getNextPlayer(room);
                let next_player = room.players_info.find((player) => { return player._id == room.order[room.current_player]; });
                let number_card_of_player = {};
                room.players_info.forEach((player) => {
                  number_card_of_player[player._id] = player.cards.length;
                });
                room.number_turn_play++;
                io.to(next_player.socket_id).emit(SocketConst.EMIT.NEXT_PLAYER, {next_player:next_next_player._id, before_player:player._id, card_before:room.current_field, card_of_player:next_player.cards, must_call_draw_card:checkMustCallDrawCard(room, room.room_name, next_player._id), draw_reason:DrawReason.NOTING, turn_right:!room.is_reverse,  number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});

                //saveする
                room.save();
              }
              else if(card_play.special == Special.WILD){
                //色をクライアントに選ばせる
                socket.emit(SocketConst.EMIT.COLOR_OF_WILD, {});

                //クライアントから色を受け取る
                socket.on(SocketConst.EMIT.COLOR_OF_WILD, (data) => {
                  room.current_field.color = data.color_of_wild;
                });

                //一定時間待ち、カードを場に出したことをクライアントに通知する
                waitForChangeColor(room);

                updateCurrentPlayer(room);
                if(socketEvent == SocketConst.EMIT.PLAY_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:card_play});
                }else if (socketEvent == SocketConst.EMIT.PLAY_DRAW_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_DRAW_CARD, {player:player._id, card_play:card_play, is_play_card:true});
                }

                //next_playerイベントを発火させるための処理
                let next_next_player = getNextPlayer(room);
                let next_player = room.players_info.find((player) => { return player._id == room.order[room.current_player]; });
                let number_card_of_player = {};
                room.players_info.forEach((player) => {
                  number_card_of_player[player._id] = player.cards.length;
                });
                room.number_turn_play++;
                io.to(next_player.socket_id).emit(SocketConst.EMIT.NEXT_PLAYER, {next_player:next_next_player._id, before_player:player._id, card_before:room.current_field, card_of_player:next_player.cards, must_call_draw_card:checkMustCallDrawCard(room, room.room_name, next_player._id), draw_reason:DrawReason.NOTING, turn_right:!room.is_reverse,  number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});

                //saveする
                room.save();
              }
              else if(card_play.special == Special.WILD_DRAW_4){
                //まず次のプレイヤーを取得する
                let next_player = getNextPlayer(room);
                //4枚ドローする
                let draw_card1 = room.deck.shift();
                let draw_card2 = room.deck.shift();
                let draw_card3 = room.deck.shift();
                let draw_card4 = room.deck.shift();
                //ドローしたカードを次のプレイヤーの手札に加える
                next_player.cards.push(draw_card1);
                next_player.cards.push(draw_card2);
                next_player.cards.push(draw_card3);
                next_player.cards.push(draw_card4);
                
                //色をクライアントに選ばせる
                socket.emit(SocketConst.EMIT.COLOR_OF_WILD, {});

                //一定時間待ち、色を受け取る
                waitForChangeColor(room);

                updateCurrentPlayer(room);
                if(socketEvent == SocketConst.EMIT.PLAY_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:card_play});
                }else if (socketEvent == SocketConst.EMIT.PLAY_DRAW_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_DRAW_CARD, {player:player._id, card_play:card_play, is_play_card:true});
                }

                io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:next_player._id, is_draw:true, can_play_card:false, reason:DrawReason.WILD_DRAW_4});
                //次のプレイヤーにドローしたカードを通知する
                io.to(next_player.socket_id).emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive:[draw_card1, draw_card2, draw_card3, draw_card4],is_penalty:false});

                //next_playerイベントを発火させるための処理
                let next_next_player = getNextPlayer(room);
                next_player = room.players_info.find((player) => { return player._id == room.order[room.current_player]; });
                let number_card_of_player = {};
                room.players_info.forEach((player) => {
                  number_card_of_player[player._id] = player.cards.length;
                });
                room.number_turn_play++;
                io.to(next_player.socket_id).emit(SocketConst.EMIT.NEXT_PLAYER, {next_player:next_next_player._id, before_player:player._id, card_before:room.current_field, card_of_player:next_player.cards, must_call_draw_card:checkMustCallDrawCard(room, room.room_name, next_player._id), draw_reason:DrawReason.WILD_DRAW_4, turn_right:!room.is_reverse,  number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});

                //saveする
                room.save();
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
                //sorted_players_info = [{socket_id: ソケットid, _id: プレイヤーid, cards: []},...]
                //sorted_players_infoの先頭はnext_playerであり、最後がcurrent_player
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
                room.current_field.color = previos_color;
                card_play.color = previos_color;
                updateCurrentPlayer(room);
                if(socketEvent == SocketConst.EMIT.PLAY_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:card_play});
                }else if (socketEvent == SocketConst.EMIT.PLAY_DRAW_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_DRAW_CARD, {player:player._id, card_play:card_play, is_play_card:true});
                }
                
                //next_playerイベントを発火させるための処理
                let next_next_player = getNextPlayer(room);
                next_player = room.players_info.find((player) => { return player._id == room.order[room.current_player]; });
                let number_card_of_player = {};
                room.players_info.forEach((player) => {
                  number_card_of_player[player._id] = player.cards.length;
                });
                room.number_turn_play++;
                io.to(next_player.socket_id).emit(SocketConst.EMIT.NEXT_PLAYER, {next_player:next_next_player._id, before_player:player._id, card_before:room.current_field, card_of_player:next_player.cards, must_call_draw_card:checkMustCallDrawCard(room, room.room_name, next_player._id), draw_reason:DrawReason.NOTING, turn_right:!room.is_reverse,  number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});

                //saveする
                room.save();
              }
              else if(card_play.special == Special.WHITE_WILD){
                //次のプレイヤーを取得する
                let next_player = getNextPlayer(room);
                //次のプレイヤーをroom.binded_playersに追加する
                room.binded_players.push({player_id:next_player._id, remain_turn : 2});
                //場の色は前の色にする
                room.current_field.color = previos_color;
                card_play.color = previos_color;
                updateCurrentPlayer(room);
                if(socketEvent == SocketConst.EMIT.PLAY_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:card_play});
                }else if (socketEvent == SocketConst.EMIT.PLAY_DRAW_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_DRAW_CARD, {player:player._id, card_play:card_play, is_play_card:true});
                }

                //next_playerイベントを発火させるための処理
                let next_next_player = getNextPlayer(room);
                next_player = room.players_info.find((player) => { return player._id == room.order[room.current_player]; });
                let number_card_of_player = {};
                room.players_info.forEach((player) => {
                  number_card_of_player[player._id] = player.cards.length;
                });
                room.number_turn_play++;
                io.to(next_player.socket_id).emit(SocketConst.EMIT.NEXT_PLAYER, {next_player:next_next_player._id, before_player:player._id, card_before:room.current_field, card_of_player:next_player.cards, must_call_draw_card:checkMustCallDrawCard(room, room.room_name, next_player._id), draw_reason:DrawReason.WHITE_WILD, turn_right:!room.is_reverse,  number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});

                //saveする
                room.save();
              }
              else if(card_play.special == null || card_play.number != null){

                updateCurrentPlayer(room);
                if(socketEvent == SocketConst.EMIT.PLAY_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:card_play});
                }else if (socketEvent == SocketConst.EMIT.PLAY_DRAW_CARD){
                  io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_DRAW_CARD, {player:player._id, card_play:card_play, is_play_card:true});
                }

                //next_playerイベントを発火させるための処理
                let next_next_player = getNextPlayer(room);
                let next_player = room.players_info.find((player) => { return player._id == room.order[room.current_player]; });
                let number_card_of_player = {};
                room.players_info.forEach((player) => {
                  number_card_of_player[player._id] = player.cards.length;
                });
                room.number_turn_play++;
                io.to(next_player.socket_id).emit(SocketConst.EMIT.NEXT_PLAYER, {next_player:next_next_player._id, before_player:player._id, card_before:room.current_field, card_of_player:next_player.cards, must_call_draw_card:checkMustCallDrawCard(room, room.room_name, next_player._id), draw_reason:DrawReason.WHITE_WILD, turn_right:!room.is_reverse,  number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});

                //saveする
                room.save();
              }

            }else{
              //プレイヤーが持っているカードの中にこのカードがない
              //ペナルティを与える (2枚ドロー)
              //2枚ドローする
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



