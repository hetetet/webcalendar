require('./db')
const mongoose=require('mongoose')

const Schema = mongoose.Schema

const categorySchema=new Schema({
    title:{
        type: String,
    },  
    tags:{
        type:[String]
    },  
    uploader:{
        type:String
    },
    share_user:{
        type:[String]
    }
}, {timestamps:true})

mongoose.model('Category',categorySchema)