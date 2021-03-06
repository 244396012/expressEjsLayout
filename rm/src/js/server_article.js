/*
* module：views -> article、personalArticle （文章管理模块）
* export：articleServer
* author: zy
* date: 2019/07/17
*
* */

import { getResponse } from "./asyncAjax";
import { getQueryString, throttleFn } from "./utils";
import { baseRMUrl } from "./interceptor";
import './modal';

const articleServer = (function (global, document, $, undefined){

    'use strict';
/*
*
* 文章详情添加click事件委托
*
* */
    $('div.article_pageDetail').on('click', function (e) {
        let event = e || global.event,
            targetEl = event.target || event.srcElement;
        if(targetEl.nodeType !== 1) return;

        //加载更多评论
        if(targetEl.classList.contains('loadMoreCommentBtn')){
            getCommentsList()
        }else if(targetEl.classList.contains('cancel')){ //取消“评论回复”框
            targetEl.parentNode.parentNode.remove()
        }else if(targetEl.classList.contains('replyIcon')){ //显示"评论回复"框
            let parentNode = targetEl.parentNode,
                isExistNextEl = targetEl.nextElementSibling;
            let nextEl = document.createElement('div');
            nextEl.className = 'add-comment';
            nextEl.innerHTML = `<textarea placeholder="欢迎留言评论哦~"></textarea>
                                <div class="sy-right">
                                    <button type="button" class="sy-btn sy-btn-white sy-btn-md cancel">取消</button>
                                    <button type="button" class="sy-btn sy-btn-green sy-btn-md release">发布</button>
                                </div>`;
            if(!isExistNextEl){
                parentNode.appendChild(nextEl);
            }else if(isExistNextEl.className !== 'add-comment'){
                parentNode.insertBefore(nextEl, isExistNextEl);
            }

        }else if(targetEl.nodeName === 'I' && $(targetEl).hasClass('icon-thumbs')){ //添加“点赞”功能
            const isOfficial = getQueryString('ofi') ? 1 : 0;
            $.ajax({
                type: 'put',
                url: baseRMUrl+'/interpreterArticle/articleLike',
                data: {
                    articleId: getQueryString('aid'),
                    type: isOfficial
                },
                success: function (res) {
                    if(res.message==='success'){
                        $.success('已点赞');
                        setTimeout('location.reload(true);', 1000);
                    }else if(res.code === '120'){
                        $.warning(res.message);
                    }else{
                        $.error(res.message);
                    }
                },
                error: function (xhr) {
                    if(xhr.status === 401 || xhr.responseJSON.error === 'invalid_token'){
                        $.warning('请先登录');
                    }
                }
            })
        }else if($(targetEl).hasClass('AddCommentBtn')){//发布评论
            const textArea = $(targetEl).parent().prev();
            if(textArea[0].value.trim() === ''){
                $.warning('请输入评论内容');
                return false;
            }
            const globalData = sessionStorage.getItem('sy_rm_client_ubase');
            const nickName = globalData ? JSON.parse(globalData).nickName : '';
            targetEl.innerHTML = '<i class="am-icon-spinner am-icon-pulse"></i>';
            targetEl.setAttribute('disabled', true);
            $.ajax({
                type: 'post',
                url: baseRMUrl + '/commentAndLog/addComment',
                data: {
                    bussinessId: getQueryString('aid'),
                    commentContent: textArea[0].value,
                    nickName: nickName
                },
                success: function (res) {
                    if(res.code === '200'){
                        $.success('评论成功');
                        $('.commentList').empty();
                        $('.commentPageNo').val(1);
                        textArea[0].value = '';
                        getCommentsList();
                    }else{
                        $.error(res.message);
                    }
                },
                error: function (xhr) {
                    if(xhr.status === 401 || xhr.responseJSON.error === 'invalid_token'){
                        $.warning('请先登录');
                    }
                },
                complete: function () {
                    targetEl.innerHTML = '发布';
                    targetEl.removeAttribute('disabled');
                }
            });
        }else if(targetEl.classList.contains('release')){//添加回复
            const parentNode = $(targetEl).parent(),
                textArea = parentNode.prev();
            if(textArea[0].value.trim() === ''){
                $.warning('请输入评论内容');
                return null;
            }
            let localData = '';
            const localDataEl = $(targetEl).parents('.add-comment').prev().prev('.replyData');
            if(localDataEl.length > 0){
                localData = JSON.parse(localDataEl.html());
            }
            let globalData = sessionStorage.getItem('sy_rm_client_ubase');
            const nickName = globalData ? JSON.parse(globalData).nickName : '';
            targetEl.innerHTML = '<i class="am-icon-spinner am-icon-pulse"></i>';
            targetEl.setAttribute('disabled', true);
            $.ajax({
                type: 'post',
                url: baseRMUrl + '/commentAndLog/addCommentReply',
                data: {
                    commentId: localData.commentId,
                    replyContent: textArea[0].value,
                    replyTarget: localData.replyTarget,
                    nickName: nickName
                },
                success: function (res) {
                    if(res.code === '200'){
                        $.success('回复成功');
                        $('.commentList').empty();
                        $('.commentPageNo').val(1);
                        textArea.value = '';
                        getCommentsList();
                    }else{
                        $.error(res.message);
                    }
                },
                error: function (xhr) {
                    if(xhr.status === 401 || xhr.responseJSON.error === 'invalid_token'){
                        $.warning('请先登录');
                    }
                },
                complete: function () {
                    targetEl.innerHTML = '发布';
                    targetEl.removeAttribute('disabled');
                }
            });
        }else if($(targetEl).hasClass('delete')){
            $.confirm();
            $('.confirmModal').modal({
                closeViaDimmer: false,
                onConfirm: function (e) {
                    const aid = getQueryString('aid'),
                        token = sessionStorage.getItem('sy_rm_client_access_token'),
                        uid = sessionStorage.getItem('sy_rm_client_ud');
                    getResponse({
                        type: 'delete',
                        url: '/interpreterArticle/deleteInterpreterArtile?id='+ aid
                    }).then(res => {
                        if(res.message === 'success'){
                            $.success('文章已删除');
                            setTimeout(() => {
                                location.href = '/p-article/list?t='+token+'&u='+uid;
                            }, 1000);
                        }else{
                            $.error(res.message);
                        }
                    })
                },
                onCancel: function (e) { }
            });
        }
    });

//获取评论列表
    function getCommentsList(size = 5) {
        let moreBtn = $(".loadMoreCommentBtn"),
            pageEl = $('.commentPageNo'),
            pageNo = +pageEl.val();
        const articleAuthor = getQueryString('ofi') !== '1' ? $('h5.name').text() : '4028c6536e5e3c2c016e5f69ffc50000',
            baseInfo = JSON.parse(sessionStorage.getItem('sy_rm_client_ubase')) || {};
        getResponse({
            type: 'post',
            url: '/commentAndLog/getCommentAndReply',
            data: {
                bussinessId: getQueryString('aid'),
                pageNo: pageNo - 1,
                pageSize: size
            }
        }).then(res => {
            if(res && res.results.length >= 0){
                let bodyStr = '', replyArr = [];
                res.results.forEach(item => {
                    let replyStr = '';
                    item.replies.forEach(item1 => {
                        const isAuthor1 = articleAuthor === item1.userNickName;
                        replyStr += `<div class="item">
                                        <div class="head">
                                            <img src="${item1.userHeadId ? item1.userHeadId:'/static/image/index-default-head.png'}" width="60" height="60" alt="">
                                        </div>
                                        <div class="comment-cnt">
                                            <h5 class="title ${isAuthor1 ? 'author' : ''}">${item1.userNickName}</h5>
                                            <span class="time">${item1.replyTime}</span>
                                            <div class="txt">${item1.content}</div>
                                        </div>
                                    </div>`;
                    });
                    const tempObj = {
                        commentId: item.id,
                        replyTarget: item.userNickName
                    };
                    const isSelf = baseInfo.nickName === item.userNickName,
                        isAuthor = articleAuthor === item.userNickName,
                        isReply = !isSelf ? `<div class="reply">
                                                    <div class="replyData sy-hidden">${JSON.stringify(tempObj)}</div>
                                                    <div class="reply-icon replyIcon">回复</div>
                                                    ${replyStr}
                                                </div>` : '';
                    replyArr.push(`<div class="item">
                                    <div class="head">
                                        <img src="${item.userHeadId ? item.userHeadId:'/static/image/index-default-head.png'}" width="60" height="60" alt="">
                                    </div>
                                    <div class="comment-cnt">
                                        <!-- 作者本人，添加class：author -->
                                        <h5 class="title ${isAuthor ? 'author' : ''}">${item.userNickName}</h5>
                                        <span class="time">${item.createTime}</span>
                                        <div class="txt">${item.content}</div>
                                        ${isReply}
                                    </div>
                                </div>`);
                });
                pageNo += 1;
                pageEl.val(pageNo);
                if(res.results.length > 0){
                    bodyStr = replyArr.join('');
                    moreBtn.removeClass('sy-hidden');
                }else if(res.totalCount === 0){
                    bodyStr = `<p class="empty">暂无评论</p>`;
                    moreBtn.addClass('sy-hidden');
                }
                if(res.pageCount === pageNo - 1){
                    moreBtn.addClass('sy-hidden');
                }
                $('.commentList').append(bodyStr);
            }
            moreBtn.removeAttr('disabled').html('加载更多');
        })
    }
//啄语者列表
    function getGoodArticle(size = 10) {
        let moreBtn = $(".loadMoreBtn_Speaker"),
            pageEl = $('.loadMorePageNo_Speaker'),
            pageNo = +pageEl.val();
        $.loading('获取数据');
        getResponse({
            url: '/interpreterArticle/interpreterArticleListSelect',
            data: {
                pageNo: pageNo,
                pageSize: size,
                userId: '0'
            }
        }).then(res => {
            pageNo < 1 && $('div.goodArticleCnt').empty();
            if(res.message ==='success'){
                let bodyStr = '', listArr = [],
                    content = res.data.content;
                content.forEach(item => {
                    //为精选时，添加class：well
                    listArr.push(`<div class="item ${item.isFeatured?'well':''}">
                                   <div class="img"><img src="${item.coverId}" alt=""></div>
                                   <div class="absolute">${item.lable}</div>
                                   <div class="item-cnt">
                                       <a href="/article/detail?aid=${item.id}&uid=${item.publishUserId}">
                                           <h5>${item.articleTitle}</h5>
                                       </a>
                                       <p>${item.partContent}</p>
                                       <div class="am-g">
                                           <div class="am-u-sm-2 short-nick-name">
                                               <a href="/article?uid=${item.publishUserId}">
                                                  <img src="/static/image/index-default-head.png" alt="">${item.publishNickName}
                                               </a>
                                           </div>
                                           <div class="am-u-sm-7">${item.publishTime?item.publishTime:''}</div>
                                           <div class="am-u-sm-1">
                                               <i class="sy-icon icon-eye"></i>${item.viewCount}
                                           </div>
                                           <div class="am-u-sm-1">
                                               <i class="sy-icon icon-thumbs"></i>${item.likeNumber}
                                           </div>
                                           <div class="am-u-sm-1">
                                               <i class="sy-icon icon-commenting"></i>${item.commentsNumber}
                                           </div>
                                       </div>
                                   </div>
                               </div>`);
                });
                pageNo += 1;
                pageEl.val(pageNo);
                if(res.data.content.length > 0){
                    bodyStr = listArr.join('');
                    moreBtn.removeClass('sy-hidden');
                } else if(res.data.totalElements === 0){
                    bodyStr = `<div class="empty"></div>`;
                    moreBtn.addClass('sy-hidden');
                }
                if(res.data.totalPages === pageNo){
                    moreBtn.addClass('sy-hidden');
                }
                $('.goodArticleCnt').append(bodyStr);
            }else{
                $.error(res.message);
                $('.personalArticleList').html('<div class="empty"></div>')
            }
            moreBtn.removeAttr('disabled').html('加载更多');
            $('.my-loading').remove()
        });
    }
//行业资讯列表
    function getIndustryArticle(size = 10){
        let moreBtn = $(".loadMoreBtn_Industry"),
            pageEl = $('.loadMorePageNo_Industry'),
            pageNo = +pageEl.val();
        $.loading('获取数据');
        getResponse({
            url: '/officialArticle/listOfficialArticle',
            data: {
                pageNo: pageNo,
                pageSize: size
            }
        }).then(res => {
            pageNo < 1 && $('div.goodArticleCnt').empty();
            if(res.message ==='success'){
                let bodyStr = '', listArr = [],
                    content = res.data.content;
                content.forEach(item => {
                    listArr.push(`<div class="item">
                                <div class="img"><img src="${item.coverId}" alt=""></div>
                                <div class="item-cnt">
                                    <a href="/article/i-detail?ofi=1&aid=${item.id}">
                                        <h5>${item.articleTitle}</h5>
                                    </a>
                                    <p>${item.partContent}</p>
                                    <div class="am-g">
                                        <div class="am-u-sm-6" style="width: 70%">${item.publishTime?item.publishTime:''}</div>
                                        <div class="am-u-sm-2 sy-right" style="width: 10%">
                                            <i class="sy-icon icon-eye"></i>${item.viewCount}
                                        </div>
                                        <div class="am-u-sm-2 sy-right" style="width: 10%">
                                            <i class="sy-icon icon-thumbs"></i>${item.likeCount}
                                        </div>
                                        <div class="am-u-sm-2 sy-right" style="width: 10%">
                                            <i class="sy-icon icon-commenting"></i>${item.commentsCount}
                                        </div>
                                    </div>
                                </div>
                             </div>`);
                });
                pageNo += 1;
                pageEl.val(pageNo);
                if(res.data.content.length > 0){
                    bodyStr = listArr.join('');
                    moreBtn.removeClass('sy-hidden');
                }else if(res.data.totalElements === 0){
                    bodyStr = `<div class="empty"></div>`;
                    moreBtn.addClass('sy-hidden');
                }
                if(res.data.totalPages === pageNo){
                    moreBtn.addClass('sy-hidden');
                }
                $('.goodArticleCnt').append(bodyStr);
            }
            moreBtn.removeAttr('disabled').html('加载更多');
            $('.my-loading').remove()
        })
    }

/*
*  ------------------------ 分割线
* 文章管理（本人可见）
*
* */
//“发表/编辑”文章标题限制长度50个字符
    $('.controlArticleTitleLength').on('input', throttleFn(function () {
        let _this = this;
        let val = _this.value,
            len = val.length;
        let nextEl = _this.nextElementSibling;
        if(len >= 50){
            $.warning('标题长度超过限制');
            _this.value = val.slice(0,50);
            nextEl.innerHTML =  _this.value.length + '/50';
            return null;
        }
        nextEl.innerHTML =  len + '/50';
    }, 500));
//“发布/编辑”文章预览文章
    function previewArticle() {
        const title = document.getElementsByClassName('createArticle_Title')[0],
            label = document.getElementsByClassName('createArticle_Label')[0],
            coverUrl = document.getElementsByClassName('createArticle_CoverUrl')[0],
            editor = document.getElementsByClassName('w-e-text')[0];
        const elArr = [title, label, coverUrl, editor];
        for(let i = 0, len = elArr.length; i < len; i++){
            const el = elArr[i];
            let content = el.className === "w-e-text" ? (el.innerText || el.textContent) : el.value;
            if(content.trim() === ''){
                el.focus();
                $.warning('请填写相关信息');
                return null;
            }
        }
        const user = JSON.parse(sessionStorage.getItem('sy_rm_client_ubase'));
        const previewData = {
            title: title.value,
            label: label.value,
            coverUrl: coverUrl.value,
            content: editor.innerHTML,
            createTime: __bundle__.formatTime(new Date()),
            author: user.nickName,
            picture: user.picture
        };
        sessionStorage.setItem('previewArticle', JSON.stringify(previewData));
        window.open("/p-article/preview", "_blank");
    }
//“发布/编辑”发布文章（草稿、正式发布）
    function releaseArticle(e, status = 0){
        // status 0 草稿 1 提交
        const event = e || window.event;
        const title = document.getElementsByClassName('createArticle_Title')[0],
            label = document.getElementsByClassName('createArticle_Label')[0],
            coverUrl = document.getElementsByClassName('createArticle_CoverUrl')[0],
            editor = document.getElementsByClassName('w-e-text')[0];
        const elArr = [title, label, coverUrl, editor];
        for(let i = 0, len = elArr.length; i < len; i++){
            const el = elArr[i];
            let content = el.className === "w-e-text" ? (el.innerText || el.textContent) : el.value;
            if(content.trim() === ''){
                el.focus();
                $.warning('请填写相关信息');
                return null;
            }
        }
        event.target.setAttribute('disabled', true);
        event.target.innerHTML = '<i class="am-icon-spinner am-icon-pulse"></i>';
        let partTxt = editor.innerText || editor.textContent;
        if(event.target.classList.contains('confirm')){
            status = 1;
        }
        let type = 'post',
            url = '/interpreterArticle/addInterpreterArticle';
        const data = {
            articleTitle: title.value,
            label: label.value,
            coverId: coverUrl.value,
            content: editor.innerHTML.replace(/</g, '&lt;').replace(/>/g,'&gt;'),
            partContent: partTxt.slice(0, 100),
            status: status
        };
        const articleId = getQueryString('aid');
        //编辑文章，重置参数
        if(articleId){
            type = 'put';
            url = '/interpreterArticle/editInterpreterArticle';
            Object.assign(data, {
                articleId: articleId
            });
        }
        const token = sessionStorage.getItem('sy_rm_client_access_token'),
            userId = sessionStorage.getItem('sy_rm_client_ud');
        getResponse({
            type: type,
            url: url,
            data: data
        }).then(res => {
            if(res.message === 'success'){
                $.success('操作成功');
                setTimeout(function () {
                   location.href = '/p-article/list?t='+token+'&u='+userId;
                },1000);
            }
            event.target.removeAttribute('disabled');
            event.target.innerHTML = event.target.classList.contains('confirm')?'提交审核':'保存草稿';
        })
    }
//文章列表（已发布/草稿/待审核）
    function userListArticle (status = '', pagesize = 10){
        let moreBtn = $(".article_LoadMoreBtn"),
            pageEl = $('.article_PageNo'),
            pageNo = +pageEl.val();
        $.loading('获取数据');
        getResponse({
            url: '/interpreterArticle/interpreterArticleList',
            data: {
                pageNo: pageNo,
                pageSize: pagesize,
                status: status
            }
        }).then(res => {
            const token = sessionStorage.getItem('sy_rm_client_access_token');
            pageNo < 1 && $('div.personalArticleList').empty();
            if(res.message === 'success'){
                const list = res.data.content;
                let bodyStr = "", listArr = [];
                list.forEach(item => {
                    let statusStr = "",
                        statusLabel = item.lable,
                        statusTime = item.publishTime;
                    if(item.status === 0){
                        statusLabel = '草稿';
                        statusTime = item.gmtUpdate;
                        statusStr = `<div class="am-u-sm-8 tip"></div>`;
                    }else if(item.status === 1){
                        statusLabel = '待审核';
                        statusTime = item.submissionTime;
                        statusStr = `<div class="am-u-sm-8 tip">文章正在审核中，请耐心等待</div>`;
                    }else if(item.status === 2 || item.status === 4){
                        statusLabel = item.status === 2?'审核未通过':'发布撤回';
                        statusStr = `<div class="am-u-sm-8 tip">很抱歉，文章不能正常发布，请点击正文查看详情</div>`;
                    }else {
                        statusStr = `<div class="am-u-sm-1"><i class="sy-icon icon-eye"></i>${item.viewCount}</div>
                                     <div class="am-u-sm-1"><i class="sy-icon icon-thumbs"></i>${item.likeNumber}</div>
                                     <div class="am-u-sm-1"><i class="sy-icon icon-commenting"></i>${item.commentsNumber}</div>`;
                    }
                    let listStr = `<div class="item">
                                    <div class="img"><img src="${item.coverId}" alt=""></div>
                                    <div class="absolute">${statusLabel}</div>
                                    <div class="item-cnt">
                                        <a href="/p-article/detail?t=${token}&aid=${item.id}">
                                            <h5>${item.articleTitle}</h5>
                                        </a>
                                        <!-- 该出文字长度用js做限制 -->
                                        <p>${item.partContent}</p>
                                        <div class="am-g">
                                            ${statusStr}
                                            <div class="am-u-sm-4">${statusTime?statusTime:'--'}</div>
                                        </div>
                                    </div>
                                </div>`;
                    listArr.push(listStr);
                });
                pageNo += 1;
                pageEl.val(pageNo);
                if(res.data.content.length > 0){
                    bodyStr = listArr.join('');
                    moreBtn.removeClass('sy-hidden');
                }else if(res.data.totalElements === 0){
                    bodyStr = `<div class="empty"></div>`;
                    moreBtn.addClass('sy-hidden');
                }
                if(res.data.totalPages === pageNo){
                    moreBtn.addClass('sy-hidden');
                }
                $('.personalArticleList').append(bodyStr);
            }else{
                $.error(res.message);
                $('.personalArticleList').html('<div class="empty"></div>')
            }
            moreBtn.removeAttr('disabled').html('加载更多');
            $('.my-loading').remove()
        });
    }

/*
*  ------------------------ 分割线
* 文章管理（非本人可见）
*
* */
//文章列表
    function userNotListArticle (status = 3, pagesize = 10){
        let moreBtn = $(".loadMoreBtn_Not"),
            pageEl = $('.pageNo_Not'),
            pageNo = +pageEl.val();
        getResponse({
            url: '/interpreterArticle/interpreterArticleListSelect',
            data: {
                userId: getQueryString('uid'),
                pageNo: pageNo,
                pageSize: pagesize
            }
        }).then(res => {
            pageNo < 1 && $('div.notUserArticleCnt').empty();
            if(res.message === 'success'){
                let bodyStr = "", listArr = [];
                res.data.content.forEach(item => {
                    listArr.push(`<div class="item">
                                    <div class="img"><img src="${item.coverId}" alt=""></div>
                                    <div class="absolute">${item.lable}</div>
                                    <div class="item-cnt">
                                        <a href="/article/detail?uid=${item.publishUserId}&aid=${item.id}">
                                            <h5>${item.articleTitle}</h5>
                                        </a>
                                        <p>${item.partContent}</p>
                                        <div class="am-g">
                                            <div class="am-u-sm-1">
                                                <i class="sy-icon icon-eye"></i>${item.viewCount}
                                            </div>
                                            <div class="am-u-sm-1">
                                                <i class="sy-icon icon-thumbs"></i>${item.likeNumber}
                                            </div>
                                            <div class="am-u-sm-1">
                                                <i class="sy-icon icon-commenting"></i>${item.commentsNumber}
                                            </div>
                                            <div class="am-u-sm-4">${item.publishTime?item.publishTime:'--'}</div>
                                        </div>
                                    </div>
                                  </div>`);
                });
                pageNo += 1;
                pageEl.val(pageNo);
                if(res.data.content.length > 0) {
                    bodyStr = listArr.join('');
                    moreBtn.removeClass('sy-hidden');
                }else if(res.data.totalElements === 0){
                    bodyStr = `<div class="empty"></div>`;
                    moreBtn.addClass('sy-hidden');
                }
                if(res.data.totalPages === pageNo){
                    moreBtn.addClass('sy-hidden');
                }
                $('.notUserArticleCnt').append(bodyStr);
            }else{
                $.error(res.message);
                $('.notUserArticleCnt').html('<div class="empty"></div>')
            }
            moreBtn.removeAttr('disabled').html('加载更多');
        });
    }

/*
*   ------------------------ 分割线
*
* */
    return {
        previewArticle,
        releaseArticle,
        userListArticle,
        getGoodArticle,
        getIndustryArticle,
        userNotListArticle,
        getCommentsList,
    }
}(window, document, jQuery));

export default articleServer;