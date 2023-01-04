//const datahub= require("crudit/src/datahub.mjs");
import datahub from "./datahub.mjs";
import { dbFactory,database } from "./database.mjs";
import { Console } from "console";
const settings={
    settings:{
        anonymousUser:{},
        database:{
            url: process.env.CRUDIT_DBURL,
            connectionSettings:{

            },
            connectionMode: 'pool'
        },        
    },
    requests:[datahub],
    hooks:[],    
    mutations: []
    // plugins: [{
    //     name: "dbFactory",
    //     init: async function(config){
    //         return  await (dbFactory.init(config.settings.database));
    //     }},
    //     { 
    //     name: "database",
    //     init: async function(config){
    //         console.log("INITING DATABSE",config.services);
    //             database.dbFactory=config.services.dbFactory;
    //             return  database;
    //     }}],
    // services:{},    
};

//module.exports= settings;
export default settings;