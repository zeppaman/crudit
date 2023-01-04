

// const crudy=require('crudit/src/crudy.mjs');
// const database=require('crudit/src/database.mjs');
// const defaultConfig=require('crudit/src/default.mjs');

import crudy from './crudy.mjs';
import {database,events,dbFactory, mutations} from './database.mjs';
import defaultConfig from './default.mjs';

// exports.crudy=crudy;
// exports.database=database;
// exports.defaultConfig=defaultConfig;

export  {
    crudy,
    database,
    defaultConfig,
    events,
    dbFactory,
    mutations
}