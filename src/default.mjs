//const datahub= require("crudit/src/datahub.mjs");
import datahub from "./datahub.mjs";
const settings={
    settings:{
        anonymousUser:{},
    },
    requests:[datahub],
    hooks:[],    
    mutations: []
};

//module.exports= settings;
export default settings;