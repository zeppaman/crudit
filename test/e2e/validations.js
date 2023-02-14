import chai, { expect } from 'chai';
import chaiJsonPattern from 'chai-json-pattern';
import {client,instance} from '../client.js';

const baseUrl="http://localhost:3000/api/handler?prova=prova";
const date=new Date();
const dbtest="validations"+date.getFullYear().toString()+date.getMonth().toString()+date.getDay().toString()+date.getHours().toString()+date.getMinutes().toString()+date.getSeconds().toString();


chai.use(chaiJsonPattern.default);

async function truncate(collection){
    let list=await client.search(collection,{},{});
    list.data.forEach(element => {
        client.remove(element);
    });
}

const username=dbtest;
const password=dbtest;


let token="null";

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

console.log(token)

describe('validation', async function () {
    it('validate db only', async function () {
        //apply mutations on the empty database  and check that data is added
        //apply mutations again. No changes.
        let response=await client.apiCall(baseUrl,"GET",null,{action:'validation', operation:"validate_db", database:"testValidationDb"});
        //console.log(response.data);
        let result=response.data.data;
        //expect(result.appliedCount).to.be.equal(2); //exact number of muatation that matches the database
        expect(result.valid._id).to.not.be.null;
        expect(result.not_pertinent._id).to.not.be.null;
        expect(result.invalid.errors).to.not.be.null;
    });

    it('validate collection only', async function () {        
        //apply mutations again. No changes expected.
        let response=await client.apiCall(baseUrl,"GET",null,{action:'mutation', operation:"validate_collection", collection:"testCollection"});
        //console.log(response.data);
        let result=response.data.data;
        //expect(result.appliedCount).to.be.equal(0);
        expect(result.valid._id).to.not.be.null;
        expect(result.not_pertinent._id).to.not.be.null;
        expect(result.invalid.errors).to.not.be.null;
    });

    it('validate both collection and db', async function () {        
        //apply mutations again. No changes expected.
        let response=await client.apiCall(baseUrl,"GET",null,{action:'mutation', operation:"validate_both", database:"testValidationBoth", collection: "Test"});
        //console.log(response.data);
        let result=response.data.data;
        //expect(result.appliedCount).to.be.equal(0);
        expect(result.valid._id).to.not.be.null;
        expect(result.not_pertinent_db._id).to.not.be.null;
        expect(result.not_pertinent_collection._id).to.not.be.null;
        expect(result.not_pertinent_both._id).to.not.be.null;
        expect(result.invalid.errors).to.not.be.null;
    });
    

});