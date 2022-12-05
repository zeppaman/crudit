import chai, { expect } from 'chai';
import chaiJsonPattern from 'chai-json-pattern';
import {client,instance} from '../client.js';


chai.use(chaiJsonPattern.default);




const baseUrl="http://localhost:3000/api/handler?prova=prova";

const date=new Date();
const entity="test_"+date.getFullYear().toString()+date.getMonth().toString()+date.getDay().toString()+date.getHours().toString()+date.getMinutes().toString()+date.getSeconds().toString();
const username=entity;
const password=entity;


let token="null";

 


    describe('login', async function () {
        it('add temporary user', async function () {
            let response=await client.apiCall(baseUrl,"post",{
                username: username,
                password:password,
                name: entity
            },{action:'register'});
            expect(response.status).to.not.be.null;
            expect(response.status).to.be.equal(200);

        });
        it('get user token', async function () {
            let response=await client.apiCall(baseUrl,"post",{
                username: username,
                password:password
            },{action:'login'});
            console.log(response.data);
            let token=response.data.data.token;
            instance.defaults.headers.common['Authorization']=token;
        });
       

    });
    
    describe('CRUD', async function () {
      
      let saved={};
      it('insert', async function () {
            let toSave={field:"myfield", date:new Date(), int:23,number:23.4};
            let result=await client.insertOrUpdate(entity, toSave);
            saved=result.data;
            expect(saved._id).to.not.be.null;
      });

      it('update', async function () {
        let toSave=saved;
        toSave.field="myfield2";
        let result=await client.insertOrUpdate(entity, toSave);
        saved=result.data;
        expect(saved._id).to.not.be.null;
        expect(saved.field).to.be.equal(toSave.field);
      });

      it('patch', async function () {
        let toSave=saved;
        toSave.field="myfield2";
        let result=await client.patch(entity, {_id: saved._id, field: "changed"});
        saved=result.data;
        expect(saved._id).to.not.be.null;
        expect(saved.field).to.be.equal("changed");
      });

      it('get', async function () {
        let result=await client.get(entity,saved._id);
        saved=result.data;
        expect(saved._id).to.not.be.null;
        expect(saved._id).to.be.equal(saved._id);
        expect(saved.field).to.be.equal("changed");
      });

      it('find', async function () {
       
        for(let i=0; i<10; i++){
          await client.insertOrUpdate(entity, {field:"searchme",
          idx:i});
        }

        let result=await client.search(entity,{idx: { "$gte":4}},{"_id":0});
        let list=result.data;
        expect(list).to.not.be.null;
        expect(list.length).to.be.equal(6);
        expect(list[0]).not.has.property("_id");
      });

      it('aggregate', async function () {
       
        

        for(let i=0; i<10; i++){
          var date = new Date();
          date.setDate(date.getDate() + i%2);
          await client.insertOrUpdate(entity, {"type":"aggregate", 
          "item" : "xyz"+i, 
          "price" : 5*i, 
          "quantity" : 10+i, 
          "date" : date});
        }

        
       

        let result=await client.aggregate(entity,
          [
            { $match:{
                type:"aggregate"
            }},
            {
              $project: {
                 date: {
                    $dateFromString: {
                       dateString: '$date',
                    },
                 
                 },
                 type:1,
                 price:1,
                 quantity:1,
              }
           },
            {
              $group:
                {
                  _id: { day: { $dayOfYear: "$date"}, year: { $year: "$date" } },
                  totalAmount: { $sum: { $multiply: [ "$price", "$quantity" ] } },
                  count: { $sum: 1 }
                }
            },
            {
              $sort:{
                totalAmount:1
              }
            }
          ]);
        let list=result.data;
        expect(list).to.not.be.null;
        list.forEach(x=>{
          expect(x.count).to.be.equal(5);
          expect(x.totalAmount).to.be.oneOf([1600,2075]);
        });
      });

    });
  