var express = require('express');
var router = express.Router();
const Room = require('../room_data');

router.get('/', async (req, res) => {
	const room_data = await Room.find({});
	res.json(room_data);
});

//全てのデータを消す
router.get('/delete',async (req,res) => {
	  console.log("delete");
	  Room.deleteMany({}, function(err, result) {
		if (err) {
		  res.send({'error': 'An error has occurred - ' + err});
		}
		else {
			console.log('Success: ' + result + ' document(s) deleted');
		}
	});
	res.send("deleted");
});


module.exports = router;
