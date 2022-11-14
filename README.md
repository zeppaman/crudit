# crudy
Serverless and low code plaform


# Start in your local

```
docker-compose up
# open another shell
npm install
npm run dev
```

# Features
The project is work in progress but you can:

- [x] Extensible configuration
- [x] Custom endpoint
- [x] Authetication and federation with external systems
- [x] Perform any crud operation
- [x] Aggregation and projection support
- [ ] Hook system
- [ ] Computed fields and data augmentation
- [ ] Data validation
- [ ] Audit

## Configure settings

### 1. Change the whole  settings

TBD

### 2. Set configuration for a single entity

TBD

### 3. Default mechanism

TBD

## Implement authetication

TBD

## Endpoints

### Implement custom endpoint
### Change Status

# Installation

## On Express
See dev.js that's based on express.
```js
import database  from "./database.js";
import crudy  from "./crudy.js";
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
const app = express()
const port = 3000


app.use(express.json());

// configure settings
crudy.config(function(config){
    config.settings.database='test';
    config.settings.roles=['owner'];
  });


app.all('/api/handler', async (request, response) => {
    return await crudy.run(request,response);      
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
```

## On Vercel Serverless Function

TBD


# Demo

The dev.js show the basic featurs by implementing a multitenant scenario. The steps:
1. adding a registration method that will create a new user. This is something like:
```js
crudy.request("register", "post",false,async function(request,loggedUser, settings){
    let user=request.body;
    user.password= crypto.createHash('md5').update(user.password).digest('hex');
    //Create a unique and valid db name escaping the username
    user.db=("c_"+user.username??'sdff').normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9 ]/g, '')
            .replace(/\s+/g, '-');
    //save it
    user= await database.insert("global","users",user); 
    return user;
});

```
The url can be called by
```
curl --location --request POST 'http://localhost:3000/api/handler?action=register' \
--header 'Content-Type: application/json' \
--data-raw '{
    "password":"mypass",
    "username":"testuser",
    "name":"My Name",
}'
```
2. implement a login endpoint. It validates password and in case create a token into a temporary colection.
```js
crudy.request("login", "post",false,async function(request,loggedUser, settings){
    database.init(process.env.DBURL, {});
    let hash= crypto.createHash('md5').update(request.body.password).digest('hex');
    let user= await database.search("global","users",{username:request.body.username, password:hash});
    if(!user || user.length!=1) throw new Error("Wrong username and password");
    user=user[0];
    let newToken= crypto.randomBytes(64).toString('hex');
    let token={userId: user._id,token: newToken, expireAt:0};
    token=await database.insert("global","tokens",token);  
    return {token: newToken};
  });

```
The login can be done with the follwing invokation:
```
curl --location --request POST 'http://localhost:3000/api/handler?action=login' \
--header 'Content-Type: application/json' \
--data-raw '{
    "password":"mypass",
    "username":"testuser"
}'
```
The result contains the token to be used during login
3. Implement the authorize function. It can be something like the following example:
```js
crudy.authorize(async function(request){
database.init(process.env.DBURL, {});
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

```
The snippet above mix token and user data in a inner jon for getting user that match a token. The database name is a field of the user and it is used.

4. Perform any CRUD operation using REST convention. For example, you can add a row by:
```js
curl --location --request POST 'http://localhost:3000/api/handler?action=datahub&collection=prova' \
--header 'Authorization: <mytoken>' \
--header 'Content-Type: application/json' \
--data-raw '{
    "testdata1":"value1",
    "testdata2":"value2"
}'
```