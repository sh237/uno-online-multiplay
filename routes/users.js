var express = require('express');
var router = express.Router();
const User = require('../user_data');

router.get('/', async (req, res) => {
  // res.render('users', {
  //   title: 'ユーザー',
  // });
  const user_data = await User.find({});
  console.log(user_data);
	res.send(user_data);

});
router.get('/delete/:id',async (req,res) => {
  console.log(req.params.id);
  console.log("delete");
  User.findByIdAndRemove(req.params.id, function(err, result) {
    if (err) {
      res.send({'error': 'An error has occurred - ' + err});
    } else {
      console.log('Success: ' + result + ' document(s) deleted');
    }
  });
  res.send("deleted");
})


module.exports = router;
