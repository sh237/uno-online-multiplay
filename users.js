const users = []

const addUser = ({id, player, room_name}) => {
   const numberOfUsersInRoom = users.filter(user => user.room_name === room_name).length
   if(numberOfUsersInRoom === 4)
   return { error: 'Dealer starting. You can not join room' }
//    const id = createId(1000);
   const newUser = { id, player, room_name }
   users.push(newUser)
   return { newUser }
}
// function createId(num){
//     return new Date().getTime().toString(16)  + Math.floor(num*Math.random()).toString(16)
// }

const removeUser = id => {
   const removeIndex = users.findIndex(user => user.id === id)

   if(removeIndex!==-1)
       return users.splice(removeIndex, 1)[0]
}

const getUser = id => {
   return users.find(user => user.id === id)
}

const getUsersInRoom = room_name => {
   return users.filter(user => user.room_name === room_name)
}

module.exports = { addUser, removeUser, getUser, getUsersInRoom }