import axios from 'axios'

const url="http://localhost:3000/api/handler";

const instance = axios.create();

// instance.interceptors.request.use(request => {
//   console.log('Starting Request', JSON.stringify(request, null, 2))
//   return request
// })


const client={
defaultHeaders:{},
simplifyResponse:   function(response){
    if(response.status==200){
      return response.data;
    }
    
    return {
      hasError: false,
      errorMessage: "error" +response.status
    };
  },
  insertOrUpdate: async function(entity, data)
  {
    let id=data._id && data._id!='';
    delete data._meta;
    if(id)
    {
      return this.simplifyResponse( await this.apiCall(url,'PUT',data,{collection: entity}));
    }
    else 
    {
      return  this.simplifyResponse(  await this.apiCall(url,'POST',data,{collection: entity}));
    }
  },
  patch:  async function (entity, data){
    delete data._meta;
    return  this.simplifyResponse(  await this.apiCall(url,'PATCH',data,{collection: entity}));

  },
  remove:  async function (entity, id){
    let data=await this.apiCall(url,'DELETE',null,{id: id,collection: entity});
    return  (data).status==200;

  },
  get:  async function (entity, eid){
    
    return  this.simplifyResponse(await this.apiCall(url,'GET',null,{
      collection: entity, 
      id:eid
    }));
  },
  search:  async function (entity, filter, projection){
    return  this.simplifyResponse(await this.apiCall(url,'GET',{},
     {collection: entity, 
      query: JSON.stringify(filter)??'{}',
      projection: JSON.stringify(projection)??'{}'
    }));
  },
  aggregate:  async function (entity, filter){
    return  this.simplifyResponse(await this.apiCall(url,'GET',null,
          {collection: entity, 
           query: {}, 
           aggregate:JSON.stringify(filter??'{}'),
           projection: {}
          }));
  },
  apiCall:  async function(url,method, body, query){

    let options = {
      url: url,
      method: method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
      data: body,
      params:query
    };

    if(method=='GET'){
      delete options.data;
    }

    try{
      const response = await instance(options);
      
      return response;
    }catch(error)
    {
      console.log(error);
      //TODO Error handling
      throw error;
    }
    
  }
};

export {client,instance};
export default client;