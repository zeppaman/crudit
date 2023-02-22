import { expect } from 'chai';
import dotenv from  'dotenv';
import {crudy,database, dbFactory}  from "../../src/index.mjs";

dotenv.config();
crudy.config(async function(config){
    config.settings.database.name='test';
    config.settings.database.roles=['owner']; 
    config.settings.database.url=process.env.CRUDIT_DBURL;
});

await dbFactory.init({
    url: process.env.CRUDIT_DBURL
});
// collection+db scoped
crudy.configEntity('validateBoth', {
    db: 'testValidationBothDB',
    collection: 'testCollectionBoth',
    validation: {
        age: 'min:18|required',
        email: 'email|required'
    }
});

// collection scoped 
crudy.configEntity('validateCollection', {
    collection: 'testValidationOnlyCollection',
    validation: {
        'age': 'required|min:18',
        'email': 'required|email'
    }
});

//database scoped
crudy.configEntity('validateDb', {
    db: 'testValidationOnlyDb',
    validation: {
        age: 'min:18|required',
        email: 'email|required'
    }
});


describe('validate_db', async function () {
    it('validate db only', async function () {
        let response= await database.insert('testValidationOnlyDb', 'collection', {age: 19, email: 'email@fake.com'});
        expect(response._id).to.not.be.undefined
        expect(async ()=>{
            await database.insert('testValidationOnlyDb', 'collection', {age: 17, email: 'not_email'})
        }).throws;

        let responseUnrelatedDb = await database.insert('otherDb', 'collection', {age: 17, email: 'not_email'});
        expect(response._id).to.not.be.undefined;
    });
});

describe('validate_collection', async function () {
    it('validate collection only', async function () {        
        let response= await database.insert('database', 'testValidationOnlyCollection', {age: 19, email: 'email@fake.com'});
        expect(response._id).to.not.be.undefined;
        expect(async ()=>{
            await database.insert('database', 'testValidationOnlyCollection', {age: 17, email: 'not_email'})
        }).throws;

        let responseUnrelatedDb = await database.insert('database', 'otherCollection', {age: 17, email: 'not_email'});
        expect(response._id).to.not.be.undefined;
    });
});

describe('validate_both', async function () {
    it('validate both collection and db', async function () {        
        let response= await database.insert('testValidationBothDB', 'testCollectionBoth', {age: 19, email: 'email@fake.com'});
        expect(response._id).to.not.be.undefined;
        expect(async ()=>{
            await database.insert('testValidationBothDB', 'testCollectionBoth', {age: 17, email: 'not_email'})
        }).throws;

        //unrelated db and collection
        let responseUnrelatedDb = await database.insert('otherDb', 'testCollectionBoth', {age: 17, email: 'not_email'});
        expect(response._id).to.not.be.undefined;
        let responseUnrelatedCollection = await database.insert('testValidationBothDB', 'otherCollection', {age: 17, email: 'not_email'});
        expect(response._id).to.not.be.undefined;
    });
});