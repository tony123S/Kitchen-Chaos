// Kitchen Chaos preload (bundled into dist/preload.cjs by build.mjs).
// Loads the official SmartSpectra preload bridge, then exposes one small
// helper so the page can read its settings from the main process.

'use strict';

require('@smartspectra/node-sdk/preload');

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kitchenChaos', {
  getConfig: () => ipcRenderer.invoke('kitchen-chaos:config'),
});
