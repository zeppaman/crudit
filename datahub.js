// const { MongoClient, ServerApiVersion, Document, ObjectID} = require('mongodb');
// const database =require( "./database.js");

import { MongoClient, ServerApiVersion}  from'mongodb';
import database from "./database.js";

export default {
    name:'datahub',
    database: database,
    authenticate:true,
    processRequest: async function(dbName, collection,operation, id, data,query, projection){
        let result={};
       switch(operation){
            case "GET": 
            if (id) {
                result=await this.database.get(dbName,collection,id);
            }else{                
                result=await this.database.search(dbName,collection,query,projection);
            }
            
            break;
            case "POST": 
                result=await this.database.insert(dbName,collection,data);
            break;
            case "PUT": 
                result=await this.database.replace(dbName,collection,id,data);
            break;
            case "PATCH": 
                result=await this.database.patch(dbName,collection,id,data);
            break;
            case "DELETE": 
                result=await this.database.remove(dbName,collection,id);
            break;
            default: 
             throw new Error("not supported method:"+operation);
        }
        return result;
    },
    function: async function(request, user, config){
            let collection= request.query.collection;
            if(!collection) throw Error("missing collection");
        

            let collectionSettings= Object.assign(config.settings,config[collection]??{});
            console.log(collectionSettings);
            this.database.init(config.dbUrl ?? process.env.DBURL, config.dbConfig);

            
            if(collectionSettings.roles){
                let hasRole= (user.roles??[]).some(element => {
                    return collectionSettings.roles.includes(element);
                });
                if(!hasRole){
                   let error = new Error("Collection not allowed");
                   error.name="401";
                   throw error;
                }
            }
            let dbName= user.database ?? collectionSettings.database;
            
            let id=request.query.id ?? request.body?._id;
            if(id){
                id=ObjectID(id);
            }
            let data=request.body;
            let userQuery=JSON.parse(request.query.query?? JSON.stringify(collectionSettings.defaultQuery) ?? '{}');
            let query=Object.assign(userQuery, collectionSettings.queryOverride??{});
            let projection=Object.assign(collectionSettings.projectionBase ?? {},query.projection, collectionSettings.projectionOverride??{});
            
            let result=await this.processRequest(dbName, collection,request.method,id, data,query, projection);
            
            
            return  result;
    }
    
}