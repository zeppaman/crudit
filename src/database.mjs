//const { MongoClient, ServerApiVersion, Document, ObjectID} = require('mongodb');
import pkg from 'mongodb';
const { MongoClient, ServerApiVersion,} = pkg;

import {EventEmitter} from 'events'

let events={
    alterQuery:"db.alterquery",
    beforeSave:"db.beforesave",
    afterSave:"db.aftersave",    
    beforeDelete:"db.beforedelete",
    afterDelete:"db.afterdelete",
    alterList:"db.alterlist",
    alterItem:"db.alteritem",
    beforePatch:"db.alterlist",
    afterPatch:"db.alteritem",
    alterListAggregate:"db.alterlistaggregate",
    alterItemAggregate:"db.alteritemaggregate",
};

let database= {
    client:{},
    emitter:{},
    get: async function (db,collection, id){
        console.log("changed");
        let result= await this.client.db(db).collection(collection).findOne(id);
        this.emit(events.alterItem,result);
        return result;
    },
    insert:async function (db, collection, data){
        this.emit(events.beforeSave,data);
        if(data._id!=undefined){
            delete data._id;
        } 
        let result=await this.client.db(db).collection(collection).insertOne(data);

        let saved= await this.get(db,collection,result.insertedId);
        this.emit(events.afterSave,saved);
        return saved;
    },
    patch: async function (db, collection, id, data){
        this.emit(events.beforePatch,data);
        if(data._id!=undefined){
            delete data._id;
        } 
        let result=await this.client.db(db).collection(collection).updateOne({_id: id},{$set: data})

        let saved= await this.get(db,collection,result.insertedId);
        this.emit(events.afterPatch,saved);
        return saved;
    },
    replace: async function (db, collection, id, data){
        this.emit(events.beforeSave,data);
        data._id=id;
        let result=await this.client.db(db).collection(collection).replaceOne({_id: id}, data)

        let saved= await this.get(db,collection,id);
        this.emit(events.afterSave,saved);
        return saved;
    },
    remove: async function(db, collection, id){
        this.emit(events.beforeDelete,saved);
        let result=await this.client.db(db).collection(collection).deleteOne(id);
        this.emit(events.afterDelete,result);    
        return result;
    },
    search: async function (db, collection, query, projection={}, aggregate={}){
        let list=[];
        if(aggregate   && Object.keys(aggregate).length === 0  && Object.getPrototypeOf(aggregate) === Object.prototype){
            list= await this.client.db(db).collection(collection).find(query).project(projection).toArray();
        }
        else
        {
            list= await this.client.db(db).collection(collection).aggregate(aggregate).toArray();
        }
        this.emit(events.alterList,list);
        list.forEach(element => {
            this.emit(events.alterItem,element);    
        });
        
        return list;
    },
    aggregate: async function (db, collection, query){
        let result=await this.client.db(db).collection(collection).aggregate(query).toArray();
        this.emit(events.alterListAggregate,result);
        result.forEach(element => {
            this.emit(events.alterItemAggregate,element);    
        });
        return result;
    },
    emit: function(eventName,data){
        this.emitter.emit(eventName,this,data);
    },
    listen: function(eventName,func){
        this.emitter.on(eventName,(database,data)=>{
             func(database,data).then(x=>console.log("done"));
        });
    },
    init: async function(url,settings){
        let defaultSettings={ 
            // useNewUrlParser: true, 
            // useUnifiedTopology: true, 
            // serverApi: ServerApiVersion.v1 
        };
        console.log("init emitter");
        let mixed=Object.assign(defaultSettings, settings);
        this.emitter= new EventEmitter();
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

export {
    database,
    events
};
