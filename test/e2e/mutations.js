import chai, { expect } from 'chai';
import chaiJsonPattern from 'chai-json-pattern';
import {client,instance} from '../client.js';
import moment from 'moment';

const baseUrl="http://localhost:3000/api/handler?prova=prova";
const date=new Date();
const dbtest="tmpdata"+date.getFullYear().toString()+date.getMonth().toString()+date.getDay().toString()+date.getHours().toString()+date.getMinutes().toString()+date.getSeconds().toString();


chai.use(chaiJsonPattern.default);


async function truncate(collection){
    console.log("TRUNCATING", collection);
    let list=await client.search(collection,{},{});
    list.data.forEach(element => {
        client.remove(element);
    });
}

const username=dbtest;
const password=dbtest;


let token="null";

console.log(dbtest);

 


    describe('login', async function () {
        it('add temporary user', async function () {
            let response=await client.apiCall(baseUrl,"post",{
                username: username,
                password:password,
                name: username
            },{action:'register'});
            //console.log(response.data);
            expect(response.status).to.not.be.null;
            expect(response.status).to.be.equal(200);

        });
        it('get user token', async function () {
            let response=await client.apiCall(baseUrl,"post",{
                username: username,
                password:password
            },{action:'login'});
            //console.log(response.data);
            let token=response.data.data.token;
            instance.defaults.headers.common['Authorization']=token;
        });
       

    });

describe('mutations', async function () {
    it('clean', async function () {
        //get all items in mutation and collection and clean up
        truncate("_mutations");
        truncate("testlist");
       // let response=await client.apiCall(baseUrl,"get",null,{action:'mutation', operation:"user", });
    })
    it('applyone - first run', async function () {
        //apply mutations on the empty database  and check that data is added
        //apply mutations again. No changes.
        let response=await client.apiCall(baseUrl,"GET",null,{action:'mutation', operation:"applyone", database:"c_"+username});
        //console.log(response.data);
        let result=response.data.data;
        console.log(response.data);
        expect(result.appliedCount).to.be.equal(2); //exact number of muatation that matches the database
        expect(response.hasError).to.be.true();

    });

    it('applyone - second run', async function () {        
        //apply mutations again. No changes expected.
        let response=await client.apiCall(baseUrl,"GET",null,{action:'mutation', operation:"applyone", database:"c_"+username});
        //console.log(response.data);
        let result=response.data.data;
        expect(result.appliedCount).to.be.equal(0);
        expect(response.hasError).to.be.true();

    });
    

});