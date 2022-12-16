//const { MongoClient, ServerApiVersion, Document, ObjectID} = require('mongodb');
import pkg from 'mongodb';
const { MongoClient, ServerApiVersion,} = pkg;

import {EventEmitter} from 'events'

const  dbFactory= {
    client: null,
    databases:[],
    init: async function(config){
        let defaultSettings={ 
            // useNewUrlParser: true, 
            // useUnifiedTopology: true, 
            // serverApi: ServerApiVersion.v1 
        };
        let mixed=Object.assign(defaultSettings, config.connectionSettings);
        this.client=new MongoClient(config.url, mixed);
        await this.client.connect();
    },
    destroy: async function(){
        if(this.client){
            await this.client.close();
        }
    },
    getClient: async  function(){
        await this.client.connect();// no op if connected
        return this.client;
    },
    getDb:async  function(name){
        if(this.databases[name]){
            return this.databases[name];
        }
        return this.databases[name] = (await this.getClient()).db(name);
    }

};

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
    dbFactory:dbFactory,
    emitter: new EventEmitter(),
    get: async function (db,collection, id){
        let result=await  (await this.dbFactory.getDb(db)).collection(collection).findOne(id);
        this.emit(events.alterItem,db,collection,result);  
        return result;
    },
    insert:async function (db, collection, data){
        this.emit(events.beforeSave,db,collection,data);
        if(data._id!=undefined){
            delete data._id;
        } 
        let result=await (await this.dbFactory.getDb(db)).collection(collection).insertOne(data);
        
        let saved= await this.get(db,collection,result.insertedId);
        this.emit(events.afterSave,db,collection,saved);
        return saved;
    },
    patch: async function (db, collection, id, data){
        this.emit(events.beforePatch,db,collection,data);
        if(data._id!=undefined){
            delete data._id;
        } 
        let result=await (await this.dbFactory.getDb(db)).collection(collection).updateOne({_id: id},{$set: data})

        let saved= await this.get(db,collection,result.insertedId);
        this.emit(events.afterPatch,db,collection,saved);
        return saved;
    },
    replace: async function (db, collection, id, data){
        this.emit(events.beforeSave,db,collection,data);
        data._id=id;
        let result=await (await this.dbFactory.getDb(db)).collection(collection).replaceOne({_id: id}, data)

        let saved= await this.get(db,collection,id);
        this.emit(events.afterSave,db,collection,saved);
        return saved;
    },
    remove: async function(db, collection, id){
        this.emit(events.beforeDelete,id);
        let _id=id;
        if(typeof fruits == "object"){
            if(id._id){
                _id=id._id;
            }else{
                throw new Error("Onbject doesnt have an _id");
            }
        }

        if(!_id){        
            throw new Error("Unable to delete an entity without an ID");
        }

        this.emit(events.beforeDelete,id);
        let result=await (await this.dbFactory.getDb(db)).collection(collection).deleteOne({ "_id" : _id });
        this.emit(events.afterDelete,db,collection,result);    
        return result;
    },
    search: async function (db, collection, query, projection={}, aggregate={}){
        let list=[];
        if(aggregate   && Object.keys(aggregate).length === 0  && Object.getPrototypeOf(aggregate) === Object.prototype){
            list= await (await this.dbFactory.getDb(db)).collection(collection).find(query).project(projection).toArray();
        }
        else
        {
            list=await  (await this.dbFactory.getDb(db)).collection(collection).aggregate(aggregate).toArray();
        }
        this.emit(events.alterList,db,collection,list);
        list.forEach(element => {
            this.emit(events.alterItem,db,collection,element);    
        });
        
        return list;
    },
    aggregate: async function (db, collection, query){
        let result=await (await this.dbFactory.getDb(db)).collection(collection).aggregate(query).toArray();
        this.emit(events.alterListAggregate,db,collection,result);
        result.forEach(element => {
            this.emit(events.alterItemAggregate,db,collection,element);    
        });
        return result;
    },
    emit: function(eventName,db,collection,data){
      
        this.emitter.emit(eventName,this,db,collection,data);
    },
    listen: function(eventName,func){
        this.emitter.on(eventName,(database,db,collection,data)=>{
             func(database,db,collection,data).then(x=>{});
        });
    },
};

const mutations ={
    mutations:[],
    database:database,
    dbFactory:dbFactory,
    init: async function(config){
        let defaultMutations=[];
        //TODO: add here basic mutation for creating the _mutation collection.
        this.mutations=Object.assign(defaultMutations, config.mutations);
    },
    applyOne: async function(name){
        /*
            Rewrite:
            1. iterate all the mutation got in mutations object
            2. foreach one check if it have been run or not. If not run or run but in error, run it
            3. if ok write the execution log in the _mutatoin collection
            4. if in error write the log and stop.

            when a mutation can be run?
            - the database name match the regexp in teh mutation database name
            - the mutation wasn't executed
        */
        return {
            appliedCount:0,
            exections:[{
                name: "exec 1",
                hasError:false,
            },
            {
                name: "exec 2",
                hasError:true,
            }]
        };
        let mutation = this.mutations.find((m)=>{return m.name == name && !m.executed});
        if(mutation){
            try {
                let config = this.currentConfig.settings.database;
                if(mutation.dbName){
                    config.name = mutation.dbName
                }
                let response = await mutation.function(config);
                mutation.executed = true;
                return({ hasError: false, data: response });
            } catch (error) {
                return({ hasError: true, error: error });
            }
        }else{
            return({ hasError: true, error: "Mutation not found or already executed" });
        }
    },
    applyAll: async function(){
        let client=await this.dbFactory.getClient(); 
        let databases=client
        .db()
        .admin()
        .listDatabases();

        databases.forEach((x)=>{
            this.appyOne(x);
        });
    }
};
//module.exports=database;
export default database;

export {
    database,
    events,
    dbFactory,
    mutations
};
