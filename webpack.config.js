const webpack = require('webpack');

var CleanWebpackPlugin = require('clean-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');

var productionMode = false;

var config = {
    devtool: productionMode ? 'eval' : 'source-map',

    entry: {
        // Core files:
        'js/content_scripts/core/restyler.min.js': './src/core/restyler.js',

        // Extension files:
        'js/background/background.min.js': './src/extension/js/background/background.js',
        'js/content_scripts/content_script.min.js': './src/extension/js/content_scripts/content_script.js',
        'js/devtool/devtool.min.js': './src/extension/js/devtool/devtool.jsx'
    },

    output: {
        path: './dist',
        filename: '[name]' // This will use the entry key as the name.
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                'NODE_ENV': productionMode ? JSON.stringify('production') : undefined
            }
        }),

        new CleanWebpackPlugin(['dist']),

        // This also watches the folder in watch mode.
        new CopyWebpackPlugin([{
            from: './src/extension',

            // Ignore webpacked files.
            ignore: ['background.js', 'content_script.js', '*.jsx', '*.scss', '*.handlebars']
        }])
    ],

    module: {
        loaders: [{
            test: /\.(js|jsx)$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
        }, {
            test: /\.scss$/,
            exclude: /node_modules/,
            loaders: ['style-loader', 'css-loader', 'sass-loader']
        }, {
            test: /\.handlebars$/,
            exclude: /node_modules/,
            loader: 'handlebars-loader'
        }]
    },

    // NOTE: Stupid fix for https://github.com/wycats/handlebars.js/issues/1174.
    resolve: {
        alias: {
            handlebars: 'handlebars/dist/handlebars.min.js'
        }
    }
};

module.exports = config;
