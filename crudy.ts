import database  from "./database";
import {IncomingMessage, ServerResponse} from 'http'
import defaultConfig from './default.js'
const {  ObjectID} = require('mongodb');


let defaultHeaders={"Content-Type": "application/json"};


const crudy= {
    database: database,
    currentConfig:defaultConfig,
    request: async function (name, method,func){
        let request={
            name: name,
            method:method,
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
    createResponse:  function(response: ServerResponse, data): ServerResponse{
        let headers=Object.assign(defaultHeaders,data.headers);
      
        response.writeHead(data.status,headers);
        var json = JSON.stringify(data.body);
        return response.end(json);
        
    },
    error: function(response: ServerResponse, message): ServerResponse{
        return   this.createResponse(response, {
            status:500,
            body:{
                message: message
            }
        });
    },
    ok:  function(response: ServerResponse, payload): ServerResponse{
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
    

    run: async  function(request,response: ServerResponse){
       
        const start = Date.now()
       

        try
        {
            let action= request.query.action ?? 'datahub';
            let user=await this.performAuthetication(request);// default fallback to an anonymous user
            this.loadConfig();

            
            let requestsFound= this.currentConfig.requests.filter((x)=>x.name==action);
            if(!requestsFound || requestsFound.length!=1){
                return this.error(response,`request ${action} not found`) ;
            }
            let requestToExec=requestsFound[0];
            
            let payload={hasError:false, echo:{duration:0}, error:"", data:{},status:200};
            try
            {
                
                payload.data=await requestToExec.function({query:request.query,
                headers: request.headers,
                body: request.body,
                method:request.method,
                }, user, this.currentConfig);
                
            }
            catch (err) {
                payload.hasError=true;
                payload.error=err.message;
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