const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const ENTRY_FILES = {
    restyler: path.join(__dirname, 'src', 'core', 'restyler.js'),
    background: path.join(__dirname, 'src', 'extension', 'background', 'background.js'),
    content_script: path.join(__dirname, 'src', 'extension', 'content_scripts', 'content_script.js'),
    devtool: path.join(__dirname, 'src', 'extension', 'devtool', 'components', 'Devtool', 'Devtool.jsx'),
};

module.exports = (env, argv) => {
    let mode = argv.mode ?? 'production';

    return {
        mode: mode,

        // NOTE: This is important to create a CSP compliant output that doesn't use eval and
        // NOTE: therefore doesn't require "unsafe-eval" policy declaration in the manifest.json.
        devtool: 'source-map',

        entry: {
            // Core files:
            'content_scripts/core/restyler.min.js': ENTRY_FILES.restyler,

            // Extension files:
            'background/background.min.js': ENTRY_FILES.background,
            'content_scripts/content_script.min.js': ENTRY_FILES.content_script,
            'devtool/devtool.min.js': ENTRY_FILES.devtool,
        },

        output: {
            path: path.join(__dirname, 'dist'),
            filename: '[name]', // This will use the entry key as the name.
            publicPath: '/', // Required for webpack-dev-server.
        },

        plugins: [
            new CleanWebpackPlugin({
                // Automatically remove all unused webpack assets on rebuild.
                cleanStaleWebpackAssets: true,
            }),

            // This also watches the folder in watch mode.
            new CopyWebpackPlugin({
                patterns: [
                    path.join(__dirname, 'src', 'extension', 'manifest.json'),
                    {
                        from: path.join(__dirname, 'src', 'extension', 'icons'),
                        to: path.join(__dirname, 'dist', 'icons'),
                    },
                    {
                        from: path.join(__dirname, 'src', 'extension', 'devtool', 'html'),
                        to: path.join(__dirname, 'dist', 'devtool', 'html'),
                    },
                    {
                        from: path.join(__dirname, 'src', 'extension', 'devtool', 'devtoolLoader.js'),
                        to: path.join(__dirname, 'dist', 'devtool'),
                    },
                    {
                        from: path.join(__dirname, 'src', 'extension', 'content_scripts', 'content_script.css'),
                        to: path.join(__dirname, 'dist', 'content_scripts'),
                    },
                    {
                        from: path.join(__dirname, 'src', 'extension', 'vendor'),
                        to: path.join(__dirname, 'dist', 'vendor'),
                    },
                ],
            }),
        ],

        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    exclude: /node_modules/,
                    use: 'babel-loader',
                },
                {
                    test: /\.scss$/,
                    exclude: /node_modules/,
                    use: [
                        // Creates `style` nodes from JS strings.
                        'style-loader',
                        // Translates CSS into CommonJS.
                        'css-loader',
                        // Compiles Sass to CSS.
                        'sass-loader',
                    ],
                },
                {
                    test: /\.handlebars$/,
                    exclude: /node_modules/,
                    use: 'handlebars-loader',
                },
            ],
        },
    };
};
