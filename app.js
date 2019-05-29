//项目启动文件
var express = require('express');//导入express框架
var path = require('path');//导入path模块
var bodyParser = require('body-parser');//导入bodyparser模块，对post请求进行解析
var crypto = require('crypto');//

var app = express();

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var mongoose = require('mongoose');//mongoose是用于异步环境的MongoDB对象模型
var models = require('./models/models');
var User = models.User;
var Note = models.Note;

var checkLogin = require('./checkLogin.js');
var moment = require('moment');

//使用body-parser解析器，格式为json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect('mongodb://localhost:27017/notes',{
    useMongoClient: true
});//MongoDB连接
mongoose.connection.on('error',console.error.bind(console,'连接数据库失败'));
//设置视图文件存放目录
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');
//设置静态文件存放目录
app.use(express.static(path.join(__dirname,'public')));

//使用session中间件
app.use(session({
    key:'session',
    secret:'Keboard cat',
    cookie:{maxAge:1000*60*60*24},//设置session有效时间，单位毫秒
    store: new MongoStore({
        db:'notes',
        mongooseConnection:mongoose.connection
    }),
    resave:false,
    saveUninitialized:true
}));


//笔记列表
app.get('/',checkLogin.noLogin);//检查登录状态
app.get('/',function(req,res){
    Note.find({author:req.session.user.username})//查找note里的用户名
        .exec(function(err,arts){
            if(err){
                console.log(err);
                return res.redirect('/');
            }
            res.render('index',{
                title:'笔记列表',
                user:req.session.user,//
                arts:arts,//
                moment:moment//发布笔记的时间
            });
        });
});

//注册
app.get('/reg',checkLogin.login);
app.get('/reg',function(req,res){
    res.render('register',{
        title:'注册',
        user:req.session.user,
        page:'reg'
    });
});

app.post('/reg',function(req,res){
    var username = req.body.username,
    password = req.body.password,
    passwordRepeat = req.body.passwordRepeat;

    if(password != passwordRepeat){
        console.log('两次输入的密码不一致！');
        return res.redirect('/reg');
    }//检查两次密码是否输入一致

    //检查是否注册过
    User.findOne({username:username},function(err,user){
        if(err){
            console.log(err);
            return res.redirect('/reg');
        }

        if(user) {
            console.log('用户名已经存在');
            return res.redirect('/reg');
        }

        //对密码进行md5加密
        var md5 = crypto.createHash('md5'),
            md5password = md5.update(password).digest('hex');

        var newUser = new User({
            username: username,
            password: md5password
        });
        //保存注册信息
        newUser.save(function(err,doc) {
            if(err) {
                console.log(err);
                return res.redirect('/reg');
            }
            console.log('注册成功！');
            newUser.password = null;
            delete newUser.password;
            req.session.user = newUser;
            return res.redirect('/');
        });
    });
});

//登录
app.get('/login',checkLogin.login);
app.get('/login',function(req,res){
    res.render('login',{
        title:'登录',
        user:req.session.user,
        page:'login'
    });
});

app.post('/login',function(req,res){
    var username = req.body.username,
        password = req.body.password;
        //检查用户是否注册过
        User.findOne({username:username},function(err,user){
            if(err){
                console.log(err);
                return next(err);
            }
    
            if(!user) {
                console.log('用户名不存在');
                return res.redirect('/login');
            }
            //对密码进行md5加密
            var md5 = crypto.createHash('md5'),
                md5password = md5.update(password).digest('hex');
    
            if(user.password != md5password) {
                console.log('密码错误！');
                return res.redirect('/login');
            }

            console.log('登录成功！');
            user.password = null;
            delete user.password;
            req.session.user = user;
            return res.redirect('/');
        });
});

app.get('/quit',function(req,res){
    console.log('退出成功！');
    return res.redirect('/login');
});

//发布笔记
app.get('/post',checkLogin.noLogin);
app.get('/post',function(req,res){
    res.render('post',{
        title:'发布',
        user:req.session.user
    })
});

app.post('/post',function(req,res){
    var note = new Note({
        title:req.body.title,
        author:req.session.user.username,
        tag:req.body.tag,
        content:req.body.content
    });
    //保存笔记
    note.save(function(err,doc){
        if(err){
            console.log(err);
            return res.redirect('/post');
        }
        console.log('文章发表成功!');
        return res.redirect('/');
    });
});

//笔记详情
app.get('/detail/:_id',checkLogin.noLogin);
app.get('/detail/:_id',function(req,res){
    Note.findOne({_id:req.params._id})
        .exec(function(err,art){
            if(err){
                console.log(err);
                return res.redirect('/');
            }
            if(art){
                res.render('detail',{
                    title:'笔记详情',
                    user:req.session.user,
                    arts:art,
                    moment:moment
                });
            }
        });
});



app.listen(8080,function(req,res){
    console.log('app is running at port 8080');
});