import { Collection, } from "mongodb";
const { MongoClient, ServerApiVersion, Document, ObjectID} = require('mongodb');

let database= {
    get: async function (db: String,collection: String, id: typeof ObjectID){
        let result= await this.client.db(db).collection(collection).findOne(id);

        return result;
    },
    insert:async function (db: String, collection: String, data){

        if(data._id!=undefined){
            delete data._id;
        } 
        let result=await this.client.db(db).collection(collection).insertOne(data);

        return this.get(db,collection,result.insertedId);
    },
    patch: async function (db: String, collection: String, id: typeof ObjectID, data){
        
        if(data._id!=undefined){
            delete data._id;
        } 
        let result=await this.client.db(db).collection(collection).updateOne({_id: id},{$set: data})

        return this.get(collection,id);
    },
    replace: async function (db: String, collection: String, id: typeof ObjectID, data){
        data._id=id;
        let result=await this.client.db(db).collection(collection).replaceOne({_id: id}, data)

        return this.get(db,collection,id);
    },
    remove: async function(db: String, collection: String, id: typeof ObjectID){

        let result=await this.client.db(db).collection(collection).deleteOne(id);

        return result;
    },
    search: async function (db: String, collection: String, query: any, projection:any={}){
        let result=await this.client.db(db).collection(collection).find(query).toArray();
        return result;
    },
    aggregate: async function (db: String, collection: String, query: any){
        let result=await this.client.db(db).collection(collection).aggregate(query).toArray();
        return result;
    },
    init: async function(url: String,settings){
        let defaultSettings={ 
            useNewUrlParser: true, 
            useUnifiedTopology: true, 
            serverApi: ServerApiVersion.v1 
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

export default database;
