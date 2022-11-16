//const { MongoClient, ServerApiVersion, Document, ObjectID} = require('mongodb');
import pkg from 'mongodb';
const { MongoClient, ServerApiVersion,} = pkg;


let database= {
    client:{},
    get: async function (db,collection, id){
        let result= await this.client.db(db).collection(collection).findOne(id);

        return result;
    },
    insert:async function (db, collection, data){
        
        if(data._id!=undefined){
            delete data._id;
        } 
        let result=await this.client.db(db).collection(collection).insertOne(data);

        return this.get(db,collection,result.insertedId);
    },
    patch: async function (db, collection, id, data){
        
        if(data._id!=undefined){
            delete data._id;
        } 
        let result=await this.client.db(db).collection(collection).updateOne({_id: id},{$set: data})

        return this.get(collection,id);
    },
    replace: async function (db, collection, id, data){
        data._id=id;
        let result=await this.client.db(db).collection(collection).replaceOne({_id: id}, data)

        return this.get(db,collection,id);
    },
    remove: async function(db, collection, id){

        let result=await this.client.db(db).collection(collection).deleteOne(id);

        return result;
    },
    search: async function (db, collection, query, projection={}, aggregate={}){
        if(aggregate   && Object.keys(aggregate).length === 0  && Object.getPrototypeOf(aggregate) === Object.prototype){
            return (await this.client.db(db).collection(collection).find(query).project(projection)).toArray();
        }
        else
        {
            return (await this.client.db(db).collection(collection).aggregate(aggregate)).toArray();
        }
    },
    aggregate: async function (db, collection, query){
        let result=await this.client.db(db).collection(collection).aggregate(query).toArray();
        return result;
    },
    init: async function(url,settings){
        let defaultSettings={ 
            // useNewUrlParser: true, 
            // useUnifiedTopology: true, 
            // serverApi: ServerApiVersion.v1 
        };

        let mixed=Object.assign(defaultSettings, settings);
        
        this.client=new MongoClient(url, mixed);
        await this.client.connect();
    },
    destroy: async function(){
        if(this.client){
            await this.client.close();
        }
    }
};

//module.exports=database;
export default database;