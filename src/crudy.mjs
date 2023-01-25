import defaultConfig from  './default.mjs';
import {dbFactory, events} from './database.mjs';
import Validator from 'validatorjs';


let defaultHeaders={"Content-Type": "application/json"};




const crudy= {
    currentConfig:defaultConfig,
    loaded: false,
    hook:  function (name, eventName,database,collection,func){
        let hook={
            name: name,
            eventName:eventName,
            database:database,
            collection:collection,
            function: func
        };

        this.currentConfig.hooks.push(hook);
    },
    request:  function (name, method,authenticate,func, init=()=>{}){
        let request={
            name: name,
            method:method,
            authenticate:authenticate,
            function: func,
            init:init
        };
        this.currentConfig.requests.push(request);
    },
    mutation(name, dbName, mutationFn){
        let mutation = {
            name: name,
            function: mutationFn,
            dbName: dbName
        }
        if(this.currentConfig.mutations.find((m)=>{return m.name == name})){
            this.remove(name);
        }

        //we need this mutations as if they where in the db+
        this.currentConfig.mutations.push(mutation);
    },
    config:  function (func){
        func(this.currentConfig);
    },
    authorize: async function(func){
        this.authorizeFunc=func;
    },
    configEntity:   function (entity, config){
        this.currentConfig[entity]=config;
        console.log(this.currentConfig);
        if(entity == 'validation'){
            this.hook('validation', events.beforeSave,null,null,(database,db,collection,data,user,config)=>{
                const validation = new Validator(data, config.validation);
                if(validation.fails()){
                    throw 'data validation fails'
                }
            })
        }
    },
    createResponse:  function(response, data){
        let headers=Object.assign(defaultHeaders,data.headers);
        response.writeHead(data.status,headers);
        var json = JSON.stringify(data.body);
        return response.end(json);
        
    },
    error: function(response, message){
        return   this.createResponse(response, {
            status:500,
            body:{
                message: message
            }
        });
    },
    ok:  function(response, payload){
        return  this.createResponse(response, {
            status:200,
            headers:{
                nope:'nppe'
            },
            body:payload
        });
    },
    load: async function(){
        for (const x of this.currentConfig.requests){
            if(x.init){
                await x.init(this.currentConfig);
            }
        }
        this.loaded=true;
    },
     performAuthetication: async function(request){
        let user=  {
            name:'Anonymous',
            roles:[]
        };

        if(this.authorizeFunc){
            user= await this.authorizeFunc(request)??user;
        }
        return user;       
    },
    
    run: async  function(request,response){
        let payload=await this.getResponse(request);
        return  await this.createResponse(response, {
            status:payload.status??200,
                headers:{
                    nope:'nppe'
                },
                body:payload
            });
    },
    getResponse: async  function(request){ 
        const start = Date.now()
        let payload={hasError:false, echo:{duration:0}, error:"", data:{},status:200};
        
        try
        {
            if(!this.loaded) {
                await this.load();
            }     
          

            let action= request.query.action ?? 'datahub';
           
            let requestsFound= this.currentConfig.requests.filter((x)=>x.name==action);
            
            if(!requestsFound || requestsFound.length!=1){
                throw new Error(`request ${action} not found ${requestsFound.length}`);
            }

            let requestToExec=requestsFound[0];
            let user=requestToExec.authenticate ? await this.performAuthetication(request):this.currentConfig.settings.anonymousUser;// default fallback to an anonymous user
            
            
            //console.log("calling", request,user,this.currentConfig);
            let result=await requestToExec.function({query:request.query,
                headers: request.headers,
                body: request.body,
                method:request.method,
                }, user, this.currentConfig);

            payload.data=result;          

            payload.hasError = result.hasError || false;
           
            const stop = Date.now();
            payload.echo.duration=stop-start;

        }
        catch( err)
        {
            console.log(err);
            payload.hasError=true;            
            payload.error=err.message;
            payload.stack=err.stack;
            if(err.name && err.name.length==3 ){
                payload.status=Number(err.name);
            }
            else
            {
                payload.status=500;
            }
        }

        if(this.currentConfig.settings.database.connectionMode=='recreate'){
            dbFactory.destroy();
        }

        return payload;
    }
};

//module.exports=crudy;
export default crudy;