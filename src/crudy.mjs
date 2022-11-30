import defaultConfig from  './default.mjs';



let defaultHeaders={"Content-Type": "application/json"};




const crudy= {
    currentConfig:defaultConfig,
    loaded: false,
    hook:  function (name, eventName,func){
        let hook={
            name: name,
            eventName:eventName,
            function: func
        };

        this.currentConfig.hooks.push(hook);
    },
    request:  function (name, method,authenticate,func, init=null){
        let request={
            name: name,
            method:method,
            authenticate:authenticate,
            function: func,
            init:init
        };
        this.currentConfig.requests.push(request);
    },
    mutations: function() {
        let _this = this;
        return({
            add: function(name, mutationFn){
                let mutation = {
                    name: name,
                    function: mutationFn,
                    executed: false
                }
                if(_this.currentConfig.mutations.find((m)=>{return m.name == name})){
                    this.remove(name);
                }
                _this.currentConfig.mutations.push(mutation);
            },
            remove: function(name){
                _this.currentConfig.mutations =  _this.currentConfig.mutations.filter((m)=>{return m.name != name});
                return({hasError: false})
            },
            appyOne: async function(name){
                let mutation = _this.currentConfig.mutations.find((m)=>{return m.name == name && !m.executed});
                if(mutation){
                    try {
                        console.log('_this', _this)
                        let response = await mutation.function(_this.currentConfig.settings.database);
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
                try {
                    let promises = [];
                    _this.currentConfig.mutations.filter((m)=>{return !m.executed}).forEach(mutation => {
                        promises.push(mutation); 
                    });

                    if(promises.length){
                        let responses = await Promise.all(promises.map((p)=>{return p.function(_this.currentConfig.settings.database)}));
                        promises.map((p)=>{p.executed = true});
                        return({ hasError: false, data: responses });
                    }else{
                        return({ hasError: true, error: "No Mutation was registered and not executed" })
                    }
                } catch (error) {
                    
                }
            }
        });
    },
    config:  function (func){
        func(this.currentConfig);
    },
    authorize: async function(func){
        this.authorizeFunc=func;
    },
    configEntity:   function (entity, config){
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

          
        const start = Date.now()
       

        try
        {
            if(!this.loaded) {
                await this.load();
            }     
          

            let action= request.query.action ?? 'datahub';
           
            let requestsFound= this.currentConfig.requests.filter((x)=>x.name==action);
            
            if(!requestsFound || requestsFound.length!=1){
                return this.error(response,`request ${action} not found ${requestsFound.length}`) ;
            }

            let requestToExec=requestsFound[0];
            let user=requestToExec.authenticate ? await this.performAuthetication(request):this.currentConfig.settings.anonymousUser;// default fallback to an anonymous user
            
            
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

//module.exports=crudy;
export default crudy;