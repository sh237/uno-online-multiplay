const mongoose = require('mongoose');

const RoomSchema = mongoose.Schema({
  room_name: {
        deck:[{color:String,special:String,number:Number}],
        player1:[{color:String,special:String,number:Number}],
        player2:[{color:String,special:String,number:Number}],
        player3:[{color:String,special:String,number:Number}],
        player4:[{color:String,special:String,number:Number}],
        order:[String],
        is_reverse:Boolean,
        current_player:String,
      }
});

module.exports = mongoose.model('Room',RoomSchema);