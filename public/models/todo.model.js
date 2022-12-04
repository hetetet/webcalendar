require('./db')
const mongoose=require('mongoose')
const Schema = mongoose.Schema

const todoSchema=new Schema({
    title:{
        type: String,
    },
    content:{
        type: String,
    },
    start:{
        type: String,
    }, 
    end:{
        type: String,
    },
    priority:{
        type: Number,
    },  
    tags:{
        type:[String]
    },  
    uploader:{
        type:String
    },
    completed:{
        type:Boolean,
    }
}, {timestamps:true})

mongoose.model('ToDo',todoSchema)