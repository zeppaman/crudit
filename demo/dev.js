import {database, events, crudy}  from "../src/index.mjs";
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
    config.settings.roles=['owner']; //SHOULD BE inside database!
    config.settings.database.url=process.env.CRUDIT_DBURL;
  });

  crudy.hook('audit',events.beforeSave,async function(database,data, user, config){
    let username=user? user.name :'anonymous';
    console.log("hook triggered");
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
    user.active=false;
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


crudy.mutations().add('mutation1', async (database)=>{
    await database.init(process.env.DBURL, {});
    return(await database.insert('log', 'test1', {success: true}))
});

crudy.mutations().add('mutation2', async (database)=>{
    await database.init(process.env.DBURL, {});
    return(await database.insert('log', 'test2', {success: true}))
});

crudy.mutations().add('mutation3', async (database)=>{
    await database.init(process.env.DBURL, {});
    return(await database.insert('log', 'test3', {success: true}))
});


let responses = [];

//apply first mutation
responses.push(await crudy.mutations().appyOne('mutation1'));

//remove second mutation
responses.push(await crudy.mutations().remove('mutation2'));

//apply third mutation because first is already applied and second is removed
responses.push(await crudy.mutations().applyAll());


//should not apply any of them, they are removed, already applied or inexistent
responses.push(await crudy.mutations().appyOne('mutation2'));
responses.push(await crudy.mutations().applyAll());
responses.push(await crudy.mutations().appyOne('mutation3'));
responses.push(await crudy.mutations().appyOne('mutationInexistent'));

console.log(responses);


app.all('/api/handler', async (request, response) => {
    return await crudy.run(request,response);    
})


app.listen(port, () => {
  console.log(`Crudy Demo listening on port ${port}`)
})