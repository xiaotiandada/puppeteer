const puppeteer = require('puppeteer')
const axios = require('axios')
const qs = require('qs')
const async = require("async");
const CONFIG = require('./config')
// {
//   username: 'xxxxxxxx',
//   password: 'xxxxxxxx'
// }
const init = async () => {
  const MATATAKI = 'http://wwwtest.smartsignature.io/'
  // const MATATAKI = 'https://matataki.io'
  const API = 'https://apitest.smartsignature.io'
  const PC_OR_MOBILE = true // true pc false mobile
  const chainnews = 'https://www.chainnews.com/api/articles/feeds'
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const platform = 'Email'
  let token = null

  let api = axios.create({
    baseURL: API,
    timeout: 40000
  });


  const screen = async id => {
    if (PC_OR_MOBILE) {
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
      })
    } else {
      const iPhone = puppeteer.devices['iPhone 6']
      await page.setViewport({
        width: 375,
        height: 667,
        deviceScaleFactor: 1
      })
      await page.emulate(iPhone)
    }
    await page.goto(`${MATATAKI}/p/${id}`);
    await page.screenshot({path: `matataki_${PC_OR_MOBILE ? 'pc' : 'mobile'}_${id}.png`});
    await browser.close();
  }

  // 截图
  const showArticleContent = id => {
    screen(100966)
    console.log('显示文章内容截图', id) // 100966
  }

  // publish
  const publish = async (posts, hash) => {
    const res = await api({
      method: 'post',
      url: '/post/publish',
      data: {
        author: CONFIG.username,
        commentPayPoint: 1,
        cover: posts.cover,
        fissionFactor: 2000,
        hash: hash,
        is_original: 0,
        msgParams: null,
        platform: platform,
        publickey: null,
        shortContent: "",
        sign: null,
        signId: null,
        tags: "",
        title: posts.title
      }
    }).then(res => {
      if (res.status === 200 && res.data.code === 0) {
        showArticleContent(res.data.data)
      } else console.log(res.data.message)
    }).catch(err => {
      console.log('err', err)
    })
  }

  // ipfs
  const posts = async (token, posts) => {
    await api({
      method: 'post',
      url: '/post/ipfs',
      data: qs.stringify({
        'data[title]': posts.title,
        'data[author]': posts.author,
        'data[desc]': 'whatever',
        'data[content]': posts.content,
      })
    }).then(res => {
      if (res.status === 200 && res.data.code === 0) {
        publish(posts, res.data.hash)
      } else console.log(res.data.message)
    }).catch(err => {
      console.log('err', err)
    })
  }

  const importer = async url => {
    await api({
      method: 'post',
      url: '/posts/importer',
      data: {
        url: url
      }
    }).then(res => {
      if (res.status === 200 && res.data.code === 0) {
        posts(token, {
          title: res.data.data.title
,         author: CONFIG.username,
          content: `${res.data.data.content}\n\n${Date.now()}`,
          cover: res.data.data.cover
        })
      } else console.log(res.data.message)
    }).catch(err => {
      console.log('err', err)
    })
  }

  // 登陆获取token
  const login = user => {
    api({
      method: 'post',
      url: 'login/account',
      data: user
    }).then(res => {
      if (res.status === 200 && res.data.code === 0) {
        // res.data
        // console.log(res.data)
        token = res.data.data
        api = axios.create({
          baseURL: API,
          timeout: 20000,
          headers: {
            'x-access-token' : res.data.data
          }
        });
      } else console.log(res.message)
    }).catch(err => {
      console.log('err', err)
    })
  }

  // 得到链闻的list url
  const getChainnewsUrlList = () => {
    axios.get(chainnews).then(res => {
      if (res.status === 200) {
        // TODO: 根据发布时间, 判断更新时间是否和发布时间一样 如果修改过了 编辑文章 否则发布文章
        let listFilter = res.data.results.filter(i => i.refer_link) // 过滤
        async.mapLimit(listFilter, 1, async function(i) {
          importer(i.refer_link)
          return i.refer_link
        }, (err, results) => {
            if (err) throw err
            // results is now an array of the response bodies
            console.log(results)
        })
      } else {
        console.log('获取失败了')
      }
    }).catch(err => {
      console.log('err', err)
    })
  }

  await login(CONFIG)
  // await showArticleContent()
  getChainnewsUrlList()
}

init()