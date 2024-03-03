// @ts-check
'use strict'

const path = require('path')
const webpack = require('webpack')

/** @type {webpack.Configuration} */
const config = {
	target: 'node',

	entry: './src/extension.ts',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'extension.js',
		libraryTarget: 'commonjs2',
		devtoolModuleFilenameTemplate: '../[resource-path]'
	},
	devtool: 'source-map',
	externals: {
		vscode: 'commonjs vscode'
	},
	resolve: {
		mainFields: ['browser', 'module', 'main'],
		extensions: ['.ts', '.js'],
		alias: {
			
		},
		fallback: {
			// Webpack 5 no longer polyfills Node.js core modules automatically.
			// see https://webpack.js.org/configuration/resolve/#resolvefallback
			// for the list of Node.js core module polyfills.
		}
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [
					{
						loader: 'ts-loader'
					}
				]
			}
		]
	}
}

module.exports = config
