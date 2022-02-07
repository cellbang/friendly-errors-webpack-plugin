# Friendly-errors-webpack-plugin

Friendly-errors-webpack-plugin recognizes certain classes of webpack
errors and cleans, aggregates and prioritizes them to provide a better
Developer Experience.

It is easy to add types of errors so if you would like to see more
errors get handled, please open a [PR](https://help.github.com/articles/creating-a-pull-request/)!

## Getting started

### Installation

```bash
npm install @malagu/friendly-errors-webpack-plugin --save-dev
```

### Basic usage

Simply add `FriendlyErrorsWebpackPlugin` to the plugin section in your Webpack config.

```javascript
var FriendlyErrorsWebpackPlugin = require('@soda/friendly-errors-webpack-plugin');

var webpackConfig = {
  // ...
  plugins: [
    new FriendlyErrorsWebpackPlugin(),
  ],
  // ...
}
```

### Turn off errors

You need to turn off all error logging by setting your webpack config quiet option to true.

```javascript
app.use(require('webpack-dev-middleware')(compiler, {
  // ...
  logLevel: 'silent',
  // ...
}));
```

If you use the webpack-dev-server, there is a setting in webpack's ```devServer``` options:

```javascript
// webpack config root
{
  // ...
  devServer: {
    // ...
    quiet: true,
    // ...
  },
  // ...
}
```

If you use webpack-hot-middleware, that is done by setting the log option to `false`. You can do something sort of like this, depending upon your setup:

```javascript
app.use(require('webpack-hot-middleware')(compiler, {
  log: false
}));
```

_Thanks to [webpack-dashboard](https://github.com/FormidableLabs/webpack-dashboard) for this piece of info._

## Demo

### Build success

![success](http://i.imgur.com/MkUEhYz.gif)

### eslint-loader errors

![lint](http://i.imgur.com/xYRkldr.gif)

### babel-loader syntax errors

![babel](http://i.imgur.com/W59z8WF.gif)

### Module not found

![babel](http://i.imgur.com/OivW4As.gif)

## Options

You can pass options to the plugin:

```js
new FriendlyErrorsPlugin({
  compilationSuccessInfo: {
    messages: ['You application is running here http://localhost:3000'],
    notes: ['Some additional notes to be displayed upon successful compilation']
  },
  onErrors: function (severity, errors) {
    // You can listen to errors transformed and prioritized by the plugin
    // severity can be 'error' or 'warning'
  },
  // should the console be cleared between each compilation?
  // default is true
  clearConsole: true,

  // add formatters and transformers (see below)
  additionalFormatters: [],
  additionalTransformers: []
})
```

## Adding desktop notifications

The plugin has no native support for desktop notifications but it is easy
to add them thanks to [node-notifier](https://www.npmjs.com/package/node-notifier) for instance.

```js
var FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');
var notifier = require('node-notifier');
var ICON = path.join(__dirname, 'icon.png');

new FriendlyErrorsPlugin({
    onErrors: (severity, errors) => {
      if (severity !== 'error') {
        return;
      }
      const error = errors[0];
      notifier.notify({
        title: "Webpack error",
        message: severity + ': ' + error.name,
        subtitle: error.file || '',
        icon: ICON
      });
    }
  })
```

