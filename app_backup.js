const express=require('express')
const expressLayouts = require('express-ejs-layouts');
const request = require('request');
const path=require('path');
const nunjucks = require('nunjucks');
const axios = require('axios');
const qs = require('qs');
const session = require('express-session');

const app=express()
const port=3000
const NaverStrategy = require('passport-naver').Strategy;

let naver_client_id = 'NWY1AVf5aawwoEtwAGYH';
let naver_client_secret = 'hk2oUlXGL7';
let naver_state = "RAMDOM_STATE";
let naver_token=""
let naver_header=""
let naver_redirectURI = encodeURI("http://127.0.0.1:3000/auth/naver/");
let naver_api_url = "";

let kakao_client_id = '825494';
let kakao_client_secret = 'G074cg2D1Hgy62FXvfUxqDo93XhUu0n1';
let kakao_redirectURI=encodeURI('http://127.0.0.1/3000/auth/kakao/')
let kakao_token=""
let kakao_api_url=""

const url = require('url');
app.use('/css',express.static(path.join(__dirname+'/public/css')))
app.use('/script',express.static(path.join(__dirname+'/public/script')))

app.use(expressLayouts)
app.set('view engine', 'ejs')
app.engine('ejs', require('ejs').__express);

app.get('/', (req,res)=>{
   naver_api_url = 'https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=' + naver_client_id + '&redirect_uri=' + naver_redirectURI + '&state=' + naver_state;
   header=res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'});
   kakao_api_url = `https://kauth.kakao.com/oauth/authorize?client_id=${kakao_client_id}&redirect_uri=${kakao_redirectURI}&response_type=code&scope=profile,account_email`;

   naverbtn="<a href='"+ naver_api_url + "'>네이버 로그인</a>"
   kakaobtn="<a href='"+ kakao_api_url + "'></a>"
   res.render('login', {layout:'./layouts/loginlayout', naverbtn:naverbtn})
})

app.get('/auth/naver/', function (req, res){
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
      res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
      naver_token=JSON.parse(body).access_token
      console.log(naver_token)
      bearerToken = "Bearer " + naver_token; // Bearer 다음에 공백 추가
      res.redirect('/naver/member/'+bearerToken);
    }else{
      res.status(response.statusCode).end();
      console.log('error = ' + response.statusCode);
    }
  });
});

app.get('/naver/member/:token', function (req, res) {
  let api_url = 'https://openapi.naver.com/v1/nid/me';
  let request = require('request');
  let options = {
    url: api_url,
    headers: {'Authorization': req.params.token}
  };
  request.get(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
      resjson=JSON.parse(body).response
      console.log(resjson)
      res.render('main', {layout:'./layouts/full-width' , from:'naver' , title:'calendar', userinfo: JSON.stringify(resjson)})
    } else {
      console.log('error');
      if(response != null) {
        res.status(response.statusCode).end();
        console.log('error = ' + response.statusCode);
      }
    }
  });
});

app.get('/logout', function (req, res) {
  //naver_token=""
  // kakao_token=""
  // res.redirect('/')
});

app.use(session({
  secret:'ras',
  resave:true,
  secure:false,
  saveUninitialized:false,
}))//세션을 설정할 때 쿠키가 생성된다.&&req session의 값도 생성해준다. 어느 라우터든 req session값이 존재하게 된다.

app.get('auth/kakao/', async(req,res)=>{
  //axios>>promise object
  try{//access토큰을 받기 위한 코드
  token = await axios({//token
      method: 'POST',
      url: 'https://kauth.kakao.com/oauth/token',
      headers:{
          'content-type':'application/x-www-form-urlencoded'
      },
      data:qs.stringify({
          grant_type: 'authorization_code',//특정 스트링
          client_id:kakao.clientID,
          client_secret:kakao.clientSecret,
          redirectUri:kakao.redirectUri,
          code:req.query.code,//결과값을 반환했다. 안됐다.
      })//객체를 string 으로 변환
  })
}catch(err){
  res.json(err.data);
}
//access토큰을 받아서 사용자 정보를 알기 위해 쓰는 코드
  let user;
  try{
      console.log(token);//access정보를 가지고 또 요청해야 정보를 가져올 수 있음.
      user = await axios({
          method:'get',
          url:'https://kapi.kakao.com/v2/user/me',
          headers:{
            Authorization: `Bearer ${token.data.access_token}`
          }//헤더에 내용을 보고 보내주겠다.
      })
  }catch(e){
      res.json(e.data);
  }
  console.log(user);
  req.session.kakao = user.data;
  res.send('success');
})

app.listen(port, () => console.info(`App listening on port ${port}`))