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
  req.session.destroy()
  naver_api_url = 'https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=' + naver_client_id + '&redirect_uri=' + naver_redirectURI + '&state=' + naver_state;
  naverbtn="<a href='"+ naver_api_url + "'><img height='50' src='http://static.nid.naver.com/oauth/small_g_in.PNG'/></a>"
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
  if(!req.session){
    console.log('no session so redirect to /');
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

  let todo=new ToDo();
  todo.title=req.body.title
  todo.content=req.body.content
  todo.start=req.body.start
  todo.end=req.body.end
  todo.priority=Number(req.body.priority)
  todo.uploader=req.body.uploader
  todo.tags=req.body.tags
  todo.save((err,doc)=>{
    if(err){
      console.log("error:"+err)
    }
  });  
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
      res.send({
        "data":category,
        "users":users
      })  
    })   
  })  
})

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
  // updateTag([],[],()=>{
  //   Category.findOneAndDelete({title:req.body.title},(err,category)=>{
  //     if(err)
  //       console.log('effor on deleting category')
  //   })  
  // })
})

/**
 * 할 일 목록 클라이언트로 넘기기
 */
app.post('/todolist',(req,res)=>{
  let todolist=[];
  console.log(req.body.data)
  ToDo.find({uploader:req.body.data},(err,todos)=>{
    colorlist=['#dc1403','#dda703','#dddd03','#03dd03','#006400','#0370dd'] //우선순위별 색깔
    todos.forEach((todo)=>{
      console.log(todo.title)
      let todoobj={
        title:todo.title,
        color:colorlist[todo.priority],
        start:todo.start,
        end:todo.end
      }          
      todolist.push(JSON.stringify(todoobj))
    })
    console.log(todolist)
    res.send({"data":todolist})    
  })
})

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
    res.send({"data":userlist})    
  })
})

/**
 * 사용자가 생성한 카테고리 목록 클라이언트로 넘기기
 */
app.post('/created-category',(req,res)=>{
  let category_list=[]
  console.log(req.body.data)
    Category.find({uploader:req.body.data},(err,categories)=>{ //본인이 업로드한 카테고리 검색
    //   categories.forEach((category)=>{
    //   let category_obj={
    //     title:category.title,
    //     tags:category.tags,
    //     uploader:category.uploader,
    //     share_user:category.share_user
    //   }          
    //   category_list.push(JSON.stringify(category_obj))
    // })
    console.log(categories) 
    res.send({"data":categories})  
  })
})

/**
 * 사용자가 생성하지는 않았으나 다른 사용자로부터 공유받은 카테고리 목록 클라이언트로 넘기기
 */
app.post('/shared-category',(req,res)=>{
  let category_list=[]
  console.log("shared-category req.body.data[0]: ", req.body.data[0])
    Category.find({uploader:{$ne:req.body.data}, share_user:{$eq:req.body.data}},(err,categories)=>{ //본인은 빼고 검색 , share_user:req.body.data
    console.log("shared category:", categories)     
    res.send({"data":categories}) 
  })
})

/**
 * 게시자: 이연주,
 * 함수 설명: 태그 목록 업데이트하는 함수
 * @param {Array, Array} assigned_tags, removed_tags 
 */
function updateTag(assigned_tags, removed_tags){
  console.log("assigned_tags, before remove foreach: ",assigned_tags)
  //이미 있는 태그는 골라낸다
  let insert_tags=[]
  let update_tags=[]
  Tag.find({name:{$in:assigned_tags}},(err,tags)=>{
  console.log("tags: ",tags)
    tags.forEach((tag)=>{
      console.log("tag.name:", tag.name)
      let del_index=assigned_tags.indexOf(tag.name)
      assigned_tags.splice(del_index,1)
      update_tags.push(tag.name)
    })
  console.log("assigned_tags, after remove foreach: ",assigned_tags)
  //없는 태그들은 오브젝트로 만들어 insertMany
  for(tag in assigned_tags){
    let tagobj={
      name:assigned_tags[tag],
      used:Number(1)
    }
    insert_tags.push(tagobj)
  }
  console.log("insert_tags: ",insert_tags)
  Tag.insertMany(insert_tags,(err,doc)=>{
    if(err){
      console.log("error on insert tags:"+err);
    }
  })
  //기존에 있는 태그는 사용된 횟수 하나씩 늘려주기
  Tag.updateMany({name:{$in:update_tags}}, {$inc: { used: 1 } }, {upsert: false},(err,doc)=>{
      if(err){ //새로 추가된 태그는 사용 횟수를 1 늘린다
        console.log("error on adding tags:"+err);
      }else{ //사용되지 않게 된 태그는 사용 횟수를 1 줄인다.
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
  })


}

app.listen(port, () => console.info(`App listening on port ${port}`))