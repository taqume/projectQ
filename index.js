import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// Stream polyfill için
if (typeof global.process === 'undefined') {
  global.process = { browser: true }; // stream-browserify'ın çalışması için gerekli
}
global.stream = require('stream-browserify');

/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
