// const database =require("./database");
// const {IncomingMessage, ServerResponse} =require('http')
// const defaultConfig =require( './default.js')
// const {  ObjectID} = require('mongodb');
import {ObjectID} from 'mongodb';
import defaultConfig from './default.js';
import  {IncomingMessage, ServerResponse} from 'http';
import database from './database.js';



let defaultHeaders={"Content-Type": "application/json"};


const crudy= {
    database: database,
    currentConfig:defaultConfig,
    request: async function (name, method,authenticate,func){
        let request={
            name: name,
            method:method,
            authenticate:authenticate,
            function: func
        };
        this.currentConfig.requests.push(request);
    },
    config: async function (func){
        func(this.currentConfig);
    },
    authorize: async function(func){
        this.authorizeFunc=func;
    },
    mapEntity:  async function (entity, config){
        this.currentConfig[entity]=config;
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
    loadConfig: function(){
        
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
       
        const start = Date.now()
       

        try
        {
            let action= request.query.action ?? 'datahub';
           

            
            let requestsFound= this.currentConfig.requests.filter((x)=>x.name==action);
            
            if(!requestsFound || requestsFound.length!=1){
                return this.error(response,`request ${action} not found ${requestsFound.length}`) ;
            }

            let requestToExec=requestsFound[0];
            let user=requestToExec.authenticate ? await this.performAuthetication(request):this.currentConfig.settings.anonymousUser;// default fallback to an anonymous user
            this.loadConfig();
            
            let payload={hasError:false, echo:{duration:0}, error:"", data:{},status:200};
            try
            {
                //console.log("calling", request,user,this.currentConfig);
                let result=await requestToExec.function({query:request.query,
                    headers: request.headers,
                    body: request.body,
                    method:request.method,
                    }, user, this.currentConfig);

                payload.data=result;
                
            }
            catch (err) {
                payload.hasError=true;
                payload.error=err.message;
                payload.stack=err.stack;
                if(err.name && err.name.length==3 ){
                    payload.status=Number(err.name);
                }

            }

           
            const stop = Date.now();
            payload.echo.duration=stop-start;
             return  this.createResponse(response, {
                        status:payload.status,
                            headers:{
                                nope:'nppe'
                            },
                            body:payload
                        });

        }
        catch( err)
        {
            console.log(err);
            return   this.error(response,err.message);
        }
    }
};
/*
- load from folder hooks
*/
export default crudy;