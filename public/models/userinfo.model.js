const mongoose=require('mongoose')
const Schema = mongoose.Schema

const userinfoSchema=new Schema({
    _id:{
        type: String
    },
    name:{
        type: String
    },
    pfpurl:{
        type: String
    },
    bg_color:{
        type: String
    },
    share_category:{
        type: [String]
    }
}, {timestamps:true})

mongoose.model('UserInfo',userinfoSchema)