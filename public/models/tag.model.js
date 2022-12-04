require('./db')
const mongoose=require('mongoose')
const Schema = mongoose.Schema

const tagSchema=new Schema({
    name:{
        type: String,
        unique: true
    },
    used:{
        type: Number
    },
}, {timestamps:true})

mongoose.model('Tag',tagSchema)