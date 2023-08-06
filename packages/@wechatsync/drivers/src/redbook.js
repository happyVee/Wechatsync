// import CryptoJS from 'crypto-js';

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

export default class RedbookAdapter {
  constructor() {
    this.name = 'redbook'
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
    let uri = "/web_api/sns/v2/note"
    let host = "https://edith.xiaohongshu.com"
    let data = JSON.parse("{\"common\":{\"type\":\"normal\",\"title\":\"14:30\",\"note_id\":\"\",\"desc\":\"\",\"source\":\"{\\\"type\\\":\\\"web\\\",\\\"ids\\\":\\\"\\\",\\\"extraInfo\\\":\\\"{\\\\\\\"subType\\\\\\\":\\\\\\\"\\\\\\\",\\\\\\\"systemId\\\\\\\":\\\\\\\"web\\\\\\\"}\\\"}\",\"business_binds\":\"{\\\"version\\\":1,\\\"noteId\\\":0,\\\"bizType\\\":0,\\\"noteOrderBind\\\":{},\\\"notePostTiming\\\":{\\\"postTime\\\":\\\"\\\"},\\\"noteCollectionBind\\\":{\\\"id\\\":\\\"\\\"}}\",\"ats\":[],\"hash_tag\":[],\"post_loc\":{},\"privacy_info\":{\"op_type\":1,\"type\":1}},\"image_info\":{\"images\":[{\"file_id\":\"spectrum/13AUQgglZB1gg272oxige-4Q0FUqGl5VPWu5jkS-dSJBlEU\",\"width\":620,\"height\":620,\"metadata\":{\"source\":-1},\"stickers\":{\"version\":2,\"floating\":[]},\"extra_info_json\":\"{\\\"mimeType\\\":\\\"image/jpeg\\\"}\"}]},\"video_info\":null}")
    let a1 = "185f887325fgtq7x15a0o6l4k4yfdliau4agiujt400000445824"
    let signs = sign(uri, data, a1 = a1)
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
    debugger
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
  }

  async editPost(postId, post) {
    // 更新文章：调用平台 api 更新文章（同步助手内部通过该接口替换文章内图片地址）
  }

}
