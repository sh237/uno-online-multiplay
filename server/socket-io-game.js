const Room = require('../room_data');
const { session } = require('../app');
const { SocketConst, Special, DrawReason, runTransaction, getNextPlayer, getPreviousPlayer, insideInitDeck } = require('./socket-io-common');

module.exports = (io) => {
  io.on('connection', socket => {

    socket.on(SocketConst.EMIT.DRAW_CARD, async () => {
        await runTransaction(drawCard,[session, socket]);
    });

    socket.on(SocketConst.EMIT.PLAY_DRAW_CARD, async(data) => {
      if(data.is_play_card){
        await runTransaction( playCard,[session, null, socket, SocketConst.EMIT.PLAY_DRAW_CARD]);
      }
      else{
        emitNextPlayer(null, null, DrawReason.NOTING, socket, session);
      }
    });

    socket.on(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD, async(data) => {
      await runTransaction( playCard,[session, data.card_play, socket, SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD]);
    });

    socket.on(SocketConst.EMIT.SAY_UNO_AND_PLAY_DRAW_CARD, async(data) => {
      await runTransaction( playCard,[session, null, socket, SocketConst.EMIT.SAY_UNO_AND_PLAY_DRAW_CARD]);
    });

    socket.on(SocketConst.EMIT.PLAY_CARD, async(data) => {
      await runTransaction( playCard,[session, data.card_play, socket, SocketConst.EMIT.PLAY_CARD]);
    });

    socket.on(SocketConst.EMIT.CHALLENGE, async(data) => {
      if(data.is_challenge){
        await runTransaction( challenge,[session, socket]);
      }else{
        await runTransaction( hasNotChallenged,[session, socket]);
      }
    });

    socket.on(SocketConst.EMIT.POINTED_NOT_SAY_UNO, async(data) => {
      await runTransaction( pointedNotSayUno,[session, data.target, socket]);
    });

    socket.on(SocketConst.EMIT.TIME_OUT, async(data) => {
      await runTransaction( timeOut,[session, socket]);
    });

    socket.on(SocketConst.EMIT.COLOR_OF_WILD, async(data) => {
      await runTransaction( waitForChangeColor,[session, data.color_of_wild,socket]);
    });



    const shuffle = ([...array]) => {
      for (let i = array.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    const waitForChangeColor = async(session, color_of_wild, socket) =>{
      const room = await Room.findOne({ players_info: { $elemMatch: { socket_id: socket.id } } }).session(session);
      if(room != null){
        //is_waiting_for_change_color???true??????
        if(room.is_waiting_for_wild_draw4 || room.is_waiting_for_wild){
          let player = room.players_info.find((player) => {
            return player.socket_id == socket.id;
          });
          if(!checkIsYourTurn(room, player)){
            //????????????????????????2??????????????????
            givePenalty(room, player, session);
            return;
          }
          console.log("EVENT ON   (" + player.player_name + "): COLOR_OF_WILD color : " + color_of_wild);
          //??????socket.on???COLOR_OF_WILD???????????????????????????
          room.current_field.color = color_of_wild;
          //???????????????????????????????????????????????????????????????????????????
          let number_card_of_player = {};
          room.players_info.forEach((player) => {
          number_card_of_player[player._id] = player.cards.length;
          });
          if(room.winners.length > 0){
          room.winners.forEach((winner) => {
              number_card_of_player[winner] = 0;
          });
          }
          io.sockets.in(room.room_name).emit(SocketConst.EMIT.NOTIFY_CARD, {cards:number_card_of_player, current_field:room.current_field});
          console.log("EVENT EMIT (" + player.player_name +"):(inside waitFor) NOTIFY_CARD to room " + JSON.stringify(number_card_of_player));
          await room.save();
          if(room.is_waiting_for_wild_draw4){
            room.is_waiting_for_wild_draw4 = false;
            emitNextPlayer(room, player, DrawReason.WILD_DRAW_4, socket, session);
          }else{
            room.is_waiting_for_wild = false;
            emitNextPlayer(room, player, DrawReason.NOTING, socket, session);
          }
        }
        else{
          //?????????????????????????????????????????????????????????2??????????????????
          let player = room.players_info.find((player) => {
            return player.socket_id == socket.id;
          });
          //??????????????????????????????
          let random_color = Math.floor(Math.random() * 4);
          room.current_field.color = random_color;
          //???????????????room.current_field.color
          givePenalty(room, player, session);
          if(room.is_waiting_for_wild_draw4){
            room.is_waiting_for_wild_draw4 = false;
            emitNextPlayer(room, player, DrawReason.WILD_DRAW_4, socket, session);
          }else if(room.is_waiting_for_wild){
            room.is_waiting_for_wild = false;
            emitNextPlayer(room, player, DrawReason.NOTING, socket, session);
          }
          return;
        }
    }
  }
    
    const updateCurrentPlayer = (room) => {
      //current_player???????????????
      if(room.is_reverse){
        room.current_player = (room.current_player - 1 + room.players_info.length) % room.players_info.length;
      }else{
        room.current_player = (room.current_player + 1) % room.players_info.length;
      }
    };

    const updateCurrentPlayerForSkip = (room) => {
      //??????????????????????????????????????????
      if(room.is_reverse){
        room.current_player = (room.current_player - 2 + room.players_info.length) % room.players_info.length;
      }else{
        room.current_player = (room.current_player + 2) % room.players_info.length;
      }
    }

    const checkAndRemoveUnoDeclared = (room, player) => {
      //room.uno_declared?????????????????????id?????????????????????????????????????????????
      if(room.uno_declared.length > 0){
        let index = room.uno_declared.findIndex((id) => {return id == player._id;});
        if(index != -1){
          room.uno_declared.splice(index,1);
        }
      }
    };

    const checkAndRemoveBindedPlayers = (room, player) => {
      //????????????????????????room.binded_players??????????????????????????????????????????????????????
      let binded_player = room.binded_players.find((binded_player) => {
        return binded_player.player_id == player._id;
      });
      if(binded_player != null){
        if(binded_player.remain_turn == 2){
          binded_player.remain_turn --;
          return 1;
        }else if(binded_player.remain_turn == 1){
          //????????????????????????room.binded_players??????????????????
          room.binded_players = room.binded_players.filter((binded_player) => {
            return binded_player.player_id != player._id;
          });
          return 0;
        }
      }else{
        return -1;
      }
    };

    //For debugging
    const getPlayerNameBySocketId = (room, socket_id) =>{
      let player = room.players_info.find((player) => player.socket_id == socket_id);
      return player.player_name;
    }

    const insideEmitNextPlayer = async(room, player, reason, session) => {
      let bindCheckedRes = checkAndRemoveBindedPlayers(room, getNextPlayer(room));
      if(bindCheckedRes == 0 || bindCheckedRes == 1){
        //??????????????????????????????????????????
        updateCurrentPlayerForSkip(room);
      }else{
        if(reason == "skip"){
          updateCurrentPlayerForSkip(room);
        }else if(reason == "winner" || reason == "winner-draw"){
          //???????????????
        }
        else{
          updateCurrentPlayer(room);
        }
      }

      //next_player?????????????????????????????????????????????
      let next_next_player = getNextPlayer(room);
      let next_player = room.players_info.find((player) => { return player._id == room.order[room.current_player]; });
      if(reason == "winner" || reason == "winner-draw"){
        console.log("current_player: " + room.current_player);
        next_next_player = getNextPlayer(room);
        next_player = player;
        player = getPreviousPlayer(room);
        console.log("next_next_player: "+ JSON.stringify(next_next_player) + " next_player: " + JSON.stringify(next_player)+ " player: " + JSON.stringify(player));
      }
      console.log("current_player: "+ room.current_player +"\n"); 
      console.log(" next_next_player: "+ next_next_player.player_name+"\n");
      console.log(" next_player: " + next_player.player_name+"\n");
      let number_card_of_player = {};
      room.players_info.forEach((player) => {
        number_card_of_player[player._id] = player.cards.length;
      });
      if(room.winners.length > 0){
        room.winners.forEach((winner) => {
          number_card_of_player[winner] = 0;
        });
      }
      room.number_turn_play++;
      let is_must_call_draw_card = (reason == DrawReason.DRAW_2 || reason == DrawReason.WILD_DRAW_4 || reason == "winner-draw") ? true : false;
      if(reason == "challenge"){
        player = getPreviousPlayer(room);
      }
      await room.save({session});
      io.to(next_player.socket_id).emit(SocketConst.EMIT.NEXT_PLAYER, {next_player:next_next_player._id, before_player:player._id, card_before:room.current_field, card_of_player:next_player.cards, must_call_draw_card:is_must_call_draw_card, draw_reason:reason, turn_right:!room.is_reverse,  number_card_play : room.number_card_play, number_turn_play : room.number_turn_play, number_card_of_player : number_card_of_player});
      console.log("EVENT EMIT (" + player.player_name + "): NEXT_PLAYER to "+next_player.player_name);
    }

    const emitNextPlayer = async(room, player, reason, socket, session) => {
      if(!room || !player){
        let room = await Room.findOne({ players_info: { $elemMatch: { socket_id: socket.id } } }).session(session);
        if(room != null){
          let player = room.players_info.find((player) => {
            return player.socket_id == socket.id;
          });
          insideEmitNextPlayer(room, player, reason, session);
        } 
      }else{
        insideEmitNextPlayer(room, player, reason, session);
      }
    }

    const checkIsYourTurn = (room, player) => {
      if(player == null){
        return false;
      }
      if(room.order[room.current_player] == player._id){
        return true;
      }else{
        return false;
      }
    }

    const notifyCards = async(room, player, is_penalty, draw_cards) => {
      //???????????????????????????????????????????????????????????????
      io.to(player.socket_id).emit(SocketConst.EMIT.RECEIVER_CARD, {cards_receive:draw_cards, is_penalty:is_penalty});
      console.log("EVENT EMIT (" + player.player_name +"): RECEIVER_CARD to  "+player.player_name);
      //???????????????????????????????????????????????????????????????????????????
      let number_card_of_player = {};
      room.players_info.forEach((player) => {
        number_card_of_player[player._id] = player.cards.length;
      });
      if(room.winners.length > 0){
        room.winners.forEach((winner) => {
          number_card_of_player[winner] = 0;
        });
      }
      io.sockets.in(room.room_name).emit(SocketConst.EMIT.NOTIFY_CARD, {cards:number_card_of_player, current_field:room.current_field});
      console.log("EVENT EMIT (" + player.player_name +"): NOTIFY_CARD to room " + JSON.stringify(number_card_of_player));
    }

    //???????????????????????????
    const givePenalty = async(room, player, session) => {
          /*???????????????????????????????????????????????????????????????????????????
          ??????????????????????????? (2????????????)
          2??????????????????*/
          let draw_card1 = room.deck.shift();
          let draw_card2 = room.deck.shift();
          //?????????????????????????????????
          if(room.deck.length <= 0){
            insideInitDeck(room);
            draw_card1 = room.deck.shift();
            draw_card2 = room.deck.shift();
          }
          //???????????????????????????????????????????????????????????????
          player.cards.push(draw_card1);
          player.cards.push(draw_card2);

          //?????????????????????????????????????????????????????????
          notifyCards(room, player, true, [draw_card1, draw_card2]);
          await room.save({session}); 
    }

    const drawCard = async(session, socket) => {
      const room = await Room.findOne({ players_info: { $elemMatch: { socket_id: socket.id } } }).session(session);
      console.log("EVENT ON   (" + getPlayerNameBySocketId(room, socket.id) + "): DRAW_CARD");
      if(room != null){
        let player = room.players_info.find((player) => {
          return player.socket_id == socket.id;
        });
        if(!checkIsYourTurn(room, player)){
          //????????????????????????2??????????????????
          givePenalty(room, player, session);
          return;
        }
        //room.uno_declared?????????????????????id?????????????????????????????????????????????
        checkAndRemoveUnoDeclared(room, player);
        
        let is_forced_drawed = false;
        let is_playable = false;

        //???????????????????????????2?????????
        if(room.is_draw2_last_played){
          //?????????2???????????????????????????????????????????????????
          room.is_draw2_last_played = false;
          let draw_cards = [];
          for(let i = 0; i < 2; i++){
            draw_cards.push(room.deck.shift());
          }
          if(room.deck.length <= 0){
            insideInitDeck(room);
            for(let i = 0; i < 2; i++){
              draw_cards.push(room.deck.shift());
            }
          }
          for(let i = 0; i < 2; i++){
            player.cards.push(draw_cards[i]);
          }
          notifyCards(room, player, false, draw_cards);
          io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:player._id, is_draw:true, can_play_draw_card:false});
          console.log("EVENT EMIT (" + player.player_name + "): DRAW_CARD to room");
          is_forced_drawed = true;
        }
        else{
          let draw_card = room.deck.shift();
          //?????????????????????????????????
          if(room.deck.length <= 0){
            insideInitDeck(room);
            draw_card = room.deck.shift();
          }

          player.cards.push(draw_card);
          //??????????????????????????????????????????????????????
          if(draw_card.special == Special.WHITE_WILD ||  draw_card.special == Special.WILD_DRAW_4 || draw_card.special == Special.WILD || draw_card.special == Special.WILD_SHUFFLE){
            is_playable = true;
          }
          else if ((room.current_field.special != null && room.current_field.special == draw_card.special) || ((room.current_field.color != null) && room.current_field.color == draw_card.color) || ((room.current_field.number != null ) && room.current_field.number == draw_card.number)){
            is_playable = true;
          }
          notifyCards(room, player, false, draw_card);
          io.sockets.in(room.room_name).emit(SocketConst.EMIT.DRAW_CARD, {player:player._id, is_draw:true, can_play_draw_card:is_playable});
          console.log("EVENT EMIT (" + player.player_name + "): DRAW_CARD to room");
        }
        if(!is_playable || is_forced_drawed){
          //next_player?????????????????????????????????????????????
          emitNextPlayer(room, player, "draw-card", socket, session);
          return;
        }
        //save??????
        await room.save({session});
      }
    }

    const pointedNotSayUno = async (session, target_id, socket) => {
      const room = await Room.findOne({ players_info: { $elemMatch: { socket_id: socket.id } } }).session(session);
      if(room != null){
        let player = room.players_info.find((player) => {
          return player.socket_id == socket.id;
        });
        //???????????????????????????UNO???????????????????????????????????????
        let index = room.uno_declared.find((player_id) => {
            return player_id == target_id;
        });
        let target_player = room.players_info.find((player) => {
          return player._id == target_id;
        });
        console.log("room.uno_declared.length: " + room.uno_declared.length+ " index: " + index+ " target_player.cards.length: " + target_player.cards.length);
        if((room.uno_declared.length == 0 || (index == null || index == -1)) && (target_player != null && target_player.cards.length == 1)){
          //????????????????????????????????????????????????????????????2???????????????
          let draw_cards = [];
          for(let i = 0; i < 2; i++){
            draw_cards.push(room.deck.shift());
          }
          if(room.deck.length <= 0){
            insideInitDeck(room);
            for(let i = 0; i < 2; i++){
              draw_cards.push(room.deck.shift());
            }
          }
          for(let i = 0; i < 2; i++){
            target_player.cards.push(draw_cards[i]);
          }

          notifyCards(room, target_player, true, draw_cards);
          io.sockets.in(room.room_name).emit(SocketConst.EMIT.POINTED_NOT_SAY_UNO, {pointer:player._id, target:target_player._id, have_say_uno:false});
          console.log("EVENT EMIT (" + player.player_name + "): POINTED_NOT_SAY_UNO to room "+ false);
          room.save();
        }
        else{
          io.sockets.in(room.room_name).emit(SocketConst.EMIT.POINTED_NOT_SAY_UNO, {pointer:player._id, target:target_player._id, have_say_uno:true});
          console.log("EVENT EMIT (" + player.player_name + "): POINTED_NOT_SAY_UNO to room "+ true);
        }
      }
    }

    const hasNotChallenged = async (session, socket) => {
      const room = await Room.findOne({ players_info: { $elemMatch: { socket_id: socket.id } } }).session(session);
      if(room != null){
        let player = room.players_info.find((player) => {
          return player.socket_id == socket.id;
        });
        room.is_draw4_last_played = false;
        //??????????????????4???????????????
        let draw_cards = [];
        for(let i = 0; i < 4; i++){
          draw_cards.push(room.deck.shift());
        }

        //?????????????????????????????????
        if(room.deck.length <= 0){
          insideInitDeck(room);
          for(let i = 0; i < 4; i++){
            draw_cards.push(room.deck.shift());
          }
        }
        for(let i = 0; i < 4; i++){
          player.cards.push(draw_cards[i]);
        }

        notifyCards(room, player, false, draw_cards);
        emitNextPlayer(room, player, DrawReason.NOTING, socket, session);
      }
    }

    const timeOut = async (session, socket) => {
      const room = await Room.findOne({ players_info: { $elemMatch: { socket_id: socket.id } } }).session(session);
      if(room != null){
        let player = room.players_info.find((player) => {
          return player.socket_id == socket.id;
        });
        //??????????????????????????????????????????????????????2???????????????
        let draw_cards = [];
        for(let i = 0; i < 2; i++){
          draw_cards.push(room.deck.shift());
        }
        if(room.deck.length <= 0){
          insideInitDeck(room);
          for(let i = 0; i < 2; i++){
            draw_cards.push(room.deck.shift());
          }
        }
        for(let i = 0; i < 2; i++){
          player.cards.push(draw_cards[i]);
        }
        notifyCards(room, player, true, draw_cards);
        emitNextPlayer(room, player, DrawReason.NOTING, socket, session);
      }
    }

    const challenge = async(session, socket) => {
      const room = await Room.findOne({ players_info: { $elemMatch: { socket_id: socket.id } } }).session(session);
      if(room != null){
        let player = room.players_info.find((player) => {
          return player.socket_id == socket.id;
        });
        if(!checkIsYourTurn(room, player)){
          givePenalty(room, player, session);
          return;
        }
        //??????before player???binded_players?????????????????????????????????????????????
        let flag = true;
        let before_player = getPreviousPlayer(room);
        while(flag){
          if(room.binded_players.length > 0){
            if( room.binded_players.find((player) => {
              return player.player_id == before_player._id;
            }) != null){
              before_player = getPreviousPlayer(room);
            }
            else{
              flag = false;
            }
          }else {
            flag = false;
          }
        }

        console.log("before_player: " + JSON.stringify(before_player.player_name));
        
        let previous_field = room.previous_field;
        let is_challenge_success = false;
        for (let i = 0; i < before_player.cards.length; i++){
          if(before_player.cards[i].special == Special.WILD || before_player.cards[i].special == Special.WHITE_WILD || before_player.cards[i].special == Special.WILD_SHUFFLE || (before_player.cards[i].special != null && (before_player.cards[i].special == previous_field.special)) || (before_player.cards[i].color != null && (before_player.cards[i].color == previous_field.color)) || (before_player.cards[i].number != null && (before_player.cards[i].number == previous_field.number))){
            is_challenge_success = true;
            break;
          }
        }
        io.sockets.in(room.room_name).emit(SocketConst.EMIT.CHALLENGE, {challenger: player._id, target: before_player._id, is_challenge: true, is_challenge_success: is_challenge_success});
        console.log("EVENT EMIT (" + player.player_name + "): CHALLENGE to " + "room:" + room.room_name);
        io.to(player.socket_id).emit(SocketConst.EMIT.PUBLIC_CARD, {card_of_player:before_player._id,cards:before_player.cards});
        console.log("EVENT EMIT (" + player.player_name + "): PUBLIC_CARD to " + player.player_name);
        if(is_challenge_success){
          //?????????????????????,before_player???????????????4?????????
          //4????????????????????????????????????????????????4???before_player?????????????????????
          let draw_cards = [];
          for(let i = 0; i < 4; i++){
            draw_cards.push(room.deck.shift());
          }
          //?????????????????????????????????
          if(room.deck.length <= 0){
            insideInitDeck(room);
            for(let i = 0; i < 4; i++){
              draw_cards.push(room.deck.shift());
            }
          }
          for(let i = 0; i < 4; i++){
            before_player.cards.push(draw_cards[i]);
          }

          room.is_draw4_last_played = false;

          notifyCards(room, before_player, true, draw_cards);
          //????????????????????????????????????????????????
          emitNextPlayer(room, player, "challenge", socket, session);
        }else{
          //?????????????????????,player???????????????6?????????
          //6??????????????????
          let draw_cards = [];
          for(let i = 0; i < 6; i++){
            draw_cards.push(room.deck.shift());
            player.cards.push(draw_cards[i]);
          }
          room.is_draw4_last_played = false;
          notifyCards(room, player, true, draw_cards);
          emitNextPlayer(room, player, DrawReason.NOTING, socket, session);
        }
      }
    }

    const playCard = async(session, card_play, socket, socketEvent) => {
      const room = await Room.findOne({ players_info: { $elemMatch: { socket_id: socket.id } } }).session(session);
      if(room != null){
        let player = room.players_info.find((player) => {
          return player.socket_id == socket.id;
        });
        if(!checkIsYourTurn(room, player)){
          //??????????????????????????????
          console.log("Is not your turn");
          givePenalty(room, player, session);
          return;
        }
        if(socketEvent == SocketConst.EMIT.PLAY_DRAW_CARD || socketEvent == SocketConst.EMIT.SAY_UNO_AND_PLAY_DRAW_CARD){
          //??????????????????????????????????????????
          card_play = player.cards[player.cards.length - 1];
        }
        //??????????????????????????????????????????????????????????????????????????????????????????
        let index = player.cards.findIndex((card) => {
          return card.color == card_play.color && card.special == card_play.special && card.number == card_play.number;
        });
        if(index != -1){
          //???????????????????????????DRAW_2???WILD_DRAW_4?????????room???????????????
          if(card_play.special == Special.DRAW_2){
            room.is_draw2_last_played = true;
          }else if(card_play.special == Special.WILD_DRAW_4){
            room.is_draw4_last_played = true;
            //room.previous_field?????????
            room.previous_field = room.current_field;
          }

          /*????????????????????????????????????????????????????????????????????????????????????
          ????????????????????????*/
          let previous_color = room.current_field.color;
          room.current_field = card_play;
          room.number_card_play++;
          player.cards.splice(index,1);

          //??????????????????????????????0?????????????????????
          if(player.cards.length == 0){
            room.winners.push(player._id);
            //play_card?????????
            if(socketEvent == SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD){
              io.sockets.in(room.room_name).emit(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD, {player:player._id, card_play:card_play, yell_uno:true});
              console.log("EVENT EMIT (" + player.player_name + "): SAY_UNO_AND_PLAY_CARD to room. PLAYED " + room.current_field);
            }else if(socketEvent == SocketConst.EMIT.SAY_UNO_AND_PLAY_DRAW_CARD){
              io.sockets.in(room.room_name).emit(SocketConst.EMIT.SAY_UNO_AND_PLAY_DRAW_CARD, {player:player._id, card_play:card_play, yell_uno:true});
              console.log("EVENT EMIT (" + player.player_name + "): SAY_UNO_AND_PLAY_DRAW_CARD to room. PLAYED " + room.current_field);
            }else if(socketEvent == SocketConst.EMIT.PLAY_CARD){
              io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_CARD, {player:player._id, card_play:card_play});
              console.log("EVENT EMIT (" + player.player_name + "): PLAY_CARD to room. PLAYED " + room.current_field);
            }else if(socketEvent == SocketConst.EMIT.PLAY_DRAW_CARD){
              io.sockets.in(room.room_name).emit(SocketConst.EMIT.PLAY_DRAW_CARD, {player:player._id, card_play:card_play});
              console.log("EVENT EMIT (" + player.player_name + "): PLAY_DRAW_CARD to room. PLAYED " + room.current_field);
            }
            //room.players_info??????player?????????
            room.players_info.splice(room.players_info.indexOf(room.players_info.find((p) => {
              return p._id == player._id;
            })),1);
            //room.order??????player._id?????????
            room.order.splice(room.order.indexOf(room.order.find((id) => {
              return id == player._id;
            })),1);
            //??????????????????????????????WILD,WILD_DRAW_4,WHITE_WILD,WILD_SHUFFLE?????????
            let is_must_draw = false;
            if(room.current_field.special == Special.WILD) {
              room.current_field.color = previous_color;
            }
            else if(room.current_field.special == Special.WILD_DRAW_4){
              room.current_field.color = previous_color;
              is_must_draw = true;
              room.is_draw4_last_played = true;
            }
            else if(room.current_field.special == Special.WHITE_WILD){
              room.current_field.color = previous_color;
            }
            else if(room.current_field.special == Special.WILD_SHUFFLE){
              room.current_field.color = previous_color;
            }
            else if(room.current_field.special == Special.DRAW_2){
              is_must_draw = true;
              room.is_draw2_last_played = true;
            }

            //???????????????????????????????????????????????????????????????????????????
            let number_card_of_player = {};
            room.players_info.forEach((player) => {
              number_card_of_player[player._id] = player.cards.length;
            });
            if(room.winners.length > 0){
              room.winners.forEach((winner) => {
                number_card_of_player[winner] = 0;
              });
            }
            io.sockets.in(room.room_name).emit(SocketConst.EMIT.NOTIFY_CARD, {cards:number_card_of_player, current_field:room.current_field});
            console.log("EVENT EMIT (" + player.player_name +"): NOTIFY_CARD to room " + JSON.stringify(number_card_of_player));

            if(room.players_info.length == 1){
              //???????????????
              room.winners.push(room.players_info[0]._id);
              
              io.sockets.in(room.room_name).emit(SocketConst.EMIT.FINISH_GAME, {winner:{rank:room.winners}});
              console.log("EVENT EMIT(" + player.player_name + "): FINISH_GAME to room.");

              return;
            }
            if(room.players_info.length == room.current_player){
              if(room.is_reverse){
                room.current_player = room.current_player - 1;
              }else{
                room.current_player = 0;
              }
            }else if(room.current_player == 0){
              if(room.is_reverse){
                room.current_player = room.players_info.length - 1;
              }else{
                room.current_player = 0;
              }
            }else {
              if(room.is_reverse){
                room.current_player = room.current_player - 1;
              }
            }
            player = room.players_info.find((player) => {
              return player._id == room.order[room.current_player];
            });
            if(is_must_draw){
              emitNextPlayer(room, player, 'winner-draw', socket, session);
            }else{
              emitNextPlayer(room, player, 'winner', socket, session);
            }
            return;
          }

          //???????????????????????????????????????????????????????????????????????????
          let number_card_of_player = {};
          room.players_info.forEach((player) => {
            number_card_of_player[player._id] = player.cards.length;
          });
          if(room.winners.length > 0){
            room.winners.forEach((winner) => {
              number_card_of_player[winner] = 0;
            });
          }
          io.sockets.in(room.room_name).emit(SocketConst.EMIT.NOTIFY_CARD, {cards:number_card_of_player, current_field:room.current_field});
          console.log("EVENT EMIT (" + player.player_name +"): NOTIFY_CARD to room " + JSON.stringify(number_card_of_player));

          //?????????????????????????????????????????????????????????????????????
          if (socketEvent == SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD || socketEvent == SocketConst.EMIT.SAY_UNO_AND_PLAY_DRAW_CARD){
            //room.uno_declared?????????????????????id????????????????????????????????????????????????
            let index = room.uno_declared.findIndex((id) => { return id == player._id; });
            if(index == -1){
              room.uno_declared.push(player._id);
            }
            if(socketEvent == SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD){
              io.sockets.in(room.room_name).emit(SocketConst.EMIT.SAY_UNO_AND_PLAY_CARD, {player:player._id, card_play:card_play, yell_uno:true});
              console.log("EVENT EMIT (" + player.player_name + "): SAY_UNO_AND_PLAY_CARD to room. PLAYED " + room.current_field);
            }else{
              io.sockets.in(room.room_name).emit(SocketConst.EMIT.SAY_UNO_AND_PLAY_DRAW_CARD, {player:player._id, card_play:card_play, yell_uno:true});
              console.log("EVENT EMIT (" + player.player_name + "): SAY_UNO_AND_PLAY_DRAW_CARD to room. PLAYED " + room.current_field);
            }
          }
          else{
            checkAndRemoveUnoDeclared(room, player);
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
            //next_player?????????????????????????????????????????????
            emitNextPlayer(room, player, DrawReason.DRAW_2, socket, session);
          }
          else if(card_play.special == Special.SKIP){
            emitNextPlayer(room, player, "skip", socket, session);
          }
          else if(card_play.special == Special.REVERSE){
            //??????????????????
            room.is_reverse = !room.is_reverse;
            emitNextPlayer(room, player, DrawReason.NOTING, socket, session);
          }
          else if(card_play.special == Special.WILD){
            //???????????????????????????????????????
            room.is_waiting_for_wild = true;
            await room.save({session});
            socket.emit(SocketConst.EMIT.COLOR_OF_WILD, {});
            // setTimeout(() => {
            //     return "time-out-for-change-color";
            //     io.emit("time-out-for-change-color", {socket:socket});
            //   },10000);
            // waitForChangeColor(room, player, DrawReason.NOTING, socket, io);
            //next_player?????????????????????????????????????????????
          }
          else if(card_play.special == Special.WILD_DRAW_4){
            //???????????????????????????????????????
            // waitForChangeColor(room, player, DrawReason.WILD_DRAW_4, socket, io);
            room.is_waiting_for_wild_draw4 = true;
            await room.save();
            socket.emit(SocketConst.EMIT.COLOR_OF_WILD, {});
            // setTimeout(async() => {
            //   if(room.is_waiting_for_wild_draw4){
            //     room.is_waiting_for_wild_draw4 = false;
            //     //????????????????????????????????????????????????????????????????????????
            //     let random_color = Math.floor(Math.random() * 4);
            //     room.current_field.color = random_color;
            //     givePenalty(room, player, session);
            //     emitNextPlayer(room, player, DrawReason.WILD_DRAW_4, socket, session);
            //   }
            //   },10000);
            //next_player?????????????????????????????????????????????
          }
          else if(card_play.special == Special.WILD_SHUFFLE){
            //????????????????????????????????????????????????????????????
            let all_cards = [];
            for(let i = 0; i < room.players_info.length; i++){
              all_cards = all_cards.concat(room.players_info[i].cards);
            }
            //all_cards????????????????????????
            all_cards = shuffle(all_cards);
            //??????????????????????????????????????????????????????????????????
            let temp = JSON.parse(JSON.stringify(room.players_info));//deepcopy
            //sorted_players_info???room.order????????????????????????
            let sorted_players_info = [];
            for(let i = 0; i < room.order.length; i++){
              let player = temp.find((player) => player._id == room.order[i]);
              player.cards = [];
              sorted_players_info.push(player);
            }
            let next_player = getNextPlayer(room);
            let next_player_index = sorted_players_info.findIndex((player) => player._id == next_player._id);
            sorted_players_info.slice(next_player_index).concat(sorted_players_info.slice(0, next_player_index));
            for(let i = 0; i < all_cards.length; i++){
              sorted_players_info[i % sorted_players_info.length].cards.push(all_cards[i]);
            }
            //?????????????????????????????????????????? (player._id????????????????????????????????????cards???????????????)
            for(let i = 0; i < sorted_players_info.length; i++){
              let player = room.players_info.find((player) => player._id == sorted_players_info[i]._id);
              player.cards = sorted_players_info[i].cards;
            }
            //????????????????????????????????????
            for(let i = 0; i < room.players_info.length; i++){
              io.to(room.players_info[i].socket_id).emit(SocketConst.EMIT.SHUFFLE_WILD, {cards_receive:room.players_info[i].cards});
            }
            //??????????????????????????????
            room.current_field.color = previous_color;
            //next_player?????????????????????????????????????????????
            emitNextPlayer(room, player, DrawReason.NOTING, socket, session);
          }
          else if(card_play.special == Special.WHITE_WILD){
            //????????????????????????????????????
            let next_player = getNextPlayer(room);
            //????????????????????????room.binded_players???????????????
            room.binded_players.push({player_id:next_player._id, remain_turn : 2});
            //??????????????????????????????
            room.current_field.color = previous_color;
            card_play.color = previous_color;
            //???????????????????????????????????????????????????????????????????????????
            let number_card_of_player = {};
            room.players_info.forEach((player) => {
              number_card_of_player[player._id] = player.cards.length;
            });
            if(room.winners.length > 0){
              room.winners.forEach((winner) => {
                number_card_of_player[winner] = 0;
              });
            }
            io.sockets.in(room.room_name).emit(SocketConst.EMIT.NOTIFY_CARD, {cards:number_card_of_player, current_field:room.current_field});
            console.log("EVENT EMIT (" + player.player_name +"): NOTIFY_CARD to room " + JSON.stringify(number_card_of_player));
            emitNextPlayer(room, player, DrawReason.NOTING, socket, session);
            
          }
          else if(card_play.special == null || card_play.number != null){
            emitNextPlayer(room, player, DrawReason.NOTING, socket, session);
          }
        }else{
          //????????????????????????????????????????????????
          givePenalty(room, player, session);
        }
      }
    }
  });
}
