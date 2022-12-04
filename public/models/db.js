const mongoose=require('mongoose')

mongoose.connect("mongodb://localhost:27017/Calendar",{useNewUrlParser: true}, (err)=>{
    if(!err){console.log('MongoDB Connection Succeeded')}
    else{console.log('Error in DB connection'+err)}
});

require('./userinfo.model.js')
require('./todo.model.js')
require('./tag.model.js')
require('./category.model.js')