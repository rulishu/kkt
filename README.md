kkt
--- 

Cli tool for creating react apps.

## 安装

```bash
npm install -g kkt
```

## webpack 配置修改

在根目录新建 `.kktrc.js` 这里返回两个参数 `webpackConf` 和 `webpackServerConf`，返回的是 `webpack` 配置，webpack 配置，区分开发模式和生成模式是通过 `webpackConf.mode` 的值为 development 或者是 ;

```js
module.exports = function (webpackConf, webpackServerConf) {
  if (webpackConf.mode == 'development') { }
  if (webpackConf.mode == 'production') { }
  // console.log('webpackConf:', webpackConf);
  // console.log('webpackServerConf:', webpackServerConf);
  if (webpackConf) return webpackConf;
  if (webpackServerConf) return webpackServerConf;
}
```

## Mock API

在项目根目录添加 `.kktmock.js` 文件，再在文件中添加需要模拟的API，相关文档在这里[webpack-api-mocker](https://github.com/jaywcjlove/webpack-api-mocker)，下面来个实例：

```js
const proxy = {
  'GET /api/user': { id: 1, username: 'kenny', sex: 6 },
  'GET /api/user/list': [
    { id: 1, username: 'kenny', sex: 6 }, 
    { id: 2, username: 'kenny', sex: 6 }
  ],
  'POST /api/login/account': (req, res) => {
    const { password, username } = req.body;
    if (password === '888888' && username === 'admin') {
      return res.json({
        status: 'ok',
        code: 0,
        token: "sdfsdfsdfdsf",
        data: { id: 1, username: 'kenny', sex: 6 }
      });
    } else {
      return res.json({
        status: 'error',
        code: 403
      });
    }
  },
  'DELETE /api/user/:id': (req, res) => {
    console.log('---->', req.body)
    console.log('---->', req.params.id)
    res.send({ status: 'ok', message: '删除成功！' });
  }
}
module.exports = proxy;
```
