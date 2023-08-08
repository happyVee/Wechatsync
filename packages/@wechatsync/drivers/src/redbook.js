// import CryptoJS from 'crypto-js';

const axios = require('axios')

function readFileToBase64(url) {
  return new Promise((resolve, reject) => {
    ;(async () => {
      let body = null
      try {
        const req = await axios.get(url, { responseType: 'blob' })
        body = req.data
      } catch (e) {
        return reject(e)
      }
      if (body != null) {
        const reader = new FileReader()
        reader.readAsDataURL(body)
        reader.onloadend = function () {
          var base64data = reader.result
          resolve(base64data)
        }
        reader.onerror = function (e) {
          reject(e)
        }
      }
    })()
  })
}

function signXs(n) {
  let m = "";
  let d = "A4NjFqYu5wPHsO0XTdDgMa2r1ZQocVte9UJBvk6/7=yRnhISGKblCWi+LpfE8xzm3";
  for (let i = 0; i < 32; i += 3) {
    let o = n.charCodeAt(i);
    let g = i + 1 < 32 ? n.charCodeAt(i + 1) : 0;
    let h = i + 2 < 32 ? n.charCodeAt(i + 2) : 0;
    let x = ((o & 3) << 4) | (g >> 4);
    let p = ((15 & g) << 2) | (h >> 6);
    let v = o >> 2;
    let b = h & 63;
    if (!h) {
      b = 64;
    }
    if (!g) {
      p = b = 64;
    }
    m += d[v] + d[x] + d[p] + d[b];
  }
  return m;
}

function sign(uri, data = null, ctime = null, a1 = "", b1 = "") {
  let v = ctime !== null ? ctime : Math.round(new Date().getTime());
  let raw_str = `${v}test${uri}${JSON.stringify(data)}`;
  let md5_str = md5(raw_str).toString();
  let x_s = signXs(md5_str);
  let x_t = v.toString();
  return {
    "x-s": x_s,
    "x-t": x_t
  }
}


function getCookiesA1() {
  let url = "https://creator.xiaohongshu.com/";
  let name = "a1";
  
  return new Promise((resolve, reject) => {
    chrome.cookies.get({ url: url, name: name }, function(cookie) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(cookie ? cookie.value : null);
      }
    });
  });
}


async function getUploadFilesPermit(file_type, count = 1) {
  const uri = "/api/media/v1/upload/web/permit";
  const host = "https://edith.xiaohongshu.com"
  const params = {
      biz_name: "spectrum",
      scene: file_type,
      file_count: count,
      version: "1",
      source: "web",
  };
  
  // 将参数对象转换为URL查询字符串
  const queryString = new URLSearchParams(params).toString();
  
  // 发送GET请求
  const response = await $.get(`${host}${uri}?${queryString}`);
  
  // 检查响应是否成功
  if (!response.code === 0) {
      throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  // 解析响应体为JSON
  const data = response.data;
  
  const temp_permit = data.uploadTempPermits[0];
  const fileId = temp_permit.fileIds[0];
  const token = temp_permit.token;
  console.log("fileId: " + fileId, "token: "  + token)
  
  return {fileId, token};
}


async function uploadFile(fileId, token, file, contentType = 'image/jpeg') {
  const url = "https://ros-upload.xiaohongshu.com/" + fileId;
  const headers = {
      "X-Cos-Security-Token": token,
      "Content-Type": contentType
  };

  // 使用 fetch API 发送 PUT 请求
  const response = await fetch(url, {
      method: 'PUT',
      headers: headers,
      body: file
  });

  // 检查响应是否成功
  if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
  }
  
}

export default class RedbookAdapter {
  constructor() {
    this.name = 'redbook'
    this.skipReadImage = true
    chrome.cookies.getAll({ domain: "xiaohongshu.com" }, function (cookies) {
      console.log(cookies)
    })
  }

  async getMetaData() {
    console.log("redbook getMetaData")

    var res = await $.get('https://creator.xiaohongshu.com/api/galaxy/user/info')
    console.log(res)
    if (res.result === 0) {
      var resData = res.data
      console.log("redbook getMetaData done ", resData)
      return {
        uid: resData.userId,
        title: resData.userName,
        avatar: resData.userAvatar,
        supportTypes: ['html'],
        displayName: '小红书',
        type: 'redbook',
        home: 'https://creator.xiaohongshu.com/creator/home',
        icon: 'https://www.xiaohongshu.com/favicon.ico',
      }
    } else {
      throw new Error('not found')
    }
  }

  async addPost(post) {
    debugger
    let images = await this.uploadImages(post)
    let uri = "/web_api/sns/v2/note"
    let host = "https://edith.xiaohongshu.com"
    let data = {
      "common":{
          "type":"normal",
          "title": post.post_title,
          "note_id":"",
          "desc": post.desc ?? post.post_title,
          "source":"{\"type\":\"web\",\"ids\":\"\",\"extraInfo\":\"{\\\"systemId\\\":\\\"web\\\"}\"}",
          "business_binds":"{\"version\":1,\"noteId\":0,\"bizType\":0,\"noteOrderBind\":{},\"notePostTiming\":{\"postTime\":\"\"},\"noteCollectionBind\":{\"id\":\"\"}}",
          "ats":[],
          "hash_tag":[],
          "post_loc":{},
          "privacy_info":{ "op_type":1, "type":1 }
      },
      "image_info":{
          "images": images
      },
      "video_info":null
    }
    let a1 = await getCookiesA1()
    let signs = sign(uri, data, null, a1)
    console.log("signs====>", signs)
    let settings = {
      "url": `${host}${uri}`,
      "method": "POST",
      "timeout": 0,
      "headers": {
        "authority": "edith.xiaohongshu.com",
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json;charset=UTF-8",
        "x-s": signs["x-s"],
        "x-t": signs["x-t"]
      },
      "data": JSON.stringify(data),
    };
    console.log("settings====>", settings)
    let res = await $.ajax(settings)
    console.log(res)
    if (!res.data.id) {
      throw new Error(res.msg)
    }
    return {
      status: 'success',
      post_id: res.data.id,
      draftLink: res.share_link,
    }
  }


  async preEditPost(post) {
    // 内容预处理：预处理平台无法兼容的文本内容
  }


  async uploadFile(file) {
    // 上传图片：调用平台 api 上传图片
    return [
      {
        id: "123",
        object_key: "upload_file.object_key",
        url: 'https://www.xiaohongshu.com/favicon.ico',
        // url: 'https://pic1.zhimg.com/80/' + upload_file.object_key + '_hd.png',
      },
    ]
  }

  async editPost(postId, post) {
    // 更新文章：调用平台 api 更新文章（同步助手内部通过该接口替换文章内图片地址）
    return {
      status: 'success',
      post_id: postId,
      draftLink: 'https://www.xiaohongshu.com/discovery/item/' + postId,
    }
  }

  async uploadImages(post) {
    // 上传图片：调用平台 api 上传图片
    var doc = $(post.content)
    var imags = doc.find('img')
    console.log('upload images', imags.length)

    const images = [];

    for (let mindex = 0; mindex < imags.length; mindex++) {
      console.log('upload images, num: ', mindex)
      const img = imags.eq(mindex)
      let imgSRC = img.attr('data-src')
      if (!imgSRC) {
        imgSRC = img.attr('data-original')
      }

      if (!imgSRC) {
        imgSRC = img.attr('src')
      }

      let src = imgSRC
      
      try {
        var sourceIsBase64 = src.indexOf(';base64,') > -1;
        var dataURL = sourceIsBase64 ? src : await readFileToBase64(src)
        var dataURLPairs = dataURL.split(',')
        var fileType = dataURLPairs[0].replace('data:', '').split(';')[0]
        var baseCode = dataURLPairs[1]
        var type = fileType || 'image/png'
        var bits = $.xmlrpc.binary.fromBase64(baseCode)

        var file = new File([bits], 'temp', {
          type: type
        });

        const { fileId, token } = await getUploadFilesPermit("image", 1)
        await uploadFile(fileId, token, file, type)
        images.push({
          "file_id": fileId,
          "metadata": {"source": -1},
          "stickers": {"version": 2, "floating": []},
          "extra_info_json": '{"mimeType":"image/jpeg"}',
        });
      } catch (error) {
        console.log('upload images fail, num: ', mindex)
        console.log(error)
      }
    }

    return images;
  }
}
