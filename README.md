# crudy
Serverless and low code plaform

# Table of Contents
- [crudy](#crudy)
- [Start in your local](#start-in-your-local)
- [Features](#features)
  * [Configure settings](#configure-settings)
  * [Implement authetication](#implement-authetication)
  * [Endpoints](#endpoints)
  * [Data Validation](#data-validation)
  * [Hook Systems](#hook-systems)
- [Installation](#installation)
  * [On Express](#on-express)
  * [On Vercel Serverless Function](#on-vercel-serverless-function)
- [Demo](#demo)

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
- [x] Hook system
- [ ] Computed fields and data augmentation
- [ ] Data validation
- [ ] Audit

## Configure settings

### 1. Change the whole  settings

The `config` method give you the whole computed configuration and let you read and change it programmatically. See the example:
```js
crudy.config(function(config){
    config.settings.database='test';
    config.settings.roles=['owner'];
  });
``` 

### 2. Set configuration for a single entity

You can specify settings valid for a single entity. For example you can change the required roles for editing one collection. You can do this by invoking the `configEntity` method.
```js
crudy.configEntity('myEntityName',function(config){
    config.roles=['owner'];
  });
``` 
Settings defined at the entity level takes priority over the global one (entity settings overrides property by property the global settings.) 

### 3. Default and override query

The Crudit system implements an override mechanism that applies to queries (in filter, aggregate and projection). You can set a base configuration that are applied by design to all queries. The user can override this settings. Image the `deleted` filter if you implement soft deletion and you want to let the user see their deleted record in some "recicle bin" folder. Alternatively you can  set a configuration that is immutable. For example you can implement a filter by `userId` attribute of the elements to show to the user only their rows.

Configs takes priority as follows:

| Default value | Default value | Overridden by | Overridden by |
| ------------- | ------------- | ------------- | ------------- |
| query         | defaultQuery  | query         | overrideQuery  |
| projection | N\A | user value  | overrideProjection |
| aggregate | defaultAggregate | user value  | overrideAggregation  |

The `override*` values are set in the settings element of configuration but can overriden at entity level.

## Implement authetication

Crudit is designed for support any authentication mechanism or implement it's own. The user management system is supposed to be external to the system. By the way, in the demo there is  a sample implementation of a fully working user managerment (user registration, user login and authentication). Any Oauth2 IAM systems can be easily integrated by Crudit just by resolving the user data using common nodejs library.

The method to implement is the following:

```js
crudy.authorize(async function(request){
    // implement your business logic here
    // return the user object with roles
  return {
      name:user.name,
      roles:['owner'],
      database:user.db
  };
});
```

##  Implement custom endpoint
You can implement any custom endpoint by register some new `request` to the system. Any endpoint is a function that takes in input a simplified version of the http request and returns a payload. Endpoints are designed to work only with json requests.
All results are sent as status `200 OK` ecept if you have an exeption. In case of exceptions, the default status is `500 Internal Server Error`, but you can change it by filling the name field of the `Error` with the status code.

You can use the next code to add an endpoint:
```js
//crudy.request("action name", "http method", requires authentication, function to run);

crudy.request("myActionName", "post",false,async function(request,loggedUser, settings){
  let payload={};
  //do stuff here
  return payload;
});
```
The url will be `http://yourapp.xx/yourpath?action=myActionName`.
If the flag for authentication is set to true, the execution returns `401` if the user is not logged in. 

## Data Validation
NOT IMPLEMENTED YET. You can take the issue [Implement data validation]
(https://github.com/zeppaman/crudy/issues/5) if you find it usefyul.

## Hook Systems
The hook system allow to alter data or queries writing custom code snippet. 

To add an hook, just use the `hook` method passing the name of the event to be linstened and the function that you want to run. Based on the event type you can hava an item or a list of items as argument.

```js
crudy.hook('MyHookInvokation','eventName', function);
```
The list of the eventNames can be found using `event` constant from `import {events} from 'crudy/database'`.


See the example below that adds audit to the entity saved:

```js
 crudy.hook('audit',events.afterSave,async function(database,data, user, config){
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
```

The list of event that you can

# Installation
Crudit works at low level so it is compatible with most system. In the next examples we provide the condifuration for bare express installation and vercel serverless function.

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
  console.log(`Crudy demo listening on port ${port}`)
})
```

## On Vercel Serverless Function

1. run `npm install --save crudit`
2. create a file called `handler.mjs` in api folder. The path in our local will be `api/handlre.mjs` and the url on vercell will be `http://yourpath/api/handler`
3. integrate crudit like in the following example:
```js
import {crudy,database} from 'crudit' ;
import {IncomingMessage, ServerResponse} from 'http'
import crypto from 'crypto'


 crudy.config(function(config){
  config.settings.database='test';
  config.settings.roles=['owner'];
});

export default async function handler(request, response) {  
  return await crudy.run(request,response);
}

```

# Unit test
The project incorporates end to end unit test. To run them:
1. activate the demo

```
docker-compose up
# another shell
npm run dev
```
2. run the test
```
npm run test
```
3. se the output

**note**: the test doesn't delete the data that creates on db but uses, run only on volatile environments.

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
