// const { MongoClient, ServerApiVersion, Document, ObjectID} = require('mongodb');
// const { aggregate } = require('crudit/src/database.mjs');
// const database =require( "crudit/src/database.mjs");
import pkg from 'mongodb';
const { MongoClient, ServerApiVersion,ObjectID} = pkg;
import {database,events} from "./database.mjs";


const datahub= {
    name:'datahub',
    database: database,
    authenticate:true,
    parseJSONArray: function(jsonStr){
        return JSON.parse( jsonStr, function( key, value ){
            // the reviver function looks for the typed array flag
            try{
              if( "flag" in value && value.flag === FLAG_TYPED_ARRAY){
                // if found, we convert it back to a typed array
                return new context[ value.constructor ]( value.data );
              }
            }catch(e){}

            // if flag not found no conversion is done
            return value;
          });

    },
    processRequest: async function(dbName, collection,operation, id, data,query, projection,aggregate){
        let result={};
       switch(operation){
            case "GET":
            if (id) {
                result=await this.database.get(dbName,collection,id);
            }else{
                result=await this.database.search(dbName,collection,query,projection, aggregate);
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
    init: async function(config){
        await (this.database.dbFactory.init(config.settings.database));
    },
    function: async function(request, user, config){

            let collection= request.query.collection;
            if(!collection) throw Error("missing collection");


            let collectionSettings= Object.assign(config.settings,config[collection]??{});

            config.hooks.forEach((x)=>{
                // console.log("hooking "+x.eventName);
                //this.emitter.emit(eventName,this,db,collection,data);
                this.database.listen(x.eventName, async function(database,db,collection, data){
                    // console.log("hooking "+x.name+" emitted");
                    //console.log(x);
                    await x.function(database,db,collection,data,user,config);
                });
            })

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
            let dbName= user.database ?? collectionSettings.database.name;

            let id=request.query.id ?? request.body?._id;
            if(id){
                id=ObjectID(id);
            }

            let data=request.body;
            let userQuery=JSON.parse(request.query.query?? JSON.stringify(collectionSettings.defaultQuery) ?? '{}');
            let query=Object.assign(userQuery, collectionSettings.queryOverride??{});
            let projection=Object.assign(collectionSettings.projectionBase ?? {},JSON.parse(request.query.projection??'{}'), collectionSettings.projectionOverride??{});
            let aggregate=this.parseJSONArray(request.query.aggregate??'{}');//Object.assign(collectionSettings.aggregateBase ?? [],this.parseJSONArray(request.query.aggregate??'{}'), collectionSettings.aggregateOverride??[]);
            let result=await this.processRequest(dbName, collection,request.method,id, data,query,projection,aggregate);

            
            return  result;
    }

}

//module.exports=datahub;
export default datahub;