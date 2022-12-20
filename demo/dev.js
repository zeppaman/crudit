import {database, events, crudy,mutations}  from "../src/index.mjs";
import express from  'express';
import dotenv from  'dotenv';
import crypto from  'crypto';


dotenv.config();

const app = express()
const port = 3000

console.log("started");

app.use(express.json());



// configure settings
crudy.config(function(config){
    config.settings.database.name='test';
    config.settings.database.roles=['owner']; //SHOULD BE inside database!
    config.settings.database.url=process.env.CRUDIT_DBURL;
  });

  crudy.hook('audit',events.beforeSave,null,null,async function(database,db,collection,data,user,config){
    console.log({
         data:data, user:user,db:db, collection:collection, config:config
    });
    let username=user? user.name :'anonymous';
    //console.log("hook triggered");
    data.updatedOn=new Date();
    data.updatedBy=username;

    if(!data._id || data._id=="")
    {
        data.insertedOn=new Date();
        data.insertedBy=username;
    }
  });

  
  //Custom method for login
  crudy.request("login", "post",false,async function(request,loggedUser, settings){
    console.log(request.body);
    let hash= crypto.createHash('md5').update(request.body.password).digest('hex');
    let user= await database.search("global","users",{username:request.body.username, password:hash});
    if(!user || user.length!=1) throw new Error("Wrong username and password");
    user=user[0];
    let newToken= crypto.randomBytes(64).toString('hex');
    let token={userId: user._id,token: newToken, expireAt:0};
    token=await database.insert("global","tokens",token);  
    delete user.password;
    delete user.db;
    user.token=newToken;
    return user;
  });

//Custom method for register
crudy.request("register", "post",false,async function(request,loggedUser, settings){

    let user=request.body;
    
    delete user.token;
    user.password= crypto.createHash('md5').update(user.password).digest('hex');
    user.db=("c_"+user.username??'sdff').normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9 ]/g, '')
            .replace(/\s+/g, '-');
    console.log(user.db);
    user.active=true;
    user= await database.insert("global","users",user); 
    
    return user;
});

crudy.authorize(async function(request){
let token=request.headers.authorization ?? request.query.authorization;

let users=await database.aggregate('global','users',[{
    $lookup:
    {
        from: 'tokens',
        localField: '_id',
        foreignField: 'userId',
        as: 'token',
    },
    
}, {
    "$match": {
        "token.token": token
    }
    }]);
if(users==null || users.length!=1) return  null;
let user=users[0];
return {
    name:user.name,
    roles:['owner'],
    database:user.db
};

});


crudy.mutation('mutation1',false, async (databaseName,prevExec)=>{
    return(await database.insert(databaseName, 'testlist', {hasError: false}))
});

crudy.mutation('mutation2', "database1", async (databaseName,prevExec)=>{
    return(await database.insert(databaseName, 'testlist', {hasError: false}))
});

crudy.mutation('mutation3', '(.*)', async (databaseName,prevExec)=>{
    return(await database.insert(databaseName, 'testlist', {hasError: false}))
});

crudy.request("mutation", "post",false,async function(request,loggedUser, settings){
    if(!request.query.token==process.env.APP_MUTATION_PWD){
        throw new Error("Unauthorized");
    }
    console.log("MUTATION - AUTHORIZED");
    if(request.query.operation=="applyone"){
        console.log("MUTATION - applyone");
        return await mutations.applyOne(request.query.database);
    }else if (request.query.operation=="applyall"){
        return await mutations.applyAll();
    }else if (request.query.operation=="applysingle"){
        return await mutations.applySingle(request.query.database,request.query.mutation);
    }
    else
    {
        throw new Error("Unauthorized");
    }
});



app.all('/api/handler', async (request, response) => {
    console.debug("GOT "+request.method+" - ", request.query);
    let result= await crudy.run(request,response); 
    return result;
})


app.listen(port, () => {
  console.log(`Crudy Demo listening on port ${port}`)
})