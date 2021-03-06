const express = require('express');
const routes = express.Router();

const server = require('./promise'),
    getNoTokenMsg = server.getNoTokenMessage;

/**
 *
 * account：登录、注册、找回密码等
 *
 * */
//登陆
routes.get('/login', function (req, res) {
   res.render('account/login', {
       mark: 'account',
       title: '语言桥 | 用户登录',
       layout: 'shared/layout'
   });
});
//注册
routes.get('/register', function (req, res) {
   res.render('account/register', {
       mark: 'account',
       title: '语言桥 | 用户注册',
       layout: 'shared/layout'
   });
});
//忘记密码
routes.get('/forgetPwd', function (req, res) {
   res.render('account/forgetPwd', {
       mark: 'account',
       title: '语言桥 | 忘记密码',
       layout: 'shared/layout'
   });
});

/*
*
*  首页：index
*  关于我们：about
*
* */

//首页
routes.get('/',function (req, res) {
    //行业资讯
    let industry = getNoTokenMsg({
        url: '/officialArticle/listOfficialArticle',
        data: {
            pageNo: 0,
            pageSize: 2
        }
    });
    //译员精选
    let pecker = getNoTokenMsg({
        url: '/interpreterArticle/interpreterArticleListSelect',
        data: {
            pageNo: 0,
            pageSize: 2
        }
    });
    Promise.all([industry, pecker]).done(data => {
        res.render('index', {
            mark: 'index',
            title: '语言桥兼职平台',
            layout: 'shared/layout',
            industry: JSON.parse(data[0]),
            pecker: JSON.parse(data[1])
        })
    })
});
//关于我们
routes.get('/about/', function (req, res){
    res.render('about/index', {
        mark: 'aboutExtra',
        title: '语言桥 | 关于我们',
        layout: 'shared/layout'
    });
});
//帮助中心
routes.get('/about/help', function (req, res){
    res.render('about/help', {
        mark: 'about',
        title: '语言桥 | 帮助中心',
        layout: 'shared/layout'
    });
});
//服务条款
routes.get('/about/clause', function (req, res){
    res.render('about/clause', {
        mark: 'about',
        title: '语言桥 | 服务条款',
        layout: 'shared/layout'
    });
});
//隐私条款
routes.get('/about/secret', function (req, res){
    res.render('about/secret', {
        mark: 'about',
        title: '语言桥 | 隐私条款',
        layout: 'shared/layout'
    });
});

module.exports = routes;