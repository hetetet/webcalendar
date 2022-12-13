const express=require('express')
const expressLayouts = require('express-ejs-layouts');
const passport=require('passport')
const request = require('request');
const path=require('path')
const axios = require('axios');
const qs = require('qs');
const session = require('express-session');
const fileStore = require('session-file-store')(session);
const bodyparser = require('body-parser');

const mongoose=require('mongoose');
const { execPath } = require('process');
const { log } = require('console');
require('./public/models/db')
const UserInfo=mongoose.model('UserInfo')
const Tag=mongoose.model('Tag')
const ToDo=mongoose.model('ToDo')
const Category=mongoose.model('Category')

const app=express()
const port=3000

let naver_client_id = 'NWY1AVf5aawwoEtwAGYH';
let naver_client_secret = 'hk2oUlXGL7';
let naver_state = "RAMDOM_STATE";
let naver_token=""
let naver_header=""
let naver_redirectURI = encodeURI("http://127.0.0.1:3000/auth/naver/");
let naver_api_url = "http://127.0.0.1:3000/auth/naver/";
//kakao 로그인은 클라이언트인 로그인 페이지에서 구현

const kakao = {
  client_id:'6428537aa64c39b3916f8969429bf7ff',
  clientSecret: 'RKylqiIpflwBHxnLYDYKHuHXrm8WnyPn',
  redirectUri: 'http://127.0.0.1:3000/auth/kakao/'
}

app.use('/css',express.static(path.join(__dirname+'/public/css')))
app.use('/script',express.static(path.join(__dirname+'/public/script')))
app.use('/image',express.static(path.join(__dirname+'/public/image')))
app.use('/fullcalendar',express.static(path.join(__dirname+'/public/fullcalendar')))
app.use('/models',express.static(path.join(__dirname+'/public/models')))
app.use('/font',express.static(path.join(__dirname+'/public/font')))

app.use(expressLayouts)
app.set('view engine', 'ejs')
app.engine('ejs', require('ejs').__express);

app.use(bodyparser.urlencoded({
  extended: true
}));
app.use(bodyparser.json());

app.use(session({
  httpOnly: false,//true,	//자바스크립트를 통해 세션 쿠키를 사용할 수 없도록 함
  secure: true,	//https 환경에서만 session 정보를 주고받도록 처리
  secret: 'secret key',	//암호화하는 데 쓰일 키
  resave: false,	//세션을 언제나 저장할지 설정함
  saveUninitialized: true,	//세션이 저장되기 전 uninitialized 상태로 미리 만들어 저장
  cookie: {	//세션 쿠키 설정 (세션 관리 시 클라이언트에 보내는 쿠키)
    httpOnly: true,
  },
  store: new fileStore()
}));

app.get('/', (req,res)=>{
  console.log("on root with session ",req.session)
  naver_api_url = 'https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=' + naver_client_id + '&redirect_uri=' + naver_redirectURI + '&state=' + naver_state;
  if(req.session.loginby=='naver')
    naver_api_url='/main'
  naverbtn="<a href='"+ naver_api_url + "'><img height='50' src='/image/naver_login_btn.png'/></a>"
  res.render('login', {layout:'./layouts/loginlayout', naverbtn:naverbtn})
})

app.get('/auth/naver/', function (req, res) {
  if(req.session.user && req.session.loginby=='naver'){
    console.log(req.session)
    res.redirect('/main')
  }else{
    console.log("login by naver, no session")
  
  code = req.query.code;
  naver_state = req.query.state;
  naver_api_url = 'https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id='
   + naver_client_id + '&client_secret=' + naver_client_secret + '&redirect_uri=' + naver_redirectURI + '&code=' + code + '&state=' + naver_state;
  const options = {
    url: naver_api_url,
    headers: { 'X-Naver-Client-Id':naver_client_id, 'X-Naver-Client-Secret': naver_client_secret }
  };
  
  request.get(options, function (error, response, body) {
      if(!error && response.statusCode == 200) {
        //res 요청을 2번했다.
        //요청은 한번씩만 적용.
        //res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
        naver_token=JSON.parse(body).access_token

        bearerToken = "Bearer " + naver_token; // Bearer 다음에 공백 추가
        res.redirect('/naver/member/'+bearerToken);
      }else{
        res.status(response.statusCode).end();
        console.log('error = ' + response.statusCode);
      }
    });
  }
});

app.get('/naver/member/:token', function (req, res) {
  console.log(req.params.token)
  let api_url = 'https://openapi.naver.com/v1/nid/me';
  let request = require('request');
  let options = {
    url: api_url,
    headers: {'Authorization': req.params.token}
  };
  request.get(options, function (error, response, body){
    if (!error && response.statusCode == 200) {
      //res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
      resjson=JSON.parse(body).response
      console.log("login by naver, name:", resjson.name)
      console.log("login by naver, naprofile_imageme:", resjson.profile_image)
      req.session.user={
        _id:resjson.id,
        name:resjson.name, 
        pfpurl:resjson.profile_image,
        bg_color:"lightblue", 
        share_category:[],         
      }; //세션 저장
      req.session.loginby='naver'
      req.session.save(function(err){
        res.redirect('/main');
      });
    }else{
      console.log('error');
      if(response != null) {
        res.status(response.statusCode).end();
        console.log('error = ' + response.statusCode);
      }
    } 
  });
});

app.get('/auth/kakao/',async(req,res)=>{
  console.log("start auth kakao");
  if(req.session.user && req.session.loginby=='kakao'){
    console.log("before authorize: ", req.session)
    res.redirect('/main')
  }else{
    console.log("before authorize: no session")  
    console.log("code: ", req.query.code);

    let token;
    let user;
    try{
        token = await axios({
          method: 'POST',
          url: 'https://kauth.kakao.com/oauth/token',
          headers:{
              'Content-type':'application/x-www-form-urlencoded;charset=utf-8'
          },          
          //data: `grant_type=authorization_code&client_id=${kakao.client_id}&redirect_uri=${kakao.redirectUri}&code=${req.query.code}&client_secret=${kakao.clientSecret}`
          data: qs.stringify({//객체를 string 으로 변환
            grant_type: 'authorization_code',//특정 스트링
            client_id:kakao.client_id,
            redirect_uri:kakao.redirectUri,
            code:req.query.code,
            client_secret:kakao.clientSecret
          })
      })  
    }catch(err){
      console.log("err", err);
      res.json(err.data);
    }  

    try{
        console.log("access token: ", token.data);//access정보를 가지고 또 요청해야 정보를 가져올 수 있음.
        user = await axios({
          method:'GET',
          url:'https://kapi.kakao.com/v2/user/me',
          headers:{
            'Authorization': `Bearer ${token.data.access_token}`
          }
        })
    }catch(e){
      console.log("error!", e);
      res.json(e);
    }
    let userdata={
      _id:user.data.id,
      name:user.data.properties.nickname, 
      pfpurl:user.data.properties.profile_image,
      bg_color:"lightblue", 
      share_category:[],   
    }
    req.session.user=userdata; //세션 저장
    req.session.loginby='kakao'
    req.session.save()

    res.redirect('/main')
  }
});

app.get('/main',(req,res)=>{
  if(!req.session.user){
    console.log('no user session so redirect to /');
    res.redirect('/')
  }
  else{
    console.log("req.session.user.id:", req.session.user._id)
    UserInfo.find({_id: req.session.user._id}, (error, doc) => {      
      if(doc.length==0){
        let userInfo=new UserInfo()
        userInfo._id=req.session.user._id
        userInfo.name=user.data.properties.nickname, 
        userInfo.pfpurl=user.data.properties.profile_image,
        userInfo.bg_color="lightblue", 
        userInfo.share_category=[],         
        userInfo.save((err,doc)=>{
          if(err){
            console.log("error:"+err)
          }
        }); 
      }else{
        req.session.user=doc[0];
        console.log("req.session.user: ", req.session.user)
      }
      res.render('main', {layout:'./layouts/full-width' , title:'calendar', loginby:req.session.loginby, userinfo: JSON.stringify(req.session.user)})
    })
  }
})

app.get('/logout',(req,res)=>{
  res.redirect('http://nid.naver.com/nidlogin.logout');
})

app.get('/dashboard',(req,res)=>{
  res.render('dashboard', {layout:'./layouts/full-width', title:'calendar-dashboard', loginby:req.session.loginby, userinfo: JSON.stringify(req.session.user)})
})

app.get('/stats',(req,res)=>{
  res.render('stats', {layout:'./layouts/full-width', title:'calendar-statistics', loginby:req.session.loginby, userinfo: JSON.stringify(req.session.user)})
})

app.get('http://nid.naver.com/nidlogin.logout',(req,res)=>{
  res.redirect('http://nid.naver.com/nidlogin.logout');
})

/**
 * 대시보드에서 생성한 일정 받기
 */
app.post('/savetodo',(req,res)=>{
  console.log(req.body)
  updateTag(req.body.tags,[])

  ToDo.updateOne({title:req.body.title, uploader:req.body.uploader},
    {$set:{
        title:req.body.title, 
        content:req.body.content, 
        start:req.body.start,
        end:req.body.end,
        allday:req.body.allday,
        priority:Number(req.body.priority),
        uploader:req.body.uploader,
        tags:req.body.tags, share_user:req.body.share_user, 
        completed:false
      }},{upsert:true},(err,doc)=>{
    console.log("req.body.removetags:", req.body.removetags)
    updateTag(req.body.tags, req.body.removetags)
  })
})

/**
 * 칼라 바꾸기
 */
app.post('/changecolor',(req,res)=>{
  console.log("req.body.color: ", req.body.color)
  console.log("req.session.user.id: ", req.body._id)
  UserInfo.findOneAndUpdate({_id:req.body._id}, { $set: { bg_color: req.body.color } },(err,doc)=>{
    if(err){
      console.log("error:"+err);
    }
  }) 
})

/**
 * 생성한 카테고리 저장하기
 */
app.post('/savecategory',(req,res)=>{
  Category.updateOne({title:req.body.title},{$set:{title:req.body.title, tags:req.body.tags, share_user:req.body.share_user, uploader:req.body.uploader}},{upsert:true},(err,doc)=>{
    console.log("req.body.removetags:", req.body.removetags)
    updateTag(req.body.tags, req.body.removetags)
  })
})

/**
 * 수정할 카테고리의 정보를 보내기
 */
app.post('/readcategory',(req,res)=>{
  Category.findOne({title:req.body.title},(err,category)=>{
    console.log("category:", category)
    console.log("category.share_user:", category.share_user)
    UserInfo.find({_id:{$in:category.share_user}},(err,users)=>{
      console.log("share_user:", users)
      return res.send({
        "data":category,
        "users":users
      })  
    })   
  })  
})

/**
 * 카테고리 삭제하기
 */
app.post('/deletecategory',(req,res)=>{
  console.log("title:", req.body.title)  
  Category.findOne({title:req.body.title},(err,category)=>{
    console.log(category);
    updateTag([],category.tags)
    Category.deleteOne({title:req.body.title},(err,doc)=>{
      if(err){
        console.log("error on deleting category:"+err);
      }
    })
  })  
})

/**
 * 할 일 목록 클라이언트로 넘기기
 */
app.post('/todolist',async(req,res)=>{
  let todolist=[];
  console.log(req.body.data)
  try{
    let todos=await ToDo.find({uploader:req.body.data})
    colorlist=['#dc1403','#dda703','#dddd03','#03dd03','#006400','#0370dd'] //우선순위별 색깔
    for(let index=0;index<todos.length;index++){
      let todoobj={
        _id:todos[index]._id,
        allday:todos[index].allday,
        title:todos[index].title,
        color:colorlist[todos[index].priority],
        start:todos[index].start,
        end:todos[index].end
      }          
      todolist.push(JSON.stringify(todoobj))   
    }
    let categories=await Category.find({share_user:req.body.data}) //유저가 공유받은 카테고리 목록
    let share_todos=await ToDo.find({uploader:{$ne:req.body.data}}) //유저가 만들지 않은 일정 목록
    for(let i=0;i<categories.length;i++){
      for(let j=0;j<share_todos.length;j++){
        if(isSubArray(share_todos[j].tags,categories[i].tags)){
          let todoobj={
            _id:share_todos[j]._id,
            allday:share_todos[j].allday,
            title:share_todos[j].title,
            color:colorlist[share_todos[j].priority],
            start:share_todos[j].start,
            end:share_todos[j].end
          }          
          todolist.push(JSON.stringify(todoobj))           
        }
      }
    }

    return res.send({"data":todolist})
  }catch(e){
    console.log(e);
  }
})

/**
 * 오늘 일정 클라이언트로 넘기기
 */
app.post('/getdayevent',async(req,res)=>{
  let todolist=[];
  console.log(req.body.data)
  try{
    let todos=await ToDo.find({uploader:req.body.data})
    for(let index=0;index<todos.length;index++){
      let todoobj={
        _id:todos[index]._id,
        allday:todos[index].allday,
        title:todos[index].title,
        start:todos[index].start,
        end:todos[index].end,
        content:todos[index].content,
        completed:todos[index].completed
      }          
      todolist.push(JSON.stringify(todoobj))   
    }
    let categories=await Category.find({share_user:req.body.data}) //유저가 공유받은 카테고리 목록
    let share_todos=await ToDo.find({uploader:{$ne:req.body.data}}) //유저가 만들지 않은 일정 목록
    for(let i=0;i<categories.length;i++){
      for(let j=0;j<share_todos.length;j++){
        if(isSubArray(share_todos[j].tags,categories[i].tags)){
          let todoobj={
            _id:share_todos[j]._id,
            allday:share_todos[j].allday,
            title:share_todos[j].title,
            start:share_todos[j].start,
            end:share_todos[j].end,
            content:share_todos[j].content,
            completed:share_todos[j].completed
          }          
          todolist.push(JSON.stringify(todoobj))           
        }
      }
    }

    return res.send({"data":todolist})
  }catch(e){
    console.log(e);
  }
})

/** 
 * @param {Array} haystack 
 * @param {Array} needle 
 * needle이 haystack의 subarray인지 판별하는 함수
 */
function isSubArray(haystack,needle){
  for(let i=0;i<needle.length;i++){
    if(!haystack.includes(needle[i]))
      return false;
  }
  return true;
}

/**
 * 사용자 목록 클라이언트로 넘기기
 */
 app.post('/userlist',(req,res)=>{
  let userlist=[];
  console.log(req.body.data)
  UserInfo.find({_id:{$nin:req.body.data}},(err,users)=>{ //본인은 빼고 검색
    users.forEach((user)=>{
      let userobj={
        _id:user._id,
        name:user.name,
        pfpurl:user.pfpurl
      }          
      userlist.push(JSON.stringify(userobj))
    })
    console.log(userlist)
    return res.send({"data":userlist})    
  })
})

/**
 * 사용자가 생성한 카테고리 목록 클라이언트로 넘기기
 */
app.post('/created-category',(req,res)=>{
  let category_list=[]
  console.log(req.body.data)
    Category.find({uploader:req.body.data},(err,categories)=>{ //본인이 업로드한 카테고리 검색
    console.log(categories) 
    return res.send({"data":categories})  
  })
})

/**
 * 사용자가 생성하지는 않았으나 다른 사용자로부터 공유받은 카테고리 목록 클라이언트로 넘기기
 */
app.post('/shared-category', async(req,res)=>{
  try{
    let categories = await Category.find({uploader:{$ne:req.body.data}, share_user:{$eq:req.body.data}})
    let categoryUsers = []
    for(let categoryindex = 0;categoryindex<categories.length;categoryindex++) {
      categoryUsers = [...categoryUsers,...categories[categoryindex].share_user]
    }
    
    let userlist = await UserInfo.find({_id:{$in:categoryUsers}})
    let userMap = new Map();
    for(let i=0;i<userlist.length;i++) {
      userMap.set(userlist[i]._id.toString(),userlist[i].name)
    }

    for(let i=0;i<categories.length;i++) {
      let tempUsers = []
      for(let j=0;j<categories[i].share_user.length;j++) {
        let temp = userMap.get(categories[i].share_user[j])
        if(temp) {
          tempUsers.push(temp)
        }
      }
      categories[i].share_user = tempUsers
    }
    return res.send({
      "data":categories,
    }) 
  }
  catch(e){
    console.log(e)
    return res.send({
      "data":[],
    }) 
  }
})

/**
 * 게시자: 이연주,
 * 함수 설명: 태그 목록 업데이트하는 함수
 * @param {Array, Array} assigned_tags, removed_tags 
 */
async function updateTag(assigned_tags, removed_tags){
  //기존에 있는 태그는 사용된 횟수 하나씩 늘려주기  
  try{
    let update_tag_arr=[]
    let update_tags=await Tag.find({name:{$in:assigned_tags}})
    for(let update_tag=0;update_tag<update_tags.length;update_tag++){
      update_tag_arr.push(update_tags[update_tag].name)
      let index=assigned_tags.indexOf(update_tags[update_tag].name)
      assigned_tags.splice(index,1)
    }
    console.log("assigned_tags: ",assigned_tags) //삽입할 태그
    console.log("update_tag_arr: ",update_tag_arr) //업데이트할 태그

    let insert_tags=[] //삽입할 태그를 객체로 만들어서 저장하는 곳
    for(tag in assigned_tags){
      let tagobj={
        name:assigned_tags[tag],
        used:1
      }
      insert_tags.push(tagobj)
    }
    console.log("insert_tags: ",insert_tags)
    await Tag.insertMany(insert_tags,(err,doc)=>{
      if(err){
        console.log("error on insert tags:"+err);
      }
    })

    await Tag.updateMany({name:{$in:update_tag_arr}}, {$inc: { used: 1 } }, {upsert: false},(err,doc)=>{
      if(err){ //새로 추가된 태그는 사용 횟수를 1 늘린다
        console.log("error on adding tags:"+err);
      }else{ //사용되지 않게 된 태그는 사용 횟수를 1 줄인다.(업데이트 전 후에 모두 존재했던 태그는 횟수가 1이 줄었다가 다시 1 늘어나게 됨)
        Tag.updateMany({name:{$in:removed_tags}}, {$inc: { used: -1 } }, {upsert: false},(err,doc)=>{
          if(err){
            console.log("error on declining used of removed tags:"+err);
          }
          Tag.deleteMany({used:0},(err,doc)=>{ // 앞의 두 연산 후 사용 횟수가 0이 된 태그는 지운다.
            if(err){
              console.log("error on deleting tags:"+err);
            }
          })
        }) 
      }
    })
  }catch(err){
    console.log(err)
  }
}  
  

/**
 * 선택한 카테고리에 해당되는 일정 목록 전달하기
 */
app.post('/show-certain-cat',(req,res)=>{
  Category.findOne({title:req.body.title},(err,doc)=>{
    let todolist=[]
    ToDo.find({tags:{$all : doc.tags}},(err,todos)=>{
      colorlist=['#dc1403','#dda703','#dddd03','#03dd03','#006400','#0370dd'] //우선순위별 색깔
      todos.forEach((todo)=>{
        let todoobj={
          allday:todo.allday,
          title:todo.title,
          color:colorlist[todo.priority],
          start:todo.start,
          end:todo.end
        }          
        todolist.push(JSON.stringify(todoobj))
      })
      return res.send({"data":todolist}) 
    })
  })
})

app.post('/taglist',async(req,res)=>{
  let taglist=[]
  let tags= await Tag.find({})

  for(let index=0;index<tags.length;index++){
    let tagobj={
      name:tags[index].name,
      used:tags[index].used
    }
    taglist.push(tagobj)
  }

  let todonum=await ToDo.find({}).count()
  return res.send({
    "taglist":taglist,
    "todonum":todonum
  })
})

app.post('/checktodo',(req,res)=>{
  console.log(req.body._id, req.body.completed)
  ToDo.findOneAndUpdate({_id:req.body._id},{$set:{completed:req.body.completed}},(err,doc)=>{
    console.log(doc)
    return res.send({"data":doc})
  })
})

app.listen(port, () => console.info(`App listening on port ${port}`))