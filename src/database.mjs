//const { MongoClient, ServerApiVersion, Document, ObjectID} = require('mongodb');
import pkg from 'mongodb';
import defaultConfig from  './default.mjs';

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
    insertOrUpdate:async function (db, collection, data){
        if(data._id && data.id!=""){
            return await this.replace(db,collection,data);
        } else{
            return await this.insert(db, collection, data);
        }
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
    init: async function(mutations){
        let defaultMutations=[];
        //TODO: add here basic mutation for creating the _mutation collection.
        this.mutations=[...defaultMutations, ...mutations, ...defaultConfig.mutations];
    },
    applySingle: async function(databaseName,mutationName){
        let mutation = this.mutations.find((m)=>{return m.name == mutationName});
        let dbmutation=await this.database.search(databaseName,"_mutations",{name:mutationName},{});
        console.log('dbMutation first from db', dbmutation)
        if(!databaseName || mutation.dbName==databaseName || databaseName.match(new RegExp(mutation.dbName))) {
            if(!dbmutation || dbmutation.length==0){
                dbmutation={
                    name: mutationName,
                    firstExecution: new Date()
                };
            }
            dbmutation = Object.assign(dbmutation, mutation);
            if(!dbmutation || dbmutation.length==0 || dbmutation.hasError==true || !dbmutation.lastExecution){
                //no mutation on database, try to execute
                try
                {
                    let result = await dbmutation.function(databaseName,dbmutation);
                    dbmutation= Object.assign(dbmutation, result);
                    dbmutation.lastExecution=new Date();
                    
                }catch(err){
                    dbmutation= Object.assign(dbmutation, {hasError:true, 
                        errorMessage: err.message,
                    });
                }
                
                dbmutation= await this.database.insertOrUpdate(databaseName, "_mutations", {dbmutation});

                let testone=await this.database.search(databaseName,"_mutations",{name:mutationName},{});
                console.log('testone', testone);
                return dbmutation;
            }
        }
        return {
            name: mutationName,
            hasError:true,
            message: "skipped"
        };
    },
    applyOne: async function(databaseName,continueOnError=false){
        let result=[];
        for(let mutation of this.mutations){
            let dbmutation = await this.applySingle(databaseName,mutation.name);
            result.push(dbmutation);
        }
        result = {
            appliedCount: result.filter((mut)=>{return(!mut.hasError)}).length,
            hasError: result.some((mut)=>{return mut.hasError}),
            data: result
        }
        return result;
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
