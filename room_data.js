const mongoose = require('mongoose');

const RoomSchema = mongoose.Schema({
    room_name:String,
    deck:[{color:String,special:String,number:Number}],
    player1:[{color:String,special:String,number:Number}],
    player2:[{color:String,special:String,number:Number}],
    player3:[{color:String,special:String,number:Number}],
    player4:[{color:String,special:String,number:Number}],
    number_of_player:Number,
    order:[String],
    is_reverse:Boolean,
    current_player:Number,
});

// RoomSchema.methods.updateNumOfPlayer = function(room_name) {
//   this.model('Room').update({room_name:room_name}, { $inc: { number_of_user: number_of_user + 1 } }, (error) => {
//   if (error) {
//   console.log(error);
//   } else {
//   console.log('Success!');
//   }
//   });
//   };


RoomSchema.methods.displayRoom = function(callback) {
  this.model('Room').find((error, data) => {
    if (error) {
      console.log(error);
    } else {
      console.log(data);
    }
  });
};

module.exports = mongoose.model('Room',RoomSchema);